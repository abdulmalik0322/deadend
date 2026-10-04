/**
 * DEADEND serverless-wrapper test.
 * Exercises api/index.js (the Vercel entry) exactly the way Vercel invokes
 * it — as a (req, res) handler over real HTTP — verifying the
 * serverless-http + connection-caching path, not just `node server.js`.
 *
 * Steps: lazy connect (no DB at import) -> ensureDb() caches the connection
 * -> register -> login -> list experiences, all through the wrapped handler.
 *
 * Run: node test/vercel-wrapper.test.js   (from server/)
 */
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-min-32-chars-long-ok';
process.env.JWT_EXPIRES_IN = '7d';
process.env.CLIENT_URL = 'http://localhost:5173';
// No SMTP_* on purpose.

const { MongoMemoryServer } = await import('mongodb-memory-server');
const mongoose = (await import('mongoose')).default;

const mongod = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongod.getUri();
console.log('test db ready');

// Import the Vercel wrapper — must NOT connect at import time.
const wrapper = await import('../../api/index.js');
const vercelHandler = wrapper.default;
assert.equal(typeof vercelHandler, 'function', 'default export must be a function');
assert.equal(typeof wrapper.ensureDb, 'function', 'ensureDb must be exported');
assert.equal(mongoose.connection.readyState, 0, 'wrapper must not connect at import time');

let passed = 0;
async function step(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL ${name}`);
    throw err;
  }
}

await step('ensureDb connects once and caches', async () => {
  // ensureDb is async so each call returns a fresh wrapper promise; the
  // cache is verified by the resolved value (same mongoose instance) and
  // by the fact that only one underlying connection is established.
  const [c1, c2] = await Promise.all([wrapper.ensureDb(), wrapper.ensureDb()]);
  assert.equal(c1, c2, 'both calls must resolve to the same cached connection');
  assert.equal(mongoose.connection.readyState, 1, 'mongoose should be connected');
  assert.equal(mongoose.connections.filter((c) => c.readyState === 1).length, 1, 'exactly one live connection');
});

// Serve the wrapped handler over real HTTP, like Vercel would.
const server = http.createServer((req, res) => {
  vercelHandler(req, res).catch((err) => {
    console.error('handler threw:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'handler_error' }));
    }
  });
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

async function api(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}

let token;
await step('register through wrapper (201)', async () => {
  const { status, json } = await api('POST', '/api/auth/register', {
    body: { name: 'Wrapper User', email: 'wrapper@test.dev', password: 'password123' },
  });
  assert.equal(status, 201, JSON.stringify(json));
  assert.ok(json.token);
  token = json.token;
});

await step('login through wrapper (200)', async () => {
  const { status, json } = await api('POST', '/api/auth/login', {
    body: { email: 'wrapper@test.dev', password: 'password123' },
  });
  assert.equal(status, 200, JSON.stringify(json));
  assert.ok(json.token);
});

await step('list experiences through wrapper (200)', async () => {
  const { status, json } = await api('GET', '/api/experiences', { token });
  assert.equal(status, 200, JSON.stringify(json));
  assert.ok(Array.isArray(json.items ?? json), 'expected an items array');
});

await step('me through wrapper (200)', async () => {
  const { status, json } = await api('GET', '/api/auth/me', { token });
  assert.equal(status, 200, JSON.stringify(json));
  assert.equal(json.email, 'wrapper@test.dev');
});

server.close();
await mongoose.disconnect();
await mongod.stop();
console.log(`\nvercel-wrapper: ${passed} steps passed`);

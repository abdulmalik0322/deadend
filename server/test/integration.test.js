/**
 * DEADEND production integration test.
 * Boots the Express app against an in-memory MongoDB and walks the full
 * user journey, asserting HTTP status codes at every step.
 *
 * Run: npm test   (from server/)
 * Requires: mongodb-memory-server (downloads a mongod binary on first run).
 */
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
process.env.JWT_EXPIRES_IN = '7d';
process.env.SETUP_KEY = 'test-setup-key';
process.env.CLIENT_URL = 'http://localhost:5173';
// No SMTP_* vars on purpose: forgot-password must answer 503.

const { MongoMemoryServer } = await import('mongodb-memory-server');
const mongoose = (await import('mongoose')).default;
const request = (await import('supertest')).default;

const mongod = await MongoMemoryServer.create();
await mongoose.connect(mongod.getUri());
console.log('test db ready');

const app = (await import('../app.js')).default;

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

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const SETUP_HEADERS = { 'x-setup-key': 'test-setup-key' };

let userToken, adminToken, adminId, expId, expSlug, commentId, decisionId, milestoneId;

console.log('— auth —');
await step('register user (201)', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email: 'user@test.dev', password: 'password123' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.ok(res.body.token);
  assert.equal(res.body.user.email, 'user@test.dev');
  userToken = res.body.token;
});

await step('register duplicate email (409)', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Dupe', email: 'user@test.dev', password: 'password123' });
  assert.equal(res.status, 409);
});

await step('register admin + promote via setup (201/200)', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Admin User', email: 'admin@test.dev', password: 'password123' });
  assert.equal(res.status, 201);
  adminToken = res.body.token;
  adminId = res.body.user.id;
  const p = await request(app).post('/api/setup/promote').set(SETUP_HEADERS).send({ email: 'admin@test.dev' });
  assert.equal(p.status, 200, JSON.stringify(p.body));
  // Re-login: the JWT role is baked at sign time, so the pre-promote token is stale.
  const relogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.dev', password: 'password123' });
  assert.equal(relogin.status, 200, JSON.stringify(relogin.body));
  assert.equal(relogin.body.user.role, 'admin');
  adminToken = relogin.body.token;
});

await step('setup seed is idempotent (skipped, users exist)', async () => {
  const res = await request(app).post('/api/setup/seed').set(SETUP_HEADERS);
  assert.equal(res.status, 200);
  assert.equal(res.body.skipped, true);
});

await step('setup with wrong key (403)', async () => {
  const res = await request(app).post('/api/setup/promote').send({ email: 'x@y.z' });
  assert.equal(res.status, 403);
});

await step('setup disabled when SETUP_KEY unset (404)', async () => {
  const saved = process.env.SETUP_KEY;
  delete process.env.SETUP_KEY;
  try {
    const res = await request(app).post('/api/setup/promote').set('x-setup-key', saved).send({ email: 'x@y.z' });
    assert.equal(res.status, 404);
  } finally {
    process.env.SETUP_KEY = saved;
  }
});

await step('login wrong password (401)', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'user@test.dev', password: 'wrongpass1' });
  assert.equal(res.status, 401);
});

await step('login ok (200)', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'user@test.dev', password: 'password123' });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
});

await step('me (200)', async () => {
  const res = await request(app).get('/api/auth/me').set(auth(userToken));
  assert.equal(res.status, 200);
  assert.equal(res.body.email, 'user@test.dev');
});

await step('me without token (401)', async () => {
  const res = await request(app).get('/api/auth/me');
  assert.equal(res.status, 401);
});

await step('update profile (200)', async () => {
  const res = await request(app)
    .put('/api/auth/profile')
    .set(auth(userToken))
    .send({ bio: 'Testing things', country: 'Pakistan' });
  assert.equal(res.status, 200);
  assert.equal(res.body.bio, 'Testing things');
});

await step('change password wrong current (401)', async () => {
  const res = await request(app)
    .put('/api/auth/password')
    .set(auth(userToken))
    .send({ currentPassword: 'nope12345', newPassword: 'newpass123' });
  assert.equal(res.status, 401);
});

await step('change password ok (200) + login with new', async () => {
  const res = await request(app)
    .put('/api/auth/password')
    .set(auth(userToken))
    .send({ currentPassword: 'password123', newPassword: 'newpass123' });
  assert.equal(res.status, 200);
  const l = await request(app)
    .post('/api/auth/login')
    .send({ email: 'user@test.dev', password: 'newpass123' });
  assert.equal(l.status, 200);
  userToken = l.body.token;
});

console.log('— experiences —');
await step('create experience (201, pending)', async () => {
  const res = await request(app)
    .post('/api/experiences')
    .set(auth(userToken))
    .send({
      title: 'I Tried Freelancing for 8 Months',
      category: 'freelancing',
      country: 'Pakistan',
      goal: 'Earn a full-time income from freelancing',
      description: 'I spent eight months learning web development and hunting for clients on freelance platforms.',
      outcome: 'unsuccessful',
      privacy: 'public',
      startingPoint: { education: 'BS Computer Science', experienceLevel: 'Beginner', budget: 'Under $500', timeAvailable: '15 hrs/week', location: 'Hangu', skills: ['HTML', 'CSS'] },
      timeline: [{ label: 'Month 1-2', text: 'Learned web development' }],
      investment: { money: '$120', time: '8 months', tools: ['Laptop'] },
      obstacles: ['Finding consistent clients'],
      whatWorked: ['Building a portfolio'],
      lessons: ['Validate demand early'],
      doDifferently: ['Start with a niche'],
      tags: ['freelancing', 'web-dev'],
    });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.status, 'pending');
  assert.equal(res.body.category, 'freelancing');
  expId = res.body.id;
  expSlug = res.body.slug;
});

await step('pending experience NOT in public list', async () => {
  const res = await request(app).get('/api/experiences');
  assert.equal(res.status, 200);
  assert.ok(!(res.body.items || []).some((e) => e.id === expId));
});

await step('owner CAN see own pending via slug (200)', async () => {
  const res = await request(app).get(`/api/experiences/${expSlug}`).set(auth(userToken));
  assert.equal(res.status, 200);
});

await step('stranger CANNOT see pending via slug (404)', async () => {
  const res = await request(app).get(`/api/experiences/${expSlug}`).set(auth(adminToken));
  assert.equal(res.status, 200); // admin can see
  const anon = await request(app).get(`/api/experiences/${expSlug}`);
  assert.equal(anon.status, 404);
});

await step('non-admin cannot moderate (403)', async () => {
  const res = await request(app)
    .post(`/api/admin/moderation/${expId}`)
    .set(auth(userToken))
    .send({ action: 'approve' });
  assert.equal(res.status, 403);
});

await step('admin approves (200)', async () => {
  const res = await request(app)
    .post(`/api/admin/moderation/${expId}`)
    .set(auth(adminToken))
    .send({ action: 'approve' });
  assert.equal(res.status, 200);
});

await step('approved experience IS publicly visible', async () => {
  const res = await request(app).get('/api/experiences');
  assert.equal(res.status, 200);
  assert.ok((res.body.items || []).some((e) => e.id === expId));
});

await step('record view (200)', async () => {
  const res = await request(app).post(`/api/experiences/${expId}/view`);
  assert.equal(res.status, 200);
  assert.ok(res.body.views >= 1);
});

await step('save + unsave (201/200)', async () => {
  const s = await request(app).post(`/api/experiences/${expId}/save`).set(auth(adminToken));
  assert.equal(s.status, 201);
  const dup = await request(app).post(`/api/experiences/${expId}/save`).set(auth(adminToken));
  assert.equal(dup.status, 409);
  const u = await request(app).delete(`/api/experiences/${expId}/save`).set(auth(adminToken));
  assert.equal(u.status, 200);
  assert.equal(u.body.saved, false);
});

await step('comment + reply + like (201/201/200)', async () => {
  const c = await request(app)
    .post(`/api/experiences/${expId}/comments`)
    .set(auth(adminToken))
    .send({ body: 'Honest write-up, thank you for sharing.' });
  assert.equal(c.status, 201, JSON.stringify(c.body));
  commentId = c.body.id;
  const r = await request(app)
    .post(`/api/comments/${commentId}/reply`)
    .set(auth(userToken))
    .send({ body: 'Glad it helped!' });
  assert.equal(r.status, 201);
  const l = await request(app).post(`/api/comments/${commentId}/like`).set(auth(userToken));
  assert.equal(l.status, 200);
  assert.equal(l.body.liked, true);
  const list = await request(app).get(`/api/experiences/${expId}/comments`);
  assert.equal(list.status, 200);
  assert.ok((list.body.items || []).length >= 1);
});

await step('owner notified about comment (array, unread)', async () => {
  const res = await request(app).get('/api/notifications').set(auth(userToken));
  assert.equal(res.status, 200);
  const items = Array.isArray(res.body) ? res.body : res.body.items;
  assert.ok(items.some((n) => n.type === 'comment'));
});

await step('search experiences (200)', async () => {
  const res = await request(app).get('/api/experiences/search').query({ q: 'freelancing', limit: 5 });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.ok(res.body.some((e) => e.id === expId));
});

await step('filter by outcome + sort (200)', async () => {
  const res = await request(app)
    .get('/api/experiences')
    .query({ outcomes: 'unsuccessful', sort: 'recent' });
  assert.equal(res.status, 200);
  assert.ok((res.body.items || []).every((e) => e.outcome === 'unsuccessful'));
});

console.log('— decisions —');
await step('create decision (201, D-id, private)', async () => {
  const res = await request(app)
    .post('/api/decisions')
    .set(auth(userToken))
    .send({
      title: 'Should I start a clothing business?',
      situation: { location: 'Hangu', budget: 'PKR 50,000' },
      expectations: { duration: '6 months', investment: '$500', expectedResult: '$1,000/month', goal: 'Profitable shop' },
    });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.match(res.body.decisionId, /^D-\d+$/);
  assert.equal(res.body.status, 'planning');
  assert.equal(res.body.visibility, 'private');
  decisionId = res.body.id;
});

await step('add update (201)', async () => {
  const res = await request(app)
    .post(`/api/decisions/${decisionId}/updates`)
    .set(auth(userToken))
    .send({ text: 'Researched suppliers today.', stage: 'Research' });
  assert.equal(res.status, 201);
});

await step('add milestone + toggle (201/200)', async () => {
  const m = await request(app)
    .post(`/api/decisions/${decisionId}/milestones`)
    .set(auth(userToken))
    .send({ title: 'Find supplier', dueDate: new Date(Date.now() + 2 * 864e5).toISOString() });
  assert.equal(m.status, 201);
  milestoneId = m.body.id;
  const t = await request(app)
    .patch(`/api/decisions/${decisionId}/milestones/${milestoneId}`)
    .set(auth(userToken))
    .send({});
  assert.equal(t.status, 200);
  assert.equal(t.body.milestone.done, true);
});

await step('activate then complete with actuals (200)', async () => {
  const a = await request(app)
    .patch(`/api/decisions/${decisionId}`)
    .set(auth(userToken))
    .send({ status: 'active' });
  assert.equal(a.status, 200);
  const c = await request(app)
    .post(`/api/decisions/${decisionId}/complete`)
    .set(auth(userToken))
    .send({ actualInvestment: '$730', actualDuration: '8 months', actualResult: '$450/month' });
  assert.equal(c.status, 200, JSON.stringify(c.body));
  assert.equal(c.body.status, 'completed');
  assert.equal(c.body.actual.investment, '$730');
});

await step('illegal transition blocked (400)', async () => {
  const res = await request(app)
    .patch(`/api/decisions/${decisionId}`)
    .set(auth(userToken))
    .send({ status: 'active' });
  assert.equal(res.status, 400);
});

await step('admin can read any decision (200)', async () => {
  const res = await request(app).get(`/api/decisions/${decisionId}`).set(auth(adminToken));
  assert.equal(res.status, 200);
});

console.log('— similarity + AI —');
await step('similarity find (200, scored)', async () => {
  const res = await request(app).post('/api/similar').send({
    goal: 'Earn money freelancing',
    country: 'Pakistan',
    budget: 'Under $500',
    experienceLevel: 'Beginner',
    timeAvailable: '15 hrs/week',
    skills: ['HTML'],
  });
  assert.equal(res.status, 200, JSON.stringify(res.body).slice(0, 300));
  assert.ok(Array.isArray(res.body.results));
  assert.ok(res.body.results.length > 0);
  assert.ok(typeof res.body.results[0].score === 'number');
  assert.ok(Array.isArray(res.body.results[0].factors));
});

await step('ai analyze (200, separated sections, real counts)', async () => {
  const res = await request(app)
    .post('/api/ai/analyze')
    .set(auth(userToken))
    .send({ goal: 'Start freelancing', country: 'Pakistan' });
  assert.equal(res.status, 200, JSON.stringify(res.body).slice(0, 300));
  assert.ok(res.body.input);
  assert.ok(res.body.datasetStats);
  assert.ok(Array.isArray(res.body.patterns));
  assert.ok(Array.isArray(res.body.questions));
  assert.ok(Array.isArray(res.body.related));
});

await step('ai structure (200, never invents)', async () => {
  const res = await request(app)
    .post('/api/ai/structure')
    .set(auth(userToken))
    .send({ text: 'I started freelancing last year with no money. I learned web design for 3 months then got my first client. Biggest problem was finding consistent work.' });
  assert.equal(res.status, 200);
  assert.equal(res.body.generated, true);
  assert.equal(res.body.outcome, null);
  assert.ok(Array.isArray(res.body.obstacles));
});

console.log('— reports, admin, misc —');
await step('report comment (201)', async () => {
  const res = await request(app)
    .post('/api/reports')
    .set(auth(userToken))
    .send({ targetType: 'comment', targetId: commentId, reason: 'spam' });
  assert.equal(res.status, 201);
  assert.ok(res.body.ok);
});

await step('admin resolves report (200)', async () => {
  const q = await request(app).get('/api/admin/reports').set(auth(adminToken));
  assert.equal(q.status, 200);
  const items = q.body.items || q.body;
  assert.ok(items.length > 0);
  const r = await request(app)
    .post(`/api/admin/reports/${items[0].id}/resolve`)
    .set(auth(adminToken))
    .send({ action: 'resolved' });
  assert.equal(r.status, 200);
});

await step('admin overview (200)', async () => {
  const res = await request(app).get('/api/admin/overview').set(auth(adminToken));
  assert.equal(res.status, 200);
  assert.ok(res.body.users >= 2);
});

await step('admin analytics (200)', async () => {
  const res = await request(app).get('/api/admin/analytics').set(auth(adminToken));
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.experiencesByOutcome));
});

await step('admin suspends user → login 403', async () => {
  const me = await request(app).get('/api/auth/me').set(auth(userToken));
  const s = await request(app)
    .post(`/api/admin/users/${me.body.id}/suspend`)
    .set(auth(adminToken))
    .send({ suspended: true });
  assert.equal(s.status, 200);
  const l = await request(app)
    .post('/api/auth/login')
    .send({ email: 'user@test.dev', password: 'newpass123' });
  assert.equal(l.status, 403);
  await request(app)
    .post(`/api/admin/users/${me.body.id}/suspend`)
    .set(auth(adminToken))
    .send({ suspended: false });
});

await step('forgot-password without SMTP (503)', async () => {
  const res = await request(app)
    .post('/api/auth/forgot-password')
    .send({ email: 'user@test.dev' });
  assert.equal(res.status, 503);
  assert.equal(res.body.error, 'email_not_configured');
});

await step('global search (200)', async () => {
  const res = await request(app).get('/api/search').query({ q: 'freelancing' });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.experiences));
});

await step('stats (200, real counts)', async () => {
  const res = await request(app).get('/api/stats');
  assert.equal(res.status, 200);
  assert.ok(res.body.experiences >= 1);
});

await step('categories with real counts (200)', async () => {
  const res = await request(app).get('/api/categories');
  assert.equal(res.status, 200);
  const f = res.body.find((c) => c.slug === 'freelancing');
  assert.ok(f && f.count >= 1);
});

await mongoose.disconnect();
await mongod.stop();
console.log(`\nALL GREEN — ${passed} steps passed`);

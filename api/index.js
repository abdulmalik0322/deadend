/**
 * Vercel serverless entry point for the DEADEND Express API.
 *
 * Vercel's Node.js runtime invokes the default export as `(req, res)` with
 * plain Node http objects — so the Express app (itself a valid
 * `(req, res)` listener) is called directly after ensuring the database
 * is connected. The Mongoose connection is cached on `globalThis` so warm
 * invocations reuse it instead of reconnecting (standard serverless pattern).
 *
 * NOTE on serverless-http: it is installed and exported below as
 * `lambdaHandler` for AWS Lambda / API Gateway deployments (its provider
 * layer only understands Lambda-style `{event, context}` payloads, NOT
 * Vercel's `(req, res)` invocation — wiring it as the Vercel default export
 * would break at runtime). On Vercel the default export below is the live path.
 */
import serverless from 'serverless-http';
import app from '../server/app.js';
import { connectDB } from '../server/config/db.js';

const GLOBAL_KEY = '__deadend_mongoose_conn__';

/**
 * Connect once per warm container; reuse across invocations.
 * A failed attempt clears the cache so the next invocation retries.
 */
export async function ensureDb() {
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = connectDB().catch((err) => {
      globalThis[GLOBAL_KEY] = null;
      throw err;
    });
  }
  return globalThis[GLOBAL_KEY];
}

/** AWS Lambda / API Gateway entry (unused on Vercel). */
export const lambdaHandler = serverless(app);

/** Vercel entry: (req, res) -> ensure DB -> Express app. */
export default async function vercelHandler(req, res) {
  try {
    await ensureDb();
  } catch (err) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Database unavailable', message: err.message }));
    return;
  }
  return app(req, res);
}

import crypto from 'crypto';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { seedDatabase } from '../seed/seed.js';

/**
 * Bootstrap-only guard. Compares the `x-setup-key` request header against
 * SETUP_KEY in constant time. When SETUP_KEY is unset the setup endpoints
 * are disabled entirely (404).
 *
 * @returns null when allowed, otherwise { status, body } to send.
 */
function checkSetupKey(req) {
  const key = process.env.SETUP_KEY;
  if (!key) {
    return { status: 404, body: { error: 'Setup is disabled' } };
  }

  const provided = String(req.headers['x-setup-key'] || '');
  const a = Buffer.from(provided);
  const b = Buffer.from(key);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { status: 403, body: { error: 'Forbidden' } };
  }
  return null;
}

/** POST /api/setup/seed — idempotent demo-data bootstrap. */
export const seed = asyncHandler(async (req, res) => {
  const denied = checkSetupKey(req);
  if (denied) return res.status(denied.status).json(denied.body);

  const result = await seedDatabase();
  res.json(result);
});

/** POST /api/setup/promote — grant admin role to a user by email. */
export const promote = asyncHandler(async (req, res) => {
  const denied = checkSetupKey(req);
  if (denied) return res.status(denied.status).json(denied.body);

  const { email } = req.body || {};
  if (!email) throw new ApiError(400, 'email is required');

  const user = await User.findOne({ email: String(email).trim().toLowerCase() });
  if (!user) throw new ApiError(404, 'User not found');

  user.role = 'admin';
  await user.save();

  res.json({ ok: true });
});

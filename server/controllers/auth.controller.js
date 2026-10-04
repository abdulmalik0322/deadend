import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isEmailConfigured, sendPasswordResetEmail } from '../utils/mailer.js';

/** Sign a JWT carrying only the user id and role. */
function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/** Public user shape — never leaks passwordHash. */
function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    bio: user.bio,
    country: user.country,
    role: user.role,
    publicProfile: user.publicProfile,
    stats: user.stats,
    createdAt: user.createdAt,
  };
}

/** Derive a unique username from the email local-part. */
async function uniqueUsernameFromEmail(email) {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'user';
  let username = base;
  let i = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await User.exists({ username })) {
    i += 1;
    username = `${base}${i}`;
  }
  return username;
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, country = '' } = req.body;

  if (await User.exists({ email })) {
    throw new ApiError(409, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const username = await uniqueUsernameFromEmail(email);
  const user = await User.create({ name, email, username, passwordHash, country });

  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw new ApiError(401, 'Invalid email or password');
  if (user.suspended) throw new ApiError(403, 'Account suspended');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new ApiError(401, 'Invalid email or password');

  res.json({ token: signToken(user), user: publicUser(user) });
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json(publicUser(user));
});

/** Stateless JWT: nothing to invalidate server-side; the client discards the token. */
export const logout = asyncHandler(async (req, res) => {
  res.json({ message: 'Logged out. Discard the token on the client.' });
});

/**
 * Request a password-reset email. Always responds 200 so we don't leak
 * which emails are registered (no email oracle). When SMTP is not
 * configured the endpoint is unusable and reports 503.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!isEmailConfigured()) {
    return res.status(503).json({
      error: 'email_not_configured',
      message: 'Password reset email is not configured',
    });
  }

  const user = await User.findOne({ email });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const clientUrl = (process.env.CLIENT_URL || '').split(',')[0].trim();
    const resetUrl = `${clientUrl}/reset-password?token=${token}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (err) {
      // Don't leave a dangling token the user was never told about.
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      throw new ApiError(502, 'email_failed');
    }
  }

  return res.json({ ok: true });
});

/**
 * Consume a password-reset token: { token, password }.
 * The stored token is a SHA-256 hash with a 1-hour expiry.
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) throw new ApiError(400, 'Invalid or expired reset token');

  user.passwordHash = await bcrypt.hash(password, 12);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ ok: true });
});

/**
 * Change the authenticated user's password: { currentPassword, newPassword }.
 * Verifies the current password first (401 when wrong).
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!user) throw new ApiError(404, 'User not found');

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw new ApiError(401, 'Current password is incorrect');

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.json({ ok: true });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'bio', 'country', 'publicProfile'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!user) throw new ApiError(404, 'User not found');
  res.json(publicUser(user));
});

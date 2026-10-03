import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

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
 * MOCK password-reset request. Always responds 200 so we don't leak
 * which emails are registered. Production: generate a signed, expiring
 * token and email a reset link instead of returning anything.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const exists = email ? await User.exists({ email }) : false;
  res.json({
    message: exists
      ? 'Password reset instructions sent (mock).'
      : 'If that email exists, reset instructions were sent (mock).',
    mockResetToken: 'mock-reset-token',
  });
});

/**
 * MOCK reset accepting { email, token, newPassword }.
 * Production: verify the signed token from forgotPassword before updating.
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    throw new ApiError(400, 'email, token and newPassword are required');
  }
  if (String(newPassword).length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'User not found');

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
  res.json({ message: 'Password updated (mock flow).' });
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

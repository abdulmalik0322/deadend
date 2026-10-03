import { User } from '../models/User.js';
import { Decision } from '../models/Decision.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/users/:username — public profile.
 * Respects publicProfile: private profiles are visible only to the owner or an admin.
 */
export const getPublicProfile = asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() });
  if (!user) throw new ApiError(404, 'User not found');

  const isOwner = req.user?.id === String(user._id);
  const isAdmin = req.user?.role === 'admin';
  if (!user.publicProfile && !isOwner && !isAdmin) {
    throw new ApiError(403, 'This profile is private');
  }

  res.json({
    name: user.name,
    username: user.username,
    bio: user.bio,
    country: user.country,
    stats: user.stats,
    createdAt: user.createdAt,
  });
});

/** GET /api/users/me/stats — the current user's dashboard numbers. */
export const myStats = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  const [activeDecisions, planningDecisions] = await Promise.all([
    Decision.countDocuments({ owner: req.user.id, status: 'active' }),
    Decision.countDocuments({ owner: req.user.id, status: 'planning' }),
  ]);

  res.json({
    ...user.stats.toObject(),
    activeDecisions,
    planningDecisions,
  });
});

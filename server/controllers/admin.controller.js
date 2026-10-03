import { Experience } from '../models/Experience.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { AnalyticsEvent } from '../models/AnalyticsEvent.js';
import { platformStats } from '../services/stats.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination } from '../utils/pagination.js';

/** GET /api/admin/overview — platform counts for the admin dashboard. */
export const overview = asyncHandler(async (req, res) => {
  res.json(await platformStats());
});

/** GET /api/admin/queue — experiences awaiting moderation, oldest first. */
export const moderationQueue = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);

  const [items, total] = await Promise.all([
    Experience.find({ status: 'pending' })
      .populate('author', 'name username email')
      .populate('category', 'name slug')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Experience.countDocuments({ status: 'pending' }),
  ]);

  res.json({ page, limit, total, pages: Math.ceil(total / limit), items });
});

async function notifyAuthor(userId, type, title, body, link) {
  await Notification.create({ user: userId, type, title, body, link });
}

/** PATCH /api/admin/experiences/:id/approve */
export const approveExperience = asyncHandler(async (req, res) => {
  const exp = await Experience.findByIdAndUpdate(
    req.params.id,
    { status: 'approved', rejectionNote: '' },
    { new: true }
  );
  if (!exp) throw new ApiError(404, 'Experience not found');

  await notifyAuthor(
    exp.author,
    'approval',
    'Your experience was approved',
    `"${exp.title}" is now live.`,
    `/experiences/${exp.slug}`
  );
  res.json(exp);
});

/** PATCH /api/admin/experiences/:id/reject — requires a rejectionNote. */
export const rejectExperience = asyncHandler(async (req, res) => {
  const { rejectionNote } = req.body;
  if (!rejectionNote || !String(rejectionNote).trim()) {
    throw new ApiError(400, 'rejectionNote is required');
  }

  const exp = await Experience.findByIdAndUpdate(
    req.params.id,
    { status: 'rejected', rejectionNote: String(rejectionNote).trim() },
    { new: true }
  );
  if (!exp) throw new ApiError(404, 'Experience not found');

  await notifyAuthor(
    exp.author,
    'approval',
    'Your experience was not approved',
    String(rejectionNote).trim(),
    '/dashboard'
  );
  res.json(exp);
});

/** GET /api/admin/users — paginated user list, ?suspended=true filter. */
export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = {};
  if (req.query.suspended === 'true') filter.suspended = true;

  const [items, total] = await Promise.all([
    User.find(filter)
      .select('name username email role country suspended publicProfile stats createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json({ page, limit, total, pages: Math.ceil(total / limit), items });
});

/** PATCH /api/admin/users/:id/suspend — { suspended: boolean }. */
export const suspendUser = asyncHandler(async (req, res) => {
  const { suspended } = req.body;
  if (typeof suspended !== 'boolean') {
    throw new ApiError(400, 'suspended must be a boolean');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.role === 'admin') throw new ApiError(403, 'Cannot suspend an admin');

  user.suspended = suspended;
  await user.save();
  res.json({ id: user._id, suspended: user.suspended });
});

/**
 * GET /api/admin/analytics — event counts grouped by type and day
 * over the last 30 days.
 */
export const analytics = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const rows = await AnalyticsEvent.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: {
          type: '$type',
          day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.day': 1, '_id.type': 1 } },
  ]);

  res.json(rows.map((r) => ({ type: r._id.type, day: r._id.day, count: r.count })));
});

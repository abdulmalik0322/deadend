import { Experience } from '../models/Experience.js';
import { User } from '../models/User.js';
import { Decision } from '../models/Decision.js';
import { Comment } from '../models/Comment.js';
import { Report } from '../models/Report.js';
import { listReports as reportsListReports } from './report.controller.js';
import { presentExperience, presentUser } from '../utils/present.js';
import { notify } from '../utils/notify.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination } from '../utils/pagination.js';

const MODERATION_STATUSES = ['draft', 'pending', 'approved', 'rejected'];

/** GET /api/admin/overview — platform counts for the admin dashboard. */
export const overview = asyncHandler(async (req, res) => {
  const [users, experiences, decisions, pending, reports, comments] =
    await Promise.all([
      User.countDocuments(),
      Experience.countDocuments(),
      Decision.countDocuments(),
      Experience.countDocuments({ status: 'pending' }),
      Report.countDocuments({ status: 'open' }),
      Comment.countDocuments(),
    ]);

  res.json({ users, experiences, decisions, pending, reports, comments });
});

/**
 * GET /api/admin/moderation — experiences awaiting moderation, newest first.
 * ?status= defaults to 'pending'. Returns a bare array (contract).
 */
export const moderationQueue = asyncHandler(async (req, res) => {
  const status = req.query.status || 'pending';
  if (!MODERATION_STATUSES.includes(status)) {
    throw new ApiError(400, `status must be one of: ${MODERATION_STATUSES.join(', ')}`);
  }

  const viewer = { id: req.user.id, role: req.user.role };
  const docs = await Experience.find({ status })
    .populate('author', 'name username country')
    .populate('category', 'name slug')
    .sort({ createdAt: -1 })
    .lean();

  res.json(docs.map((doc) => presentExperience(doc, viewer)));
});

/**
 * POST /api/admin/moderation/:id — { action: 'approve'|'reject', note? }.
 * Notifies the experience owner. → { ok: true }.
 */
export const moderateExperience = asyncHandler(async (req, res) => {
  const { action, note = '' } = req.body;
  if (!['approve', 'reject'].includes(action)) {
    throw new ApiError(400, "action must be 'approve' or 'reject'");
  }

  const exp = await Experience.findById(req.params.id);
  if (!exp) throw new ApiError(404, 'Experience not found');

  exp.status = action === 'approve' ? 'approved' : 'rejected';
  exp.rejectionNote = action === 'reject' ? String(note).trim() : '';
  await exp.save();

  const ownerId = exp.author;
  if (action === 'approve') {
    await notify(ownerId, {
      type: 'approval',
      title: 'Your experience was approved',
      body: `"${exp.title}" is now live.`,
      link: `/experiences/${exp.slug}`,
    });
  } else {
    await notify(ownerId, {
      type: 'approval',
      title: "Your experience wasn't approved",
      body: exp.rejectionNote || 'An admin reviewed your experience and did not approve it.',
      link: `/experiences/${exp.slug}`,
    });
  }

  res.json({ ok: true });
});

/**
 * GET /api/admin/reports — delegates to the reports controller's list logic.
 * Defaults to open reports when no ?status= is given.
 */
export const listReports = (req, res, next) => {
  if (!req.query.status) req.query.status = 'open';
  return reportsListReports(req, res, next);
};

/**
 * POST /api/admin/reports/:id/resolve — { action: 'resolved'|'dismissed', note? }.
 * → { ok: true }.
 */
export const resolveAdminReport = asyncHandler(async (req, res) => {
  const { action } = req.body;
  if (!['resolved', 'dismissed'].includes(action)) {
    throw new ApiError(400, "action must be 'resolved' or 'dismissed'");
  }

  const report = await Report.findById(req.params.id);
  if (!report) throw new ApiError(404, 'Report not found');

  report.status = action;
  await report.save();
  res.json({ ok: true });
});

/**
 * GET /api/admin/users — ?search= (name/email/username regex), ?page=.
 * → { items: [presentUser + suspended], total, page, pages }.
 */
export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = {};
  const search = String(req.query.search || '').trim();
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { username: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  res.json({
    items: users.map((u) => ({ ...presentUser(u), suspended: Boolean(u.suspended) })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

/**
 * POST /api/admin/users/:id/suspend — { suspended: boolean }. → { ok: true }.
 * Cannot suspend your own account (400).
 */
export const suspendUser = asyncHandler(async (req, res) => {
  const { suspended } = req.body;
  if (typeof suspended !== 'boolean') {
    throw new ApiError(400, 'suspended must be a boolean');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (String(user._id) === String(req.user.id)) {
    throw new ApiError(400, 'You cannot suspend your own account');
  }

  user.suspended = suspended;
  await user.save();
  res.json({ ok: true });
});

/**
 * GET /api/admin/analytics — real aggregations:
 *  - signupsByMonth: last 6 months, YYYY-MM buckets (gaps filled with 0)
 *  - experiencesByOutcome: [{ outcome, count }]
 *  - topCategories: top 6 categories by approved experience count
 */
export const analytics = asyncHandler(async (req, res) => {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  const since = new Date(`${months[0]}-01T00:00:00.000Z`);

  const [signupRows, outcomeRows, categoryRows] = await Promise.all([
    User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ]),
    Experience.aggregate([
      { $group: { _id: '$outcome', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Experience.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'cat',
        },
      },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          slug: '$cat.slug',
          name: '$cat.name',
          count: 1,
        },
      },
    ]),
  ]);

  const signupsByMonthLookup = Object.fromEntries(
    signupRows.map((r) => [r._id, r.count])
  );

  res.json({
    signupsByMonth: months.map((month) => ({
      month,
      count: signupsByMonthLookup[month] || 0,
    })),
    experiencesByOutcome: outcomeRows.map((r) => ({
      outcome: r._id,
      count: r.count,
    })),
    topCategories: categoryRows.map((r) => ({
      slug: r.slug || '',
      name: r.name || '',
      count: r.count,
    })),
  });
});

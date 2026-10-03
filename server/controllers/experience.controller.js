import { Experience } from '../models/Experience.js';
import { SavedExperience } from '../models/SavedExperience.js';
import { Comment } from '../models/Comment.js';
import { Report } from '../models/Report.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination } from '../utils/pagination.js';
import { uniqueSlug } from '../utils/slugs.js';

const WRITE_FIELDS = [
  'title',
  'category',
  'country',
  'goal',
  'description',
  'duration',
  'investmentDisplay',
  'outcome',
  'mainObstacle',
  'tags',
  'privacy',
  'startingPoint',
  'timeline',
  'investment',
  'obstacles',
  'whatWorked',
  'lessons',
  'doDifferently',
];

/** Pick only whitelisted fields from the request body. */
function pick(body) {
  const out = {};
  for (const key of WRITE_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

function assertOwnerOrAdmin(ownerId, user) {
  if (user.role === 'admin') return;
  if (String(ownerId) !== user.id) throw new ApiError(403, 'Forbidden');
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET /api/experiences
 * Filters: category (id), country, outcome, tags (csv), q (full-text), status (admin only).
 * Sort: newest | oldest | popular.
 */
export const listExperiences = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const { category, country, outcome, tags, q, sort = 'newest', status } = req.query;

  const filter = { privacy: { $in: ['public', 'anonymous'] } };
  // Public listing only shows approved experiences; admins may filter by status.
  if (req.user?.role === 'admin' && status) filter.status = status;
  else filter.status = 'approved';

  if (category) filter.category = category;
  if (country) filter.country = new RegExp(`^${escapeRegExp(country)}$`, 'i');
  if (outcome) filter.outcome = outcome;
  if (tags) {
    const list = String(tags).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (list.length) filter.tags = { $in: list };
  }
  if (q) filter.$text = { $search: q };

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    popular: { 'stats.views': -1, 'stats.saves': -1 },
  };

  const [items, total] = await Promise.all([
    Experience.find(filter)
      .populate('category', 'name slug')
      .populate('author', 'name username')
      .sort(sortMap[sort] || sortMap.newest)
      .skip(skip)
      .limit(limit)
      .lean(),
    Experience.countDocuments(filter),
  ]);

  res.json({ page, limit, total, pages: Math.ceil(total / limit), items });
});

/** GET /api/experiences/:slug — visibility: approved+non-private, owner, or admin. */
export const getExperienceBySlug = asyncHandler(async (req, res) => {
  const exp = await Experience.findOne({ slug: req.params.slug })
    .populate('category', 'name slug')
    .populate('author', 'name username country');
  if (!exp) throw new ApiError(404, 'Experience not found');

  const isOwner = req.user && String(exp.author?._id || exp.author) === req.user.id;
  const isAdmin = req.user?.role === 'admin';
  if (!isAdmin && !isOwner && (exp.status !== 'approved' || exp.privacy === 'private')) {
    throw new ApiError(404, 'Experience not found');
  }

  // Fire-and-forget view counter; never blocks the response.
  Experience.updateOne({ _id: exp._id }, { $inc: { 'stats.views': 1 } }).catch(() => {});
  res.json(exp);
});

/** POST /api/experiences — creates as `pending` for admin moderation. */
export const createExperience = asyncHandler(async (req, res) => {
  const data = pick(req.body);
  const slug = await uniqueSlug(Experience, data.title);

  const exp = await Experience.create({
    ...data,
    slug,
    author: req.user.id,
    status: 'pending',
  });

  await User.updateOne(
    { _id: req.user.id },
    { $inc: { 'stats.experiences': 1, 'stats.contributions': 1 } }
  );

  res.status(201).json(exp);
});

/** PATCH /api/experiences/:id — owner or admin. */
export const updateExperience = asyncHandler(async (req, res) => {
  const exp = await Experience.findById(req.params.id);
  if (!exp) throw new ApiError(404, 'Experience not found');
  assertOwnerOrAdmin(exp.author, req.user);

  const data = pick(req.body);
  if (data.title && data.title !== exp.title) {
    exp.slug = await uniqueSlug(Experience, data.title);
  }
  Object.assign(exp, data);
  await exp.save();
  res.json(exp);
});

/** DELETE /api/experiences/:id — owner or admin; cascades saves + comments. */
export const deleteExperience = asyncHandler(async (req, res) => {
  const exp = await Experience.findById(req.params.id);
  if (!exp) throw new ApiError(404, 'Experience not found');
  assertOwnerOrAdmin(exp.author, req.user);

  await Promise.all([
    SavedExperience.deleteMany({ experience: exp._id }),
    Comment.deleteMany({ experience: exp._id }),
    exp.deleteOne(),
  ]);
  await User.updateOne(
    { _id: exp.author },
    { $inc: { 'stats.experiences': -1, 'stats.contributions': -1 } }
  );
  res.json({ message: 'Experience deleted' });
});

/** POST /api/experiences/:id/save */
export const saveExperience = asyncHandler(async (req, res) => {
  const experienceId = req.params.id;
  const exp = await Experience.findById(experienceId);
  if (!exp) throw new ApiError(404, 'Experience not found');

  try {
    const saved = await SavedExperience.create({
      user: req.user.id,
      experience: experienceId,
      folder: req.body.folder || null,
    });
    await Experience.updateOne({ _id: experienceId }, { $inc: { 'stats.saves': 1 } });
    res.status(201).json(saved);
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'Experience already saved');
    throw err;
  }
});

/** DELETE /api/experiences/:id/save */
export const unsaveExperience = asyncHandler(async (req, res) => {
  const removed = await SavedExperience.findOneAndDelete({
    user: req.user.id,
    experience: req.params.id,
  });
  if (!removed) throw new ApiError(404, 'Saved experience not found');
  await Experience.updateOne({ _id: req.params.id }, { $inc: { 'stats.saves': -1 } });
  res.json({ message: 'Removed from saved' });
});

/** POST /api/experiences/:id/report */
export const reportExperience = asyncHandler(async (req, res) => {
  const exp = await Experience.findById(req.params.id);
  if (!exp) throw new ApiError(404, 'Experience not found');

  const { reason, details = '' } = req.body;
  if (!reason) throw new ApiError(400, 'reason is required');

  const report = await Report.create({
    targetType: 'experience',
    targetId: exp._id,
    reason,
    details,
    reportedBy: req.user.id,
  });
  res.status(201).json(report);
});

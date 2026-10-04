import { Experience } from '../models/Experience.js';
import { Category } from '../models/Category.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { presentExperience } from '../utils/present.js';

const VISIBLE = { status: 'approved', privacy: { $in: ['public', 'anonymous'] } };

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getLimit(req, def, max) {
  const parsed = parseInt(req.query.limit, 10);
  if (Number.isNaN(parsed)) return def;
  return Math.min(max, Math.max(1, parsed));
}

function requireQuery(req) {
  const q = String(req.query.q || '').trim();
  if (!q) throw new ApiError(400, 'Query parameter q is required');
  return q;
}

/**
 * GET /api/search — ?q=&limit= (default 10, max 30).
 * Groups results: matching experiences, matching categories, matching tags.
 * Public experiences only (approved + public/anonymous).
 */
export const globalSearch = asyncHandler(async (req, res) => {
  const q = requireQuery(req);
  const limit = getLimit(req, 10, 30);
  const rx = new RegExp(escapeRegExp(q), 'i');

  const [docs, categories, tagRows] = await Promise.all([
    Experience.find({
      ...VISIBLE,
      $or: [{ title: rx }, { goal: rx }, { description: rx }, { tags: rx }],
    })
      .populate('author', 'name username country')
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Category.find({ $or: [{ name: rx }, { description: rx }] })
      .select('name slug description')
      .limit(10)
      .lean(),
    Experience.aggregate([
      { $match: VISIBLE },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $match: { _id: rx } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),
  ]);

  res.json({
    experiences: docs.map((doc) => presentExperience(doc)),
    categories: categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      description: c.description || '',
    })),
    tags: tagRows.map((t) => t._id),
  });
});

/**
 * GET /api/search/suggestions — ?q=&limit= (default 8, max 30).
 * Merged suggestion list, experiences first:
 * [{ type: 'experience'|'category'|'tag', label, slug }].
 */
export const suggestions = asyncHandler(async (req, res) => {
  const q = requireQuery(req);
  const limit = getLimit(req, 8, 30);
  // Prefix match keeps suggestions tight as the user types.
  const rx = new RegExp(`^${escapeRegExp(q)}`, 'i');

  const [docs, categories, tagRows] = await Promise.all([
    Experience.find({ ...VISIBLE, title: rx })
      .select('title slug')
      .sort({ 'stats.views': -1 })
      .limit(limit)
      .lean(),
    Category.find({ name: rx }).select('name slug').limit(limit).lean(),
    Experience.aggregate([
      { $match: VISIBLE },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $match: { _id: rx } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]),
  ]);

  const merged = [
    ...docs.map((d) => ({ type: 'experience', label: d.title, slug: d.slug })),
    ...categories.map((c) => ({ type: 'category', label: c.name, slug: c.slug })),
    ...tagRows.map((t) => ({ type: 'tag', label: t._id, slug: t._id })),
  ];

  res.json(merged.slice(0, limit));
});

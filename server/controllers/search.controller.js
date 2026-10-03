import { Experience } from '../models/Experience.js';
import { Category } from '../models/Category.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/search?q=...
 * Global search returning grouped results: matching experiences,
 * matching categories, and matching tags with their usage counts.
 */
export const globalSearch = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) throw new ApiError(400, 'Query parameter q is required');

  const visible = { status: 'approved', privacy: { $in: ['public', 'anonymous'] } };

  const [experiences, categories, tagRows] = await Promise.all([
    Experience.find({ ...visible, $text: { $search: q } }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(10)
      .select('title slug goal outcome country tags category')
      .populate('category', 'name slug')
      .lean(),
    Category.find({ $text: { $search: q } })
      .limit(5)
      .select('name slug description')
      .lean(),
    Experience.aggregate([
      { $match: { ...visible, tags: { $regex: q, $options: 'i' } } },
      { $unwind: '$tags' },
      { $match: { tags: { $regex: q, $options: 'i' } } },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  res.json({
    experiences,
    categories,
    tags: tagRows.map((t) => ({ tag: t._id, count: t.count })),
  });
});

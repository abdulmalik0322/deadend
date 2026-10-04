import slugify from 'slugify';
import { Category } from '../models/Category.js';
import { Experience } from '../models/Experience.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { presentExperience } from '../utils/present.js';

const VISIBLE = { status: 'approved', privacy: { $in: ['public', 'anonymous'] } };

/** Real counts of approved+public experiences per category. */
async function categoryCounts() {
  const rows = await Experience.aggregate([
    { $match: VISIBLE },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
}

/** GET /api/categories — [{ slug, name, description, icon, count }] (real counts). */
export const listCategories = asyncHandler(async (req, res) => {
  const counts = await categoryCounts();
  const categories = await Category.find().sort({ name: 1 }).lean();

  res.json(
    categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      description: c.description || '',
      icon: c.icon || '',
      count: counts.get(String(c._id)) || 0,
    }))
  );
});

/**
 * GET /api/categories/:slug — category detail with popular searches,
 * 4 most-viewed experiences and real per-outcome stats. 404 on unknown slug.
 */
export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug }).lean();
  if (!category) throw new ApiError(404, 'Category not found');

  const [count, popularDocs, outcomeRows] = await Promise.all([
    Experience.countDocuments({ ...VISIBLE, category: category._id }),
    Experience.find({ ...VISIBLE, category: category._id })
      .populate('author', 'name username country')
      .sort({ 'stats.views': -1, createdAt: -1 })
      .limit(4)
      .lean(),
    Experience.aggregate([
      { $match: { ...VISIBLE, category: category._id } },
      { $group: { _id: '$outcome', count: { $sum: 1 } } },
    ]),
  ]);

  const outcomes = Object.fromEntries(outcomeRows.map((r) => [r._id, r.count]));

  res.json({
    slug: category.slug,
    name: category.name,
    description: category.description || '',
    icon: category.icon || '',
    count,
    popularSearches: Array.isArray(category.popularSearches)
      ? category.popularSearches
      : [],
    popular: popularDocs.map((doc) => presentExperience(doc)),
    stats: {
      experiences: count,
      outcomes,
    },
  });
});

/** POST /api/admin/categories — { name (1-80), description?, icon? }. → 201. */
export const createCategory = asyncHandler(async (req, res) => {
  const { name, description = '', icon = '' } = req.body;

  const slug = slugify(String(name || ''), { lower: true, strict: true });
  if (!slug) throw new ApiError(400, 'Could not derive a slug from name');
  if (await Category.exists({ slug })) {
    throw new ApiError(409, 'Category slug already exists');
  }

  const category = await Category.create({ slug, name, description, icon });
  res.status(201).json({
    slug: category.slug,
    name: category.name,
    description: category.description || '',
    icon: category.icon || '',
  });
});

/** PUT /api/admin/categories/:slug — updatable name/description/icon/popularSearches/trending. → 200. */
export const updateCategory = asyncHandler(async (req, res) => {
  const allowed = ['name', 'description', 'icon', 'popularSearches', 'trending'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const category = await Category.findOneAndUpdate(
    { slug: req.params.slug },
    updates,
    { new: true, runValidators: true }
  ).lean();
  if (!category) throw new ApiError(404, 'Category not found');

  res.json({
    slug: category.slug,
    name: category.name,
    description: category.description || '',
    icon: category.icon || '',
    popularSearches: Array.isArray(category.popularSearches)
      ? category.popularSearches
      : [],
  });
});

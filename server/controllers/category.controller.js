import slugify from 'slugify';
import { Category } from '../models/Category.js';
import { Experience } from '../models/Experience.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** GET /api/categories */
export const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 }).lean();
  res.json(categories);
});

/** GET /api/categories/:slug — includes popular searches + approved experience count. */
export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug }).lean();
  if (!category) throw new ApiError(404, 'Category not found');

  const experienceCount = await Experience.countDocuments({
    category: category._id,
    status: 'approved',
    privacy: { $in: ['public', 'anonymous'] },
  });

  res.json({ ...category, experienceCount });
});

/** POST /api/categories — admin only. Slug derived from name when omitted. */
export const createCategory = asyncHandler(async (req, res) => {
  const { name, description = '', icon = '', popularSearches = [], trending = [] } = req.body;
  const slug = req.body.slug || slugify(name, { lower: true, strict: true });

  if (await Category.exists({ slug })) throw new ApiError(409, 'Category slug already exists');

  const category = await Category.create({
    slug,
    name,
    description,
    icon,
    popularSearches,
    trending,
  });
  res.status(201).json(category);
});

/** PATCH /api/categories/:slug — admin only. */
export const updateCategory = asyncHandler(async (req, res) => {
  const allowed = ['name', 'description', 'icon', 'popularSearches', 'trending'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const category = await Category.findOneAndUpdate({ slug: req.params.slug }, updates, {
    new: true,
    runValidators: true,
  });
  if (!category) throw new ApiError(404, 'Category not found');
  res.json(category);
});

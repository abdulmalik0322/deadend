import { Experience } from '../models/Experience.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { presentExperience } from '../utils/present.js';
import { findTopSimilar } from '../services/similarity.service.js';

/**
 * POST /api/similar — public.
 * Body: { goal?, country?, budget?, experienceLevel?, timeAvailable?, skills?[] }
 * → { results: [{ experience, score (0-100), factors: [{ key, label, pct, detail }] }], totalInDataset }
 * The score is a platform-generated relevance score, not a prediction of outcomes.
 */
export const findSimilar = asyncHandler(async (req, res) => {
  const { goal, country, budget, experienceLevel, timeAvailable, skills } = req.body || {};
  const input = { goal, country, budget, experienceLevel, timeAvailable, skills };

  const pool = await Experience.find({
    status: 'approved',
    privacy: { $ne: 'private' },
  })
    .populate('category', 'name slug')
    .populate('author', 'name username country')
    .lean();

  const results = findTopSimilar(input, pool, 12).map(({ experience, score, factors }) => ({
    experience: presentExperience(experience, null),
    score,
    factors,
  }));

  res.json({ results, totalInDataset: pool.length });
});

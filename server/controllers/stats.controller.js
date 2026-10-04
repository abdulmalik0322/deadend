import { Experience } from '../models/Experience.js';
import { Decision } from '../models/Decision.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/stats — public.
 * Real platform counts: { experiences, decisions, contributors, countries }.
 * `experiences` counts publicly visible experiences (approved + not private).
 */
export const getStats = asyncHandler(async (req, res) => {
  const visible = { status: 'approved', privacy: { $ne: 'private' } };

  const [experiences, decisions, authorIds, countryList] = await Promise.all([
    Experience.countDocuments(visible),
    Decision.countDocuments(),
    Experience.distinct('author', visible),
    Experience.distinct('country', visible),
  ]);

  res.json({
    experiences,
    decisions,
    contributors: authorIds.length,
    countries: countryList.filter(Boolean).length,
  });
});

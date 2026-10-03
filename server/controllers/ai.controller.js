import { Experience } from '../models/Experience.js';
import { analyzeDecision, structureStory } from '../services/ai.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Build honest dataset statistics for the AI stub: outcome distribution
 * plus the most common obstacles and lessons among approved, public
 * experiences. When a real LLM is plugged in (see ai.service.js), this
 * same object grounds its answer so it cannot hallucinate platform stats.
 */
async function buildDatasetStats() {
  const base = { status: 'approved', privacy: { $in: ['public', 'anonymous'] } };

  const [outcomeRows, obstacleRows, lessonRows, total] = await Promise.all([
    Experience.aggregate([
      { $match: base },
      { $group: { _id: '$outcome', count: { $sum: 1 } } },
    ]),
    Experience.aggregate([
      { $match: base },
      { $unwind: '$obstacles' },
      { $group: { _id: '$obstacles', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    Experience.aggregate([
      { $match: base },
      { $unwind: '$lessons' },
      { $group: { _id: '$lessons', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    Experience.countDocuments(base),
  ]);

  return {
    total,
    byOutcome: Object.fromEntries(outcomeRows.map((r) => [r._id, r.count])),
    topObstacles: obstacleRows.map((r) => ({ text: r._id, count: r.count })),
    topLessons: lessonRows.map((r) => ({ text: r._id, count: r.count })),
  };
}

/**
 * POST /api/ai/analyze — { input } -> honest dataset-statistics summary.
 * Currently a stub (see services/ai.service.js); never predicts outcomes.
 */
export const analyze = asyncHandler(async (req, res) => {
  const { input } = req.body;
  if (!input || typeof input !== 'object') {
    throw new ApiError(400, 'input object is required');
  }

  const datasetStats = await buildDatasetStats();
  res.json(await analyzeDecision(input, datasetStats));
});

/**
 * POST /api/ai/structure — { text } -> Experience-shaped draft.
 * Deterministic stub; every field is a suggestion for the user to review.
 */
export const structure = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new ApiError(400, 'text is required');
  }

  res.json(await structureStory(text));
});

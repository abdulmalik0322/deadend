import { analyzeDecision, structureStory } from '../services/ai.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * POST /api/ai/analyze — { goal?, country?, budget?, experienceLevel?,
 * timeAvailable?, skills?[] } (flat body; the legacy { input: {...} } wrapper
 * is also accepted) → dataset-grounded analysis. → 200.
 */
export const analyze = asyncHandler(async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const input =
    body.input && typeof body.input === 'object' ? body.input : body;

  res.json(await analyzeDecision(input));
});

/**
 * POST /api/ai/structure — { text (10-5000) } → rule-based Experience-shaped
 * draft. → 200.
 */
export const structure = asyncHandler(async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (text.length < 10 || text.length > 5000) {
    throw new ApiError(400, 'text must be between 10 and 5000 characters');
  }

  res.json(await structureStory(text));
});

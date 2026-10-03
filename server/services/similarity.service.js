import { Experience } from '../models/Experience.js';

/**
 * Similarity scoring for "experiences like yours".
 *
 * KEEP IN SYNC with the frontend util (frontend/src/utils/similarity.js):
 * the weights below MUST match — goal 30, category 15, country 10,
 * budget 15, experience 15, time 15 (total 100). If the frontend changes,
 * change this file in the same commit.
 */
const WEIGHTS = {
  goal: 30,
  category: 15,
  country: 10,
  budget: 15,
  experience: 15,
  time: 15,
};

function norm(value) {
  return String(value || '').trim().toLowerCase();
}

function tokenSet(str) {
  return new Set(
    norm(str)
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );
}

/** Token-overlap ratio between two strings (0..1). */
function overlapScore(a, b) {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / Math.max(A.size, B.size);
}

function budgetScore(inputBudget, doc) {
  const a = norm(inputBudget);
  const b = norm(doc.startingPoint?.budget);
  if (!a || !b) return 0;
  if (a === b) return WEIGHTS.budget;
  const numA = parseFloat(a.replace(/[^0-9.]/g, ''));
  const numB = parseFloat(b.replace(/[^0-9.]/g, ''));
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && numB > 0) {
    // Numeric closeness: the closer the budgets, the higher the score.
    const ratio = Math.min(numA, numB) / Math.max(numA, numB);
    return Math.round(ratio * WEIGHTS.budget);
  }
  return Math.round(overlapScore(a, b) * WEIGHTS.budget);
}

/**
 * Score one experience against a decision/experience input.
 * @param {object} input { goal, category, country, budget, experienceLevel, timeAvailable }
 * @param {object} experienceDoc Experience document (category may be populated)
 * @returns {{ score: number, parts: Record<string, number> }} score is 0..100
 */
export function scoreSimilarity(input, experienceDoc) {
  const docCategory = norm(
    experienceDoc.category?.slug || experienceDoc.category?.name || experienceDoc.category
  );

  const parts = {
    goal: Math.round(overlapScore(input.goal, experienceDoc.goal) * WEIGHTS.goal),
    category:
      norm(input.category) && norm(input.category) === docCategory ? WEIGHTS.category : 0,
    country:
      norm(input.country) && norm(input.country) === norm(experienceDoc.country)
        ? WEIGHTS.country
        : 0,
    budget: budgetScore(input.budget, experienceDoc),
    experience:
      norm(input.experienceLevel) &&
      norm(input.experienceLevel) === norm(experienceDoc.startingPoint?.experienceLevel)
        ? WEIGHTS.experience
        : 0,
    time:
      norm(input.timeAvailable) &&
      norm(input.timeAvailable) === norm(experienceDoc.startingPoint?.timeAvailable)
        ? WEIGHTS.time
        : 0,
  };

  const score = Math.min(
    100,
    Object.values(parts).reduce((sum, v) => sum + v, 0)
  );
  return { score, parts };
}

/**
 * Find the most similar approved, public experiences for the given input.
 * @param {object} input Same shape as scoreSimilarity's input
 * @param {number} [limit=5]
 * @returns {Promise<Array<{ experience: object, score: number, parts: object }>>}
 */
export async function findSimilar(input, limit = 5) {
  const docs = await Experience.find({
    status: 'approved',
    privacy: { $in: ['public', 'anonymous'] },
  })
    .populate('category', 'name slug')
    .limit(200)
    .lean();

  return docs
    .map((doc) => ({ experience: doc, ...scoreSimilarity(input, doc) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

import { Experience } from '../models/Experience.js';

/**
 * Similarity scoring for "experiences like yours".
 *
 * Deterministic: same input + experience always yields the same score.
 * This is a platform-generated relevance score, not a prediction of outcomes.
 *
 * Weights (total 100): goal 30, country 15, experienceLevel 20,
 * budget 15, timeAvailable 10, skills 10.
 */

export const SIMILARITY_WEIGHTS = {
  goal: 30,
  country: 15,
  experienceLevel: 20,
  budget: 15,
  timeAvailable: 10,
  skills: 10,
};

const STOPWORDS = new Set([
  'i', 'a', 'an', 'the', 'to', 'for', 'of', 'in', 'on', 'and', 'or', 'my', 'me',
  'should', 'is', 'are', 'be', 'do', 'does', 'what', 'how', 'with', 'from',
  'at', 'as', 'by', 'it', 'its', 'this', 'that', 'while', 'full', 'time',
]);

function keywords(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Keyword overlap between the input goal and the experience's goal + title + tags (0..1). */
function goalKeywordMatch(input, experience) {
  const inputWords = new Set(keywords(input.goal));
  if (inputWords.size === 0) return 0;
  const expWords = new Set([
    ...keywords(experience.goal),
    ...keywords(experience.title),
    ...(experience.tags || []).map((t) => String(t).toLowerCase()),
  ]);
  let overlap = 0;
  for (const w of inputWords) {
    if (expWords.has(w)) overlap += 1;
  }
  return Math.min(1, overlap / Math.min(inputWords.size, 5));
}

function normLevel(level) {
  const l = String(level || '').toLowerCase();
  if (l.includes('beginner')) return 0;
  if (l.includes('intermediate')) return 1;
  if (l.includes('advanced') || l.includes('expert')) return 2;
  return -1;
}

/** Map a budget string to a coarse band so '$500' and 'PKR 200,000' compare sanely. */
function budgetBand(budget) {
  const text = String(budget || '');
  const nums = (text.match(/[\d,]+/g) || []).map((n) => Number(n.replace(/,/g, '')));
  const max = nums.length ? Math.max(...nums) : 0;
  // Rough USD normalization: values above 50,000 are almost certainly PKR/INR-scale.
  const usd = max > 50000 ? max / 280 : max;
  if (usd <= 0) return -1;
  if (usd < 500) return 0;
  if (usd <= 2000) return 1;
  return 2;
}

function hoursPerWeek(text) {
  const m = String(text || '').match(/(\d+)\s*hrs?/i);
  return m ? Number(m[1]) : -1;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function normList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
  return String(value || '')
    .split(/[,;]/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Score one experience against a decision/experience input.
 * @param {object} input { goal, country, budget, experienceLevel, timeAvailable, skills[] }
 * @param {object} experienceDoc Experience document or lean object
 * @returns {{ score: number, factors: Array<{key,label,pct,detail}> }} score is an int 0..100
 */
export function scoreSimilarity(input = {}, experienceDoc = {}) {
  const factors = [];

  // 1) Goal — keyword overlap (30 pts)
  const goalPct = Math.round(clamp01(goalKeywordMatch(input, experienceDoc)) * 100);
  factors.push({
    key: 'goal',
    label: 'Goal match',
    pct: goalPct,
    detail:
      goalPct >= 70
        ? 'Your goal closely resembles the goal of this experience.'
        : goalPct >= 40
          ? 'Some overlap between your goal and this experience.'
          : 'Different goal from this experience.',
  });

  // 2) Country (15 pts)
  const inCountry = String(input.country || '').trim().toLowerCase();
  const expCountry = String(experienceDoc.country || '').trim().toLowerCase();
  let countryPct = 50;
  if (inCountry && expCountry) countryPct = inCountry === expCountry ? 100 : 0;
  factors.push({
    key: 'country',
    label: 'Country match',
    pct: countryPct,
    detail:
      countryPct === 100
        ? `Same country (${experienceDoc.country || 'n/a'}).`
        : countryPct === 50
          ? 'Country not specified.'
          : `Different country (experience: ${experienceDoc.country || 'n/a'}).`,
  });

  // 3) Experience level (20 pts)
  const levelA = normLevel(input.experienceLevel);
  const levelB = normLevel(experienceDoc.startingPoint?.experienceLevel);
  let levelPct = 50;
  if (levelA === -1 || levelB === -1) levelPct = 50;
  else if (levelA === levelB) levelPct = 100;
  else if (Math.abs(levelA - levelB) === 1) levelPct = 60;
  else levelPct = 25;
  factors.push({
    key: 'experienceLevel',
    label: 'Experience level match',
    pct: levelPct,
    detail:
      levelPct === 100
        ? 'Same experience level.'
        : levelPct >= 50
          ? 'Nearby experience levels.'
          : 'Different experience levels.',
  });

  // 4) Budget (15 pts)
  const bandA = budgetBand(input.budget);
  const bandB = budgetBand(experienceDoc.startingPoint?.budget);
  let budgetPct = 50;
  if (bandA === -1 || bandB === -1) budgetPct = 50;
  else if (bandA === bandB) budgetPct = 100;
  else if (Math.abs(bandA - bandB) === 1) budgetPct = 55;
  else budgetPct = 20;
  factors.push({
    key: 'budget',
    label: 'Budget match',
    pct: budgetPct,
    detail:
      budgetPct === 100
        ? 'Similar budget range.'
        : budgetPct >= 50
          ? 'Budget ranges are close.'
          : 'Quite different budget ranges.',
  });

  // 5) Time available (10 pts)
  const hrsA = hoursPerWeek(input.timeAvailable);
  const hrsB = hoursPerWeek(experienceDoc.startingPoint?.timeAvailable);
  let timePct = 50;
  if (hrsA !== -1 && hrsB !== -1 && Math.max(hrsA, hrsB) > 0) {
    timePct = Math.round(30 + (Math.min(hrsA, hrsB) / Math.max(hrsA, hrsB)) * 70);
  }
  factors.push({
    key: 'timeAvailable',
    label: 'Time available match',
    pct: timePct,
    detail:
      timePct >= 80
        ? 'Similar weekly time commitment.'
        : timePct >= 50
          ? 'Somewhat similar time commitment.'
          : 'Different time commitments.',
  });

  // 6) Skills (10 pts)
  const wantSkills = normList(input.skills);
  const haveSkills = normList(experienceDoc.startingPoint?.skills);
  let skillsPct = 50;
  if (wantSkills.length && haveSkills.length) {
    const overlap = wantSkills.filter((s) => haveSkills.some((h) => h.includes(s) || s.includes(h)));
    skillsPct = Math.round((overlap.length / wantSkills.length) * 100);
  }
  factors.push({
    key: 'skills',
    label: 'Skills match',
    pct: skillsPct,
    detail:
      skillsPct >= 70
        ? 'Strong overlap with the skills you have.'
        : skillsPct >= 40
          ? 'Some shared skills.'
          : 'Different skill set from this experience.',
  });

  const score = Math.round(
    factors.reduce((sum, f) => sum + (f.pct / 100) * SIMILARITY_WEIGHTS[f.key], 0)
  );

  return { score: Math.max(0, Math.min(100, score)), factors };
}

/**
 * Score every doc in `docs` against `input`, sort desc, take the top `limit`.
 * @returns {Array<{ experience: object, score: number, factors: Array }>}
 */
export function findTopSimilar(input, docs, limit = 12) {
  return docs
    .map((doc) => ({ experience: doc, ...scoreSimilarity(input, doc) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Find the most similar approved, public/anonymous experiences for the given input.
 * @param {object} input Same shape as scoreSimilarity's input
 * @param {number} [limit=12]
 * @returns {Promise<{ results: Array<{experience, score, factors}>, totalInDataset: number }>}
 */
export async function findSimilar(input, limit = 12) {
  const docs = await Experience.find({
    status: 'approved',
    privacy: { $ne: 'private' },
  })
    .populate('category', 'name slug')
    .populate('author', 'name username country')
    .lean();

  return { results: findTopSimilar(input, docs, limit), totalInDataset: docs.length };
}

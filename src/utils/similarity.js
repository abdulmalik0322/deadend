// Similarity scoring for DEADEND.
// Deterministic: same input + experience always yields the same score.
// This is a relevance score, not a prediction of outcomes.

export const similarityDisclaimer =
  'Platform-generated relevance score. It reflects how similar two situations are \u2014 it does not predict your outcome.';

const STOPWORDS = new Set([
  'i', 'a', 'an', 'the', 'to', 'for', 'of', 'in', 'on', 'and', 'or', 'my', 'me',
  'should', 'is', 'are', 'be', 'do', 'does', 'what', 'how', 'with', 'from',
  'at', 'as', 'by', 'it', 'its', 'this', 'that', 'while', 'full', 'time',
]);

function keywords(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// Keyword overlap between goal text and the experience's goal+title+tags.
function goalKeywordMatch(input, experience) {
  const inputWords = new Set(keywords(input.goal));
  if (inputWords.size === 0) return 0;
  const expWords = new Set([
    ...keywords(experience.goal),
    ...keywords(experience.title),
    ...(experience.tags || []).map((t) => t.toLowerCase()),
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

// Map a budget string to a coarse band so '$500' and 'PKR 200,000' compare sanely.
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

/**
 * scoreSimilarity(input, experience)
 * input: { goal, country, budget, experienceLevel, timeAvailable, skills[] }
 * returns { score: 0-100 int, factors: [5 x {key,label,match,note}] }
 */
export function scoreSimilarity(input = {}, experience = {}) {
  const factors = [];

  // 1) Goal — keyword overlap (30 pts) + same category bonus (15 pts) => 45 pts
  const kwScore = goalKeywordMatch(input, experience); // 0..1
  const categoryMatch =
    input.goalCategory && experience.category
      ? String(input.goalCategory).toLowerCase() === String(experience.category).toLowerCase()
      : false;
  const goalMatch = Math.round(clamp01(kwScore * 0.75 + (categoryMatch ? 0.25 : 0)) * 100);
  factors.push({
    key: 'goal',
    label: 'Goal match',
    match: goalMatch,
    note:
      goalMatch >= 70
        ? 'Your goal closely resembles the goal of this experience.'
        : goalMatch >= 40
          ? 'Some overlap between your goal and this experience.'
          : 'Different goal from this experience.',
  });

  // 2) Country — 10 pts
  const countryMatch =
    input.country && experience.country
      ? String(input.country).toLowerCase() === String(experience.country).toLowerCase()
        ? 100
        : 0
      : 50;
  factors.push({
    key: 'country',
    label: 'Country match',
    match: countryMatch,
    note:
      countryMatch === 100
        ? `Same country (${experience.country || 'n/a'}).`
        : countryMatch === 50
          ? 'Country not specified.'
          : `Different country (experience: ${experience.country || 'n/a'}).`,
  });

  // 3) Budget — band comparison, 15 pts
  const bandA = budgetBand(input.budget);
  const bandB = budgetBand(experience.startingPoint && experience.startingPoint.budget);
  let budgetMatch = 50;
  if (bandA === -1 || bandB === -1) {
    budgetMatch = 50;
  } else if (bandA === bandB) {
    budgetMatch = 100;
  } else if (Math.abs(bandA - bandB) === 1) {
    budgetMatch = 55;
  } else {
    budgetMatch = 20;
  }
  factors.push({
    key: 'budget',
    label: 'Budget match',
    match: budgetMatch,
    note:
      budgetMatch === 100
        ? 'Similar budget range.'
        : budgetMatch >= 50
          ? 'Budget ranges are close.'
          : 'Quite different budget ranges.',
  });

  // 4) Experience level — 15 pts
  const levelA = normLevel(input.experienceLevel);
  const levelB = normLevel(experience.startingPoint && experience.startingPoint.experienceLevel);
  let levelMatch = 50;
  if (levelA === -1 || levelB === -1) {
    levelMatch = 50;
  } else if (levelA === levelB) {
    levelMatch = 100;
  } else if (Math.abs(levelA - levelB) === 1) {
    levelMatch = 60;
  } else {
    levelMatch = 25;
  }
  factors.push({
    key: 'experience',
    label: 'Experience level match',
    match: levelMatch,
    note:
      levelMatch === 100
        ? 'Same experience level.'
        : levelMatch >= 50
          ? 'Nearby experience levels.'
          : 'Different experience levels.',
  });

  // 5) Time available — 15 pts
  const hrsA = hoursPerWeek(input.timeAvailable);
  const hrsB = hoursPerWeek(experience.startingPoint && experience.startingPoint.timeAvailable);
  let timeMatch = 50;
  if (hrsA === -1 || hrsB === -1) {
    timeMatch = 50;
  } else {
    const ratio = Math.min(hrsA, hrsB) / Math.max(hrsA, hrsB);
    timeMatch = Math.round(30 + ratio * 70);
  }
  factors.push({
    key: 'time',
    label: 'Time available match',
    match: timeMatch,
    note:
      timeMatch >= 80
        ? 'Similar weekly time commitment.'
        : timeMatch >= 50
          ? 'Somewhat similar time commitment.'
          : 'Different time commitments.',
  });

  const score = Math.round(
    (goalMatch * 45 + countryMatch * 10 + budgetMatch * 15 + levelMatch * 15 + timeMatch * 15) / 100
  );

  return { score: Math.max(0, Math.min(100, score)), factors };
}

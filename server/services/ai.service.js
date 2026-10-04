import { Experience } from '../models/Experience.js';
import { scoreSimilarity } from './similarity.service.js';
import { presentExperience } from '../utils/present.js';

/**
 * AI SERVICE — rule-based, dataset-grounded (no LLM).
 *
 * analyzeDecision() scores approved+public experiences with the shared
 * similarity scorer, then summarizes ONLY what the stored records actually
 * contain (counts by outcome, most common obstacles/what-worked). It invents
 * no statistics and predicts nothing.
 *
 * structureStory() ports the keyword-heuristic extraction from the frontend
 * mock adapter (sentence splitting, money/duration/outcome regexes). It never
 * invents content: anything not found in the text stays empty.
 *
 * WHERE A REAL LLM PLUGS IN: replace the bodies below with model calls, keep
 * the exported signatures, and keep feeding the model real datasetStats —
 * never let it hallucinate platform statistics.
 *
 * GUARDRAILS: never predict an individual's outcome; label generated blocks
 * (generated: true + disclaimer); informational tone, not advisory.
 */

const DISCLAIMER =
  'Generated from patterns in experiences shared on DEADEND — a summary of ' +
  'past records, not a prediction about your decision. Treat it as one input ' +
  'among many.';

const OUTCOME_LABELS = {
  successful: 'successful',
  partially_successful: 'partially successful',
  unsuccessful: 'unsuccessful',
  abandoned: 'abandoned',
};

const RELEVANT_LIMIT = 12;
const RELATED_LIMIT = 5;

/** Count non-empty strings case-insensitively, keep first-seen casing. */
function countTexts(values) {
  const counts = new Map();
  for (const raw of values) {
    const text = String(raw || '').trim();
    if (!text) continue;
    const key = text.toLowerCase();
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { text, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
}

const topN = (entries, n) => entries.slice(0, n).map(({ text, count }) => ({ text, count }));

/**
 * Summarize what the dataset says about situations like the user's.
 * @param {object} input { goal?, country?, budget?, experienceLevel?, timeAvailable?, skills?[] }
 * @returns {Promise<{ input, datasetStats, patterns, questions, related, generated, disclaimer }>}
 */
export async function analyzeDecision(input = {}) {
  const pool = await Experience.find({
    status: 'approved',
    privacy: { $in: ['public', 'anonymous'] },
  })
    .populate('category', 'name slug')
    .populate('author', 'name username country')
    .lean();

  const top = pool
    .map((doc) => ({ doc, score: scoreSimilarity(input || {}, doc).score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, RELEVANT_LIMIT)
    .map((s) => s.doc);

  const total = top.length;

  const outcomeDistribution = {};
  for (const doc of top) {
    outcomeDistribution[doc.outcome] = (outcomeDistribution[doc.outcome] || 0) + 1;
  }

  const topObstacles = topN(
    countTexts(top.flatMap((d) => d.obstacles || [])),
    5
  );
  const topWhatWorked = topN(
    countTexts(top.flatMap((d) => d.whatWorked || [])),
    5
  );

  const datasetStats = {
    total: pool.length,
    relevant: total,
    outcomeDistribution,
    topObstacles,
    topWhatWorked,
  };

  const patterns = buildPatterns(topObstacles, topWhatWorked, outcomeDistribution, total);
  const questions = buildQuestions(topObstacles, total);
  const related = top.slice(0, RELATED_LIMIT).map((doc) => presentExperience(doc));

  return {
    input: input || {},
    datasetStats,
    patterns,
    questions,
    related,
    generated: true,
    disclaimer: DISCLAIMER,
  };
}

function buildPatterns(topObstacles, topWhatWorked, outcomeDistribution, total) {
  if (total === 0) {
    return [
      {
        title: 'Not enough data yet',
        text: 'No relevant experiences found in the dataset — generated analysis needs shared stories to summarize.',
        records: 0,
        total: 0,
      },
    ];
  }

  const patterns = [];

  // Card 1: most common obstacle, real count.
  const [obstacle] = topObstacles;
  if (obstacle) {
    patterns.push({
      title: 'Most common obstacle',
      text: `Reported in ${obstacle.count} of ${total} relevant experiences: "${obstacle.text}"`,
      records: obstacle.count,
      total,
    });
  }

  // Card 2: outcome split, real count (largest outcome group).
  const outcomeEntries = Object.entries(outcomeDistribution).sort((a, b) => b[1] - a[1]);
  const [topOutcome, topOutcomeCount] = outcomeEntries[0] || [];
  if (topOutcome) {
    const label = OUTCOME_LABELS[topOutcome] || topOutcome;
    patterns.push({
      title: 'Outcome split',
      text: `${topOutcomeCount} of ${total} relevant experiences ended ${label}.`,
      records: topOutcomeCount,
      total,
    });
  }

  // Card 3: most common what-worked, real count.
  const [worked] = topWhatWorked;
  if (worked) {
    patterns.push({
      title: 'What worked most often',
      text: `${worked.count} of ${total} relevant experiences mention: "${worked.text}"`,
      records: worked.count,
      total,
    });
  }

  return patterns;
}

function buildQuestions(topObstacles, total) {
  const templates = topObstacles.slice(0, 5).map(
    (o) =>
      `How will you handle "${o.text}"? It came up in ${o.count} of ${total} relevant experiences — plan for it before you start.`
  );

  const fallbacks = [
    'What would make you stop or pivot if things go wrong? (Generated reflection question)',
    'Who has already tried this that you could learn from? (Generated reflection question)',
    'What is the smallest version you could test first? (Generated reflection question)',
    'How much time and money can you afford to lose on this? (Generated reflection question)',
    'What would "good enough" look like after 90 days? (Generated reflection question)',
  ];

  const questions = [...templates];
  for (const fallback of fallbacks) {
    if (questions.length >= 5) break;
    questions.push(fallback);
  }
  return questions.slice(0, 5);
}

/**
 * Map free-form text into an Experience-shaped draft.
 * Ported from the frontend mock adapter's keyword heuristics:
 * sentence splitting, goal/obstacle/lesson regexes, money/duration/hours
 * extraction, outcome keyword detection. Deterministic and conservative —
 * anything not found in the text stays empty (outcome: null).
 *
 * @param {string} text Raw story text
 */
export async function structureStory(text) {
  const raw = String(text || '');
  const sentences = raw
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);

  const pick = (regex, fallback = '') => {
    const hit = sentences.find((s) => regex.test(s));
    return hit || fallback;
  };

  const goal =
    pick(/goal|wanted to|decided to|my aim|objective/i) || sentences[0] || '';

  const durationMatch = raw.match(/(\d+\s*(?:months?|weeks?|years?|days?))/i);
  const moneyMatch = raw.match(/\$[\d,]+(?:\.\d+)?/) || raw.match(/PKR\s?[\d,]+/i);
  const hoursMatch = raw.match(/(\d+)\s*hours?/i);

  const outcome = /success|worked|profit|won|achieved/i.test(raw)
    ? 'successful'
    : /fail|quit|gave up|lost|closed|abandon/i.test(raw)
      ? 'unsuccessful'
      : null;

  const actions = sentences
    .filter((s) =>
      /^(i|we)\s+(built|started|launched|created|spent|applied|joined|moved|learned|tried|ran|hired)/i.test(s)
    )
    .slice(0, 5);

  const obstacles = sentences
    .filter((s) => /hard|difficult|struggl|problem|challenge|obstacle|issue|failed/i.test(s))
    .slice(0, 4);
  const lessons = sentences
    .filter((s) => /learn|lesson|realiz|wish|should have|could have/i.test(s))
    .slice(0, 4);

  // LLM PLUG-IN POINT: replace this heuristic mapping with a model call that
  // extracts the same fields from `text`. Keep generated: true and never
  // invent content the text does not contain.
  return {
    goal,
    startingPoint: {
      education: '',
      experienceLevel: '',
      budget: moneyMatch ? moneyMatch[0] : '',
      timeAvailable: hoursMatch ? `${hoursMatch[1]} hrs/week` : '',
      location: '',
      skills: [],
    },
    timeline: actions.map((a, i) => ({ label: `Step ${i + 1}`, text: a })),
    investment: {
      money: moneyMatch ? moneyMatch[0] : '',
      time: durationMatch
        ? durationMatch[1]
        : hoursMatch
          ? `${hoursMatch[1]} hours`
          : '',
      tools: [],
    },
    outcome,
    obstacles,
    lessons,
    doDifferently: [],
    generated: true,
  };
}

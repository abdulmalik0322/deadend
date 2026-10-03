/**
 * AI SERVICE — documented STUB.
 *
 * Current behavior is HONEST dataset-statistics summarization:
 *  - analyzeDecision() only reports what the stored experiences actually contain
 *    (counts by outcome, most common obstacles/lessons) using the `datasetStats`
 *    passed in by the caller. It invents no statistics and predicts nothing.
 *  - structureStory() deterministically maps free text into the Experience
 *    schema shape without inventing facts; every field is a suggestion the
 *    user must review.
 *
 * WHERE A REAL LLM PLUGS IN:
 *  - Replace the body of analyzeDecision() with a call to your LLM provider
 *    (e.g. OpenAI / Anthropic / a local model). Keep the exported signature:
 *      analyzeDecision(input, datasetStats) -> Promise<object>
 *  - Replace the body of structureStory() the same way:
 *      structureStory(text) -> Promise<object>
 *  Feed the LLM the same `datasetStats` object — never let it hallucinate
 *  platform statistics from thin air.
 *
 * GUARDRAILS (apply to any real implementation):
 *  1. NEVER predict an individual's outcome ("you will succeed/fail").
 *  2. Label every AI-generated block in the UI and set `aiGenerated: true`
 *     in every payload this service returns.
 *  3. Never invent statistics — summarize only the provided datasetStats.
 *  4. Keep the tone informational, not advisory; help the user weigh
 *     tradeoffs instead of telling them what to decide.
 *  5. Keep scope to decision reflection; refuse unrelated or disallowed content.
 */

const DISCLAIMER =
  'This is a summary of past experiences shared on DEADEND, not a prediction ' +
  'about your decision. Treat it as one input among many.';

/**
 * Summarize what the dataset says about situations like the user's.
 * @param {object} input The user's decision input (goal, category, country, ...)
 * @param {object} datasetStats { total, byOutcome, topObstacles, topLessons }
 */
export async function analyzeDecision(input, datasetStats) {
  const { total = 0, byOutcome = {}, topObstacles = [], topLessons = [] } = datasetStats || {};

  const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const successful = byOutcome.successful || 0;
  const partial = byOutcome.partially_successful || 0;
  const unsuccessful = byOutcome.unsuccessful || 0;
  const abandoned = byOutcome.abandoned || 0;

  const summary =
    total === 0
      ? 'We do not have enough shared experiences yet to summarize outcomes for a situation like this.'
      : `Among ${total} similar shared experience${total === 1 ? '' : 's'} in our dataset, ` +
        `${pct(successful)}% reported success, ${pct(partial)}% partial success, ` +
        `${pct(unsuccessful)}% were unsuccessful and ${pct(abandoned)}% were abandoned. ` +
        'Read the individual stories before drawing conclusions — averages hide the details that matter.';

  // LLM PLUG-IN POINT: replace the object below with model-generated prose,
  // still grounded ONLY in datasetStats, still carrying aiGenerated + disclaimer.
  return {
    aiGenerated: true,
    summary,
    dataset: { total, byOutcome: { successful, partially_successful: partial, unsuccessful, abandoned } },
    commonObstacles: topObstacles,
    commonLessons: topLessons,
    disclaimer: DISCLAIMER,
  };
}

/**
 * Map free-form text into an Experience-shaped draft.
 * Deterministic and conservative: it never invents content, it only
 * suggests field placements the user reviews before saving.
 * @param {string} text Raw story text
 */
export async function structureStory(text) {
  const paragraphs = String(text || '')
    .split(/\n{2,}|\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const [first, ...rest] = paragraphs;

  // LLM PLUG-IN POINT: replace this heuristic mapping with a model call that
  // extracts the fields below from `text`. Still mark aiGenerated: true and
  // keep every field reviewable — the user, not the model, publishes.
  return {
    aiGenerated: true,
    draft: {
      title: first ? first.slice(0, 160) : '',
      description: paragraphs.join('\n\n'),
      goal: '',
      outcome: '',
      mainObstacle: '',
      obstacles: [],
      whatWorked: [],
      lessons: [],
      doDifferently: [],
      tags: [],
    },
    note:
      'Draft generated from your text. Review and edit every field before saving — ' +
      'nothing here is published automatically.',
    unusedParagraphs: rest.length,
  };
}

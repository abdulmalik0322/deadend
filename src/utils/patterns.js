// Dataset-derived pattern computation for DEADEND.
//
// Everything returned here is computed from the actual experience records
// passed in — no invented multipliers, no fabricated totals. Counts are
// honest: "Reported in X of N documented experiences".

// Obstacle themes: keyword buckets. An experience counts once per theme if
// any of its obstacle strings matches one of the theme's keywords.
export const OBSTACLE_THEMES = [
  {
    label: 'Finding customers or clients',
    keywords: ['client', 'customer', 'acquisition', 'signup', 'sign-up', 'audience', 'subscriber', 'sales', 'orders', 'paying users'],
  },
  {
    label: 'Money pressure',
    keywords: ['cost', 'margin', 'budget', 'revenue', 'profit', 'expense', 'income', 'salary', 'pay cut', 'refund', 'cash', 'ad '],
  },
  {
    label: 'Time and consistency',
    keywords: ['burnout', 'consistent', 'consistency', 'schedule', 'hours', 'time-zone', 'loneliness', 'motivation'],
  },
  {
    label: 'Competition and market',
    keywords: ['competitor', 'competition', 'market', 'cheaper', 'saturated', 'identical products'],
  },
  {
    label: 'Logistics and operations',
    keywords: ['shipping', 'delivery', 'supplier', 'inventory', 'logistics', 'support load', 'returns'],
  },
];

// "What worked" themes, same counting rule.
export const WORKED_THEMES = [
  {
    label: 'Talking to real users before committing',
    keywords: ['interview', 'pre-launch', 'feedback', 'survey', 'asked', 'volunteering', 'shadowing', 'meetup', 'market research'],
  },
  {
    label: 'Narrowing focus to one niche',
    keywords: ['niche', 'narrow', 'killing', 'focused', 'repeatable format', 'standing orders', 'two winners'],
  },
  {
    label: 'Charging properly from the start',
    keywords: ['charg', 'pric', 'annual billing', 'paid', 'raise', 'price'],
  },
  {
    label: 'Shipping something small fast',
    keywords: ['shipped', 'launched', 'mvp', 'prototype', 'published', 'testing', 'pre-orders'],
  },
];

export function themeCounts(experiences, field, themes) {
  return themes
    .map((theme) => ({
      label: theme.label,
      count: experiences.filter((e) =>
        (e[field] || []).some((text) =>
          theme.keywords.some((k) => String(text).toLowerCase().includes(k))
        )
      ).length,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function outcomeDistribution(experiences) {
  const dist = { successful: 0, partially_successful: 0, unsuccessful: 0, abandoned: 0 };
  experiences.forEach((e) => {
    if (dist[e.outcome] !== undefined) dist[e.outcome] += 1;
  });
  return dist;
}

// Three genuinely different cards, each derived from real frequencies in the
// given records: most common obstacle theme, outcome distribution, and most
// common "what worked" theme.
export function computePatterns(experiences) {
  const total = experiences.length;
  const obstacles = themeCounts(experiences, 'obstacles', OBSTACLE_THEMES);
  const worked = themeCounts(experiences, 'whatWorked', WORKED_THEMES);
  const dist = outcomeDistribution(experiences);
  const reached = dist.successful + dist.partially_successful;
  const topObstacle = obstacles[0] || { label: 'Obstacles', count: 0 };
  const topWorked = worked[0] || { label: 'Small experiments', count: 0 };

  const cards = [
    {
      title: `${topObstacle.label} is the most common obstacle`,
      text: `Reported in ${topObstacle.count} of ${total} documented experiences.`,
      meta: 'Computed from obstacle frequencies across the available experiences',
    },
    {
      title: `${reached} of ${total} documented experiences reached a successful or partially successful outcome`,
      text:
        `${dist.successful} successful · ${dist.partially_successful} partially successful · ` +
        `${dist.unsuccessful} unsuccessful · ${dist.abandoned} abandoned — among the available experiences.`,
      meta: 'Computed from outcome frequencies across the available experiences',
    },
    {
      title: `What worked most often: ${topWorked.label.charAt(0).toLowerCase()}${topWorked.label.slice(1)}`,
      text: `Cited in the “what worked” notes of ${topWorked.count} of ${total} documented experiences.`,
      meta: 'Computed from “what worked” frequencies across the available experiences',
    },
  ];
  return { total, cards };
}

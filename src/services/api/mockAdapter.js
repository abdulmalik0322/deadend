// DEADEND mock API adapter.
// Implements the full API contract over seed data + localStorage persistence.
// Every function simulates 150-400ms of network latency.

import {
  users as seedUsers,
  experiences as seedExperiences,
  decisions as seedDecisions,
  categories as seedCategories,
  comments as seedComments,
  notifications as seedNotifications,
  folders as seedFolders,
} from '../../data/seed.js';
import { scoreSimilarity } from '../../utils/similarity.js';

const STORE_KEY = 'deadend_v1';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const latency = () => delay(150 + Math.random() * 250);

function defaultStore() {
  return {
    sessionUserId: null,
    users: [],
    experiences: [],
    decisions: [],
    comments: [],
    deletedCommentIds: [],
    commentLikes: {},
    commentLikeDeltas: {},
    saves: [],
    saveDeltas: {},
    folders: [],
    drafts: {},
    readNotifications: [],
    reports: [],
    resolvedReports: {},
    suspended: [],
    expStatus: {},
    rejectionNotes: {},
    deletedDecisionIds: [],
    categories: [],
  };
}

function loadStore() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORE_KEY) : null;
    if (raw) return { ...defaultStore(), ...JSON.parse(raw) };
  } catch (e) {
    // corrupted or unavailable storage -> start fresh
  }
  return defaultStore();
}

function saveStore(store) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) {
    // storage unavailable; continue in-memory
  }
  return store;
}

function updateStore(mutator) {
  const store = loadStore();
  mutator(store);
  return saveStore(store);
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
function allUsers(store) {
  const localIds = new Set(store.users.map((u) => u.id));
  return [...seedUsers.filter((u) => !localIds.has(u.id)), ...store.users];
}

function publicUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}

function sessionUser(store) {
  if (!store.sessionUserId) return null;
  const u = allUsers(store).find((x) => x.id === store.sessionUserId);
  if (!u || store.suspended.includes(u.id)) return null;
  return u;
}

function unauthenticated(message = 'Please sign in') {
  const err = new Error(message);
  err.code = 'UNAUTHENTICATED';
  return err;
}

function requireAuth(store) {
  const u = sessionUser(store);
  if (!u) throw unauthenticated();
  return u;
}

function requireAdmin(store) {
  const u = requireAuth(store);
  if (u.role !== 'admin') {
    const err = new Error('Admin access required');
    err.code = 'FORBIDDEN';
    throw err;
  }
  return u;
}

// ---------------------------------------------------------------------------
// Experience helpers
// ---------------------------------------------------------------------------
function mergedExperiences(store) {
  const localById = {};
  store.experiences.forEach((e) => {
    localById[e.id] = e;
  });
  const base = seedExperiences.map((e) => {
    const local = localById[e.id];
    const merged = local ? { ...e, ...local } : { ...e };
    if (store.expStatus[e.id] && !(local && local.status)) merged.status = store.expStatus[e.id];
    return merged;
  });
  const extra = store.experiences.filter((e) => !seedExperiences.some((s) => s.id === e.id));
  return base.concat(extra);
}

function visibleExperiences(store, user) {
  return mergedExperiences(store).filter(
    (e) => e.status === 'approved' || (user && e.authorId === user.id)
  );
}

function effectiveSaves(store, exp) {
  return (exp.stats?.saves || 0) + (store.saveDeltas[exp.id] || 0);
}

function withEffectiveStats(store, exp) {
  return { ...exp, stats: { ...(exp.stats || {}), saves: effectiveSaves(store, exp) } };
}

function authorOf(store, authorId, privacy) {
  if (privacy === 'anonymous') {
    return {
      id: 'anonymous',
      name: 'Anonymous',
      username: 'anonymous',
      country: '',
      bio: 'This contributor chose to stay anonymous.',
      publicProfile: false,
      stats: { experiences: 0, decisionsCompleted: 0, contributions: 0 },
    };
  }
  const u = allUsers(store).find((x) => x.id === authorId);
  return publicUser(u) || { id: authorId, name: 'Unknown contributor', username: 'unknown' };
}

function ensureLocalExperience(store, id) {
  let local = store.experiences.find((e) => e.id === id);
  if (!local) {
    const seed = seedExperiences.find((e) => e.id === id);
    if (!seed) return null;
    local = { ...seed };
    store.experiences.push(local);
  }
  return local;
}

function checkExperienceAccess(store, exp, user) {
  if (!exp) {
    const err = new Error('Experience not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (exp.status !== 'approved' && (!user || exp.authorId !== user.id) && user?.role !== 'admin') {
    const err = new Error('Experience not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return exp;
}

function slugify(title) {
  return (
    String(title || 'untitled')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .slice(0, 60) || 'untitled'
  );
}

// ---------------------------------------------------------------------------
// Stats / discovery
// ---------------------------------------------------------------------------
export async function getStats() {
  await latency();
  const store = loadStore();
  const exps = mergedExperiences(store);
  const decs = mergedDecisions(store);
  return {
    experiences: exps.filter((e) => e.status === 'approved').length,
    decisions: decs.length,
    contributors: new Set(exps.map((e) => e.authorId)).size,
    countries: new Set(exps.map((e) => e.country).filter(Boolean)).size,
  };
}

export async function searchExperiences(query, { limit = 6 } = {}) {
  await latency();
  const store = loadStore();
  const user = sessionUser(store);
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const items = visibleExperiences(store, user)
    .filter((e) => {
      const hay = [e.title, e.goal, e.categoryLabel, e.description, ...(e.tags || [])]
        .join(' ')
        .toLowerCase();
      return q.split(/\s+/).every((word) => hay.includes(word));
    })
    .slice(0, limit)
    .map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      categoryLabel: e.categoryLabel,
      outcome: e.outcome,
    }));
  return items;
}

const SORT_FNS = {
  relevant: (a, b) => (b.stats?.views || 0) - (a.stats?.views || 0),
  recent: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  discussed: (a, b) => (b.stats?.comments || 0) - (a.stats?.comments || 0),
  saved: (a, b) => (b.stats?.saves || 0) - (a.stats?.saves || 0),
};

export async function listExperiences({ filters = {}, sort = 'relevant', page = 1, perPage = 9 } = {}) {
  await latency();
  const store = loadStore();
  const user = sessionUser(store);
  let items = visibleExperiences(store, user);

  if (filters.category) items = items.filter((e) => e.category === filters.category);
  if (filters.country) items = items.filter((e) => e.country === filters.country);
  if (filters.outcome) items = items.filter((e) => e.outcome === filters.outcome);
  if (filters.budget)
    items = items.filter((e) =>
      String(e.startingPoint?.budget || '').toLowerCase().includes(String(filters.budget).toLowerCase())
    );
  if (filters.experienceLevel)
    items = items.filter((e) => e.startingPoint?.experienceLevel === filters.experienceLevel);
  if (filters.timeAvailable)
    items = items.filter((e) => e.startingPoint?.timeAvailable === filters.timeAvailable);
  if (filters.skills && filters.skills.length)
    items = items.filter((e) =>
      (e.startingPoint?.skills || []).some((s) => filters.skills.includes(s))
    );
  if (filters.tags && filters.tags.length)
    items = items.filter((e) => (e.tags || []).some((t) => filters.tags.includes(t)));
  if (filters.q) {
    const q = String(filters.q).trim().toLowerCase();
    items = items.filter((e) =>
      [e.title, e.description, e.goal, e.categoryLabel, ...(e.tags || [])]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }

  const sortFn = SORT_FNS[sort] || SORT_FNS.relevant;
  items = [...items].sort(sortFn);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paged = items
    .slice((safePage - 1) * perPage, safePage * perPage)
    .map((e) => withEffectiveStats(store, e));

  return { items: paged, total, page: safePage, totalPages };
}

export async function getExperience(slug) {
  await latency();
  const store = loadStore();
  const user = sessionUser(store);
  const exp = mergedExperiences(store).find((e) => e.slug === slug);
  checkExperienceAccess(store, exp, user);
  return {
    ...withEffectiveStats(store, exp),
    author: authorOf(store, exp.authorId, exp.privacy),
  };
}

// ---------------------------------------------------------------------------
// Experience mutations
// ---------------------------------------------------------------------------
export async function createExperience(data) {
  await latency();
  const store = updateStore(() => {});
  const user = requireAuth(store);
  const now = new Date().toISOString();
  const exp = {
    id: `e-local-${Date.now()}`,
    slug: `${slugify(data.title)}-${Date.now().toString(36)}`,
    title: data.title || 'Untitled experience',
    category: data.category || 'other',
    categoryLabel: data.categoryLabel || 'Other',
    country: data.country || user.country || '',
    goal: data.goal || '',
    duration: data.duration || '',
    investmentDisplay: data.investmentDisplay || data.investment?.money || '',
    outcome: data.outcome || 'abandoned',
    mainObstacle: data.mainObstacle || '',
    description: data.description || '',
    tags: data.tags || [],
    privacy: data.privacy || 'public',
    status: 'pending',
    authorId: user.id,
    createdAt: now,
    stats: { views: 0, saves: 0, comments: 0 },
    startingPoint: data.startingPoint || {
      education: '',
      experienceLevel: '',
      budget: '',
      timeAvailable: '',
      location: '',
      skills: [],
    },
    timeline: data.timeline || [],
    investment: data.investment || { money: '', time: '', tools: [] },
    obstacles: data.obstacles || [],
    whatWorked: data.whatWorked || [],
    lessons: data.lessons || [],
    doDifferently: data.doDifferently || [],
  };
  updateStore((s) => {
    s.experiences.push(exp);
  });
  return { ...exp, author: authorOf(store, user.id, exp.privacy) };
}

export async function updateExperience(id, data) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  const exp = mergedExperiences(store).find((e) => e.id === id);
  checkExperienceAccess(store, exp, user);
  if (exp.authorId !== user.id && user.role !== 'admin') {
    const err = new Error('You can only edit your own experiences');
    err.code = 'FORBIDDEN';
    throw err;
  }
  const updated = updateStore((s) => {
    const local = ensureLocalExperience(s, id);
    Object.assign(local, data, { id: local.id, authorId: local.authorId, slug: local.slug });
  });
  const next = mergedExperiences(updated).find((e) => e.id === id);
  return withEffectiveStats(updated, next);
}

export async function deleteExperience(id) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  const exp = mergedExperiences(store).find((e) => e.id === id);
  checkExperienceAccess(store, exp, user);
  if (exp.authorId !== user.id && user.role !== 'admin') {
    const err = new Error('You can only delete your own experiences');
    err.code = 'FORBIDDEN';
    throw err;
  }
  updateStore((s) => {
    s.experiences = s.experiences.filter((e) => e.id !== id);
    if (seedExperiences.some((e) => e.id === id)) s.expStatus[id] = 'rejected';
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Saves & folders
// ---------------------------------------------------------------------------
export async function saveExperience(id, folderId = null) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  const exp = mergedExperiences(store).find((e) => e.id === id);
  checkExperienceAccess(store, exp, user);
  const existing = store.saves.find((s) => s.experienceId === id);
  if (existing) {
    if (folderId !== undefined && folderId !== null) {
      updateStore((s) => {
        s.saves.find((x) => x.experienceId === id).folderId = folderId;
      });
    }
    return { ok: true, saved: true };
  }
  updateStore((s) => {
    s.saves.push({ experienceId: id, folderId, savedAt: new Date().toISOString() });
    s.saveDeltas[id] = (s.saveDeltas[id] || 0) + 1;
  });
  return { ok: true, saved: true };
}

export async function unsaveExperience(id) {
  await latency();
  const store = loadStore();
  requireAuth(store);
  const had = store.saves.some((s) => s.experienceId === id);
  updateStore((s) => {
    s.saves = s.saves.filter((x) => x.experienceId !== id);
    if (had) s.saveDeltas[id] = Math.max(0, (s.saveDeltas[id] || 0) - 1);
  });
  return { ok: true, saved: false };
}

export async function listSaved({ folderId, q } = {}) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  let saves = store.saves;
  if (folderId) saves = saves.filter((s) => s.folderId === folderId);
  let items = saves
    .map((s) => {
      const exp = mergedExperiences(store).find((e) => e.id === s.experienceId);
      if (!exp || exp.status !== 'approved') return null;
      return { ...withEffectiveStats(store, exp), folderId: s.folderId, savedAt: s.savedAt };
    })
    .filter(Boolean);
  if (q) {
    const needle = String(q).trim().toLowerCase();
    items = items.filter((e) => [e.title, e.categoryLabel, ...(e.tags || [])].join(' ').toLowerCase().includes(needle));
  }
  return items;
}

export async function listFolders() {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  const mine = [
    ...seedFolders.filter((f) => f.userId === user.id),
    ...store.folders.filter((f) => f.userId === user.id),
  ];
  return mine.map((f) => ({
    ...f,
    count: store.saves.filter((s) => s.folderId === f.id).length || f.count || 0,
  }));
}

export async function createFolder(name) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  const folder = {
    id: `f-local-${Date.now()}`,
    userId: user.id,
    name: String(name || 'Untitled folder').slice(0, 60),
    count: 0,
  };
  updateStore((s) => {
    s.folders.push(folder);
  });
  return folder;
}

export async function updateFolder(id, name) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  const folder = [...seedFolders, ...store.folders].find((f) => f.id === id && f.userId === user.id);
  if (!folder) {
    const err = new Error('Folder not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  updateStore((s) => {
    let local = s.folders.find((f) => f.id === id);
    if (!local) {
      local = { ...folder };
      s.folders.push(local);
    }
    local.name = String(name || local.name).slice(0, 60);
  });
  return { ...folder, name: String(name || folder.name).slice(0, 60) };
}

export async function deleteFolder(id) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  const folder = [...seedFolders, ...store.folders].find((f) => f.id === id && f.userId === user.id);
  if (!folder) {
    const err = new Error('Folder not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  updateStore((s) => {
    s.folders = s.folders.filter((f) => f.id !== id);
    s.saves.forEach((sv) => {
      if (sv.folderId === id) sv.folderId = null;
    });
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------
function mergedComments(store) {
  const base = seedComments.filter((c) => !store.deletedCommentIds.includes(c.id));
  return base.concat(store.comments);
}

function withCommentMeta(store, comment) {
  const likes = (comment.likes || 0) + (store.commentLikeDeltas[comment.id] || 0);
  return {
    ...comment,
    likes,
    likedByMe: !!store.commentLikes[comment.id],
    author: authorOf(store, comment.authorId, 'public'),
    replies: (comment.replies || []).map((r) => ({
      ...r,
      likes: (r.likes || 0) + (store.commentLikeDeltas[r.id] || 0),
      likedByMe: !!store.commentLikes[r.id],
      author: authorOf(store, r.authorId, 'public'),
    })),
  };
}

export async function listComments(experienceId) {
  await latency();
  const store = loadStore();
  return mergedComments(store)
    .filter((c) => c.experienceId === experienceId)
    .map((c) => withCommentMeta(store, c));
}

export async function addComment(experienceId, body) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  if (!String(body || '').trim()) {
    const err = new Error('Comment body is required');
    err.code = 'VALIDATION';
    throw err;
  }
  const comment = {
    id: `c-local-${Date.now()}`,
    experienceId,
    authorId: user.id,
    body: String(body).trim().slice(0, 2000),
    createdAt: new Date().toISOString(),
    likes: 0,
    replies: [],
    likedByMe: false,
  };
  const next = updateStore((s) => {
    s.comments.push(comment);
    const local = ensureLocalExperience(s, experienceId);
    if (local) local.stats = { ...local.stats, comments: (local.stats?.comments || 0) + 1 };
  });
  return withCommentMeta(next, comment);
}

export async function replyComment(commentId, body) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  if (!String(body || '').trim()) {
    const err = new Error('Reply body is required');
    err.code = 'VALIDATION';
    throw err;
  }
  const reply = {
    id: `r-local-${Date.now()}`,
    authorId: user.id,
    body: String(body).trim().slice(0, 2000),
    createdAt: new Date().toISOString(),
    likes: 0,
  };
  let parent = null;
  const next = updateStore((s) => {
    parent =
      s.comments.find((c) => c.id === commentId) ||
      seedComments.find((c) => c.id === commentId && !s.deletedCommentIds.includes(c.id));
    if (!parent) return;
    if (s.comments.some((c) => c.id === commentId)) {
      s.comments.find((c) => c.id === commentId).replies.push(reply);
    } else {
      const local = { ...parent, replies: [...(parent.replies || []), reply] };
      s.comments.push(local);
      s.deletedCommentIds.push(commentId);
    }
  });
  if (!parent) {
    const err = new Error('Comment not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return { ...reply, likedByMe: false, author: authorOf(next, user.id, 'public') };
}

export async function likeComment(id) {
  await latency();
  const store = loadStore();
  requireAuth(store);
  const exists =
    mergedComments(store).some((c) => c.id === id) ||
    mergedComments(store).some((c) => (c.replies || []).some((r) => r.id === id));
  if (!exists) {
    const err = new Error('Comment not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const liked = !store.commentLikes[id];
  const next = updateStore((s) => {
    if (liked) {
      s.commentLikes[id] = true;
      s.commentLikeDeltas[id] = (s.commentLikeDeltas[id] || 0) + 1;
    } else {
      delete s.commentLikes[id];
      s.commentLikeDeltas[id] = (s.commentLikeDeltas[id] || 0) - 1;
    }
  });
  void next;
  return { ok: true, liked };
}

export async function deleteComment(id) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  const comment = mergedComments(store).find((c) => c.id === id);
  if (!comment) {
    const err = new Error('Comment not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (comment.authorId !== user.id && user.role !== 'admin') {
    const err = new Error('You can only delete your own comments');
    err.code = 'FORBIDDEN';
    throw err;
  }
  updateStore((s) => {
    s.comments = s.comments.filter((c) => c.id !== id);
    if (seedComments.some((c) => c.id === id)) s.deletedCommentIds.push(id);
  });
  return { ok: true };
}

export async function reportContent(targetType, targetId, reason) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  const report = {
    id: `rep-${Date.now()}`,
    targetType,
    targetId,
    reason: String(reason || '').slice(0, 500),
    reporterId: user.id,
    createdAt: new Date().toISOString(),
    status: 'open',
  };
  updateStore((s) => {
    s.reports.push(report);
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Similarity & AI analysis
// ---------------------------------------------------------------------------
export async function findSimilar(input) {
  await latency();
  const store = loadStore();
  const user = sessionUser(store);
  const pool = visibleExperiences(store, user);
  const scored = pool
    .map((experience) => {
      const { score, factors } = scoreSimilarity(input, experience);
      return { experience: withEffectiveStats(store, experience), score, factors };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  return { results: scored, totalInDataset: pool.length };
}

export async function aiAnalyzeDecision(input) {
  await latency();
  const { results, totalInDataset } = await findSimilar(input);
  const top = results.slice(0, 6);

  // Aggregate obstacles across the most similar records.
  const obstacleCounts = new Map();
  top.forEach(({ experience }) => {
    (experience.obstacles || []).forEach((text) => {
      const key = String(text).trim();
      if (!key) return;
      obstacleCounts.set(key, (obstacleCounts.get(key) || 0) + 1);
    });
  });
  const obstacles = [...obstacleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([text, count]) => ({ text, count }));

  // Patterns, phrased against real counts only.
  const records = top.length;
  const outcomes = { successful: 0, partially_successful: 0, unsuccessful: 0, abandoned: 0 };
  top.forEach(({ experience }) => {
    if (outcomes[experience.outcome] !== undefined) outcomes[experience.outcome] += 1;
  });
  const reached = outcomes.successful + outcomes.partially_successful;
  const patterns = [
    {
      title: 'Client and customer acquisition is the most common bottleneck',
      detail: `Appears in ${obstacles.length ? obstacles[0].count : 0} of ${records} most similar records.`,
      records,
    },
    {
      title: `${reached} of ${records} similar journeys reached a successful or partially successful outcome`,
      detail: `Based on the ${records} most similar available records out of ${totalInDataset} in the dataset.`,
      records,
    },
    {
      title: 'Underestimating time-to-first-result is a repeated theme',
      detail: `Mentioned across ${top.filter(({ experience }) =>
        (experience.lessons || []).join(' ').toLowerCase().includes('month')
      ).length} of ${records} most similar records.`,
      records,
    },
  ];

  const questions = [
    'What is the smallest version of this you could test in 30 days?',
    'How many months of expenses do you have if this earns nothing at first?',
    'What would make you stop or change direction, decided in advance?',
    'Who has done this with your budget and time constraints, and what did they do differently?',
    'What is your plan for the first 10 customers, clients, or users — by name?',
  ];

  const relatedExperiences = results.slice(0, 4).map(({ experience, score }) => ({
    id: experience.id,
    slug: experience.slug,
    title: experience.title,
    categoryLabel: experience.categoryLabel,
    outcome: experience.outcome,
    score,
  }));

  const summary =
    `Based on ${records} similar records, the most frequent obstacle is ` +
    `${obstacles.length ? `"${obstacles[0].text}"` : 'inconsistent client acquisition'}. ` +
    `About ${records ? Math.round((reached / records) * 100) : 0}% of similar journeys report a successful or partially successful outcome. ` +
    `Use these patterns to set expectations — they describe what happened to others, not what will happen to you.`;

  return {
    relevantCount: totalInDataset,
    obstacles,
    patterns,
    questions,
    relatedExperiences,
    summary,
  };
}

export async function structureStory(text) {
  await latency();
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
      : '';

  const actions = sentences
    .filter((s) => /^(i|we)\s+(built|started|launched|created|spent|applied|joined|moved|learned|tried|ran|hired)/i.test(s))
    .slice(0, 5);

  const obstacles = sentences.filter((s) => /hard|difficult|struggl|problem|challenge|obstacle|issue|failed/i.test(s)).slice(0, 4);
  const lessons = sentences.filter((s) => /learn|lesson|realiz|wish|should have|could have/i.test(s)).slice(0, 4);

  return {
    aiStructured: true,
    goal,
    startingPoint: {
      education: '',
      experienceLevel: '',
      budget: moneyMatch ? moneyMatch[0] : '',
      timeAvailable: hoursMatch ? `${hoursMatch[1]} hrs/week` : '',
      location: '',
      skills: [],
    },
    actions,
    duration: durationMatch ? durationMatch[1] : '',
    investment: moneyMatch ? moneyMatch[0] : '',
    outcome,
    obstacles,
    lessons,
  };
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------
function mergedDecisions(store) {
  const localById = {};
  store.decisions.forEach((d) => {
    localById[d.id] = d;
  });
  const base = seedDecisions
    .filter((d) => !store.deletedDecisionIds.includes(d.id))
    .map((d) => (localById[d.id] ? { ...d, ...localById[d.id] } : { ...d }));
  const extra = store.decisions.filter((d) => !seedDecisions.some((s) => s.id === d.id));
  return base.concat(extra);
}

function ensureLocalDecision(store, id) {
  let local = store.decisions.find((d) => d.id === id);
  if (!local) {
    const seed = seedDecisions.find((d) => d.id === id && !store.deletedDecisionIds.includes(d.id));
    if (!seed) return null;
    local = JSON.parse(JSON.stringify(seed));
    store.decisions.push(local);
  }
  return local;
}

function checkDecisionAccess(store, decision, user) {
  if (!decision) {
    const err = new Error('Decision not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (decision.authorId !== user.id && user.role !== 'admin') {
    const err = new Error('Decision not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return decision;
}

function defaultDecisionTimeline(createdAt) {
  const date = createdAt ? createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const stages = ['Decision Created', 'Research', 'Started', '30 Days', '90 Days', '6 Months', 'Final Outcome'];
  return stages.map((stage, i) => ({
    stage,
    date: i === 0 ? date : null,
    note: i === 0 ? 'Decision created.' : '',
    done: i === 0,
  }));
}

export async function listDecisions() {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  return mergedDecisions(store)
    .filter((d) => d.authorId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getDecision(id) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  const decision = mergedDecisions(store).find((d) => d.id === id);
  return checkDecisionAccess(store, decision, user);
}

export async function createDecision(data) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  const now = new Date().toISOString();
  const decision = {
    id: `D-${10482 + Math.floor(Math.random() * 400)}`,
    title: data.title || 'Untitled decision',
    question: data.question || data.title || 'Untitled decision',
    status: 'planning',
    createdAt: now,
    progress: 0,
    authorId: user.id,
    situation: {
      location: data.situation?.location || user.country || '',
      education: data.situation?.education || '',
      experience: data.situation?.experience || '',
      budget: data.situation?.budget || '',
      timeAvailable: data.situation?.timeAvailable || '',
      skills: data.situation?.skills || [],
    },
    expectations: {
      duration: data.expectations?.duration || '',
      investment: data.expectations?.investment || '',
      expectedResult: data.expectations?.expectedResult || '',
      goal: data.expectations?.goal || '',
    },
    actual: null,
    timeline: defaultDecisionTimeline(now),
    milestones: [],
    updates: [],
  };
  updateStore((s) => {
    s.decisions.push(decision);
  });
  return decision;
}

export async function updateDecision(id, data) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  const decision = mergedDecisions(store).find((d) => d.id === id);
  checkDecisionAccess(store, decision, user);
  const next = updateStore((s) => {
    const local = ensureLocalDecision(s, id);
    const { id: _id, authorId: _a, createdAt: _c, ...rest } = data || {};
    Object.assign(local, rest);
  });
  return mergedDecisions(next).find((d) => d.id === id);
}

export async function addDecisionUpdate(id, { text, stage } = {}) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  const decision = mergedDecisions(store).find((d) => d.id === id);
  checkDecisionAccess(store, decision, user);
  const update = {
    id: `du-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    text: String(text || '').slice(0, 2000),
    ...(stage ? { stage } : {}),
  };
  const next = updateStore((s) => {
    ensureLocalDecision(s, id).updates.push(update);
  });
  return mergedDecisions(next).find((d) => d.id === id);
}

export async function addMilestone(id, { title, dueDate } = {}) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  const decision = mergedDecisions(store).find((d) => d.id === id);
  checkDecisionAccess(store, decision, user);
  const milestone = {
    id: `m-${Date.now()}`,
    title: String(title || 'Untitled milestone').slice(0, 120),
    done: false,
    dueDate: dueDate || null,
  };
  const next = updateStore((s) => {
    ensureLocalDecision(s, id).milestones.push(milestone);
  });
  return mergedDecisions(next).find((d) => d.id === id);
}

export async function toggleMilestone(decisionId, milestoneId) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  const decision = mergedDecisions(store).find((d) => d.id === decisionId);
  checkDecisionAccess(store, decision, user);
  const next = updateStore((s) => {
    const local = ensureLocalDecision(s, decisionId);
    const m = local.milestones.find((x) => x.id === milestoneId);
    if (m) m.done = !m.done;
  });
  return mergedDecisions(next).find((d) => d.id === decisionId);
}

export async function completeDecision(id, actual) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  const decision = mergedDecisions(store).find((d) => d.id === id);
  checkDecisionAccess(store, decision, user);
  const next = updateStore((s) => {
    const local = ensureLocalDecision(s, id);
    local.status = 'completed';
    local.progress = 100;
    local.actual = {
      duration: actual?.duration || '',
      investment: actual?.investment || '',
      result: actual?.result || '',
    };
    local.timeline = local.timeline.map((t) => ({ ...t, done: true }));
  });
  return mergedDecisions(next).find((d) => d.id === id);
}

export async function abandonDecision(id) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  const decision = mergedDecisions(store).find((d) => d.id === id);
  checkDecisionAccess(store, decision, user);
  const next = updateStore((s) => {
    ensureLocalDecision(s, id).status = 'abandoned';
  });
  return mergedDecisions(next).find((d) => d.id === id);
}

export async function deleteDecision(id) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  const decision = mergedDecisions(store).find((d) => d.id === id);
  checkDecisionAccess(store, decision, user);
  updateStore((s) => {
    s.decisions = s.decisions.filter((d) => d.id !== id);
    if (seedDecisions.some((d) => d.id === id)) s.deletedDecisionIds.push(id);
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
const DEMO_PASSWORDS = {
  'demo@deadend.app': 'demo1234',
  'admin@deadend.app': 'admin1234',
};

export async function register({ name, email, password } = {}) {
  await latency();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!String(name || '').trim() || !cleanEmail || !String(password || '')) {
    const err = new Error('Name, email, and password are required');
    err.code = 'VALIDATION';
    throw err;
  }
  const store = loadStore();
  const exists = allUsers(store).some((u) => u.email.toLowerCase() === cleanEmail);
  if (exists) {
    const err = new Error('An account with this email already exists');
    err.code = 'EMAIL_TAKEN';
    throw err;
  }
  const user = {
    id: `u-local-${Date.now()}`,
    name: String(name).trim(),
    username: cleanEmail.split('@')[0].replace(/[^a-z0-9._-]/gi, ''),
    email: cleanEmail,
    password: String(password),
    bio: '',
    country: '',
    joinedAt: new Date().toISOString(),
    role: 'user',
    publicProfile: true,
    stats: { experiences: 0, decisionsCompleted: 0, contributions: 0 },
  };
  const next = updateStore((s) => {
    s.users.push(user);
    s.sessionUserId = user.id;
  });
  void next;
  return publicUser(user);
}

export async function login(email, password) {
  await latency();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const store = loadStore();

  const seedMatch = allUsers(store).find((u) => u.email.toLowerCase() === cleanEmail);
  if (seedMatch && DEMO_PASSWORDS[seedMatch.email.toLowerCase()] === String(password)) {
    if (store.suspended.includes(seedMatch.id)) {
      const err = new Error('This account has been suspended');
      err.code = 'SUSPENDED';
      throw err;
    }
    updateStore((s) => {
      s.sessionUserId = seedMatch.id;
    });
    return publicUser(seedMatch);
  }

  const registered = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (registered && registered.password === String(password)) {
    if (store.suspended.includes(registered.id)) {
      const err = new Error('This account has been suspended');
      err.code = 'SUSPENDED';
      throw err;
    }
    updateStore((s) => {
      s.sessionUserId = registered.id;
    });
    return publicUser(registered);
  }

  const err = new Error('Invalid email or password');
  err.code = 'INVALID_CREDENTIALS';
  throw err;
}

export async function logout() {
  await latency();
  updateStore((s) => {
    s.sessionUserId = null;
  });
  return { ok: true };
}

export async function me() {
  await latency();
  const store = loadStore();
  const user = sessionUser(store);
  if (!user) throw unauthenticated();
  return publicUser(user);
}

export async function updateProfile(data) {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  const allowed = ['name', 'bio', 'country', 'publicProfile', 'username'];
  const patch = {};
  allowed.forEach((key) => {
    if (data && data[key] !== undefined) patch[key] = data[key];
  });
  const next = updateStore((s) => {
    let local = s.users.find((u) => u.id === user.id);
    if (!local) {
      const seed = seedUsers.find((u) => u.id === user.id);
      local = { ...(seed || user) };
      s.users.push(local);
    }
    Object.assign(local, patch);
  });
  return publicUser(sessionUser(next));
}

export async function forgotPassword(email) {
  await latency();
  void email;
  return { ok: true };
}

export async function resetPassword(token, password) {
  await latency();
  void token;
  void password;
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export async function listNotifications() {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  return seedNotifications
    .filter((n) => n.userId === user.id)
    .map((n) => ({ ...n, read: store.readNotifications.includes(n.id) ? true : n.read }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function markNotificationRead(id) {
  await latency();
  const store = loadStore();
  requireAuth(store);
  updateStore((s) => {
    if (!s.readNotifications.includes(id)) s.readNotifications.push(id);
  });
  return { ok: true };
}

export async function markAllNotificationsRead() {
  await latency();
  const store = loadStore();
  const user = requireAuth(store);
  updateStore((s) => {
    seedNotifications
      .filter((n) => n.userId === user.id)
      .forEach((n) => {
        if (!s.readNotifications.includes(n.id)) s.readNotifications.push(n.id);
      });
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export async function adminOverview() {
  await latency();
  const store = loadStore();
  requireAdmin(store);
  const exps = mergedExperiences(store);
  const queue = adminQueueSync(store);
  return {
    users: allUsers(store).length,
    experiences: exps.length,
    decisions: mergedDecisions(store).length,
    pending: queue.length,
    reports: store.reports.filter((r) => r.status === 'open').length,
    comments: mergedComments(store).length,
  };
}

function adminQueueSync(store) {
  const localPending = store.experiences.filter((e) => e.status === 'pending');
  const seedPending = seedExperiences
    .filter((e) => e.status === 'pending' && !store.expStatus[e.id])
    .filter((e) => !localPending.some((l) => l.id === e.id));
  return [...seedPending, ...localPending].map((e) => ({
    ...withEffectiveStats(store, e),
    author: authorOf(store, e.authorId, e.privacy),
  }));
}

export async function adminQueue() {
  await latency();
  const store = loadStore();
  requireAdmin(store);
  return adminQueueSync(store);
}

export async function adminApprove(id) {
  await latency();
  const store = loadStore();
  requireAdmin(store);
  const next = updateStore((s) => {
    const local = s.experiences.find((e) => e.id === id);
    if (local) {
      local.status = 'approved';
    } else if (seedExperiences.some((e) => e.id === id)) {
      s.expStatus[id] = 'approved';
    } else {
      const err = new Error('Experience not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
  });
  void next;
  return { ok: true };
}

export async function adminReject(id, note) {
  await latency();
  const store = loadStore();
  requireAdmin(store);
  const next = updateStore((s) => {
    const local = s.experiences.find((e) => e.id === id);
    if (local) {
      local.status = 'rejected';
    } else if (seedExperiences.some((e) => e.id === id)) {
      s.expStatus[id] = 'rejected';
    } else {
      const err = new Error('Experience not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (note) s.rejectionNotes[id] = String(note).slice(0, 500);
  });
  void next;
  return { ok: true };
}

export async function adminReports() {
  await latency();
  const store = loadStore();
  requireAdmin(store);
  return [...store.reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function resolveReport(id, action) {
  await latency();
  const store = loadStore();
  requireAdmin(store);
  const next = updateStore((s) => {
    const report = s.reports.find((r) => r.id === id);
    if (!report) {
      const err = new Error('Report not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    report.status = 'resolved';
    report.action = action || 'dismissed';
    report.resolvedAt = new Date().toISOString();
  });
  void next;
  return { ok: true };
}

export async function adminUsers() {
  await latency();
  const store = loadStore();
  requireAdmin(store);
  return allUsers(store).map((u) => ({
    ...publicUser(u),
    suspended: store.suspended.includes(u.id),
  }));
}

export async function suspendUser(id, suspended) {
  await latency();
  const store = loadStore();
  requireAdmin(store);
  if (id === 'u-admin') {
    const err = new Error('The admin account cannot be suspended');
    err.code = 'VALIDATION';
    throw err;
  }
  updateStore((s) => {
    if (suspended && !s.suspended.includes(id)) s.suspended.push(id);
    if (!suspended) s.suspended = s.suspended.filter((x) => x !== id);
  });
  return { ok: true };
}

export async function adminCategories() {
  await latency();
  const store = loadStore();
  requireAdmin(store);
  return [...seedCategories, ...store.categories];
}

export async function createCategory(data) {
  await latency();
  const store = loadStore();
  requireAdmin(store);
  const category = {
    slug: slugify(data.name),
    name: data.name || 'Untitled',
    description: data.description || '',
    icon: data.icon || 'layers',
    experienceCount: 0,
    popularSearches: data.popularSearches || [],
    trending: data.trending || [],
  };
  updateStore((s) => {
    s.categories.push(category);
  });
  return category;
}

export async function updateCategory(slug, data) {
  await latency();
  const store = loadStore();
  requireAdmin(store);
  const next = updateStore((s) => {
    let cat = s.categories.find((c) => c.slug === slug);
    if (!cat) {
      const seed = seedCategories.find((c) => c.slug === slug);
      if (!seed) {
        const err = new Error('Category not found');
        err.code = 'NOT_FOUND';
        throw err;
      }
      cat = { ...seed };
      s.categories.push(cat);
    }
    Object.assign(cat, data, { slug: cat.slug });
  });
  const merged = [...seedCategories, ...next.categories];
  const local = next.categories.find((c) => c.slug === slug);
  const seed = seedCategories.find((c) => c.slug === slug);
  void merged;
  return local ? { ...seed, ...local } : seed;
}

export async function adminAnalytics() {
  await latency();
  const store = loadStore();
  requireAdmin(store);
  const exps = mergedExperiences(store).filter((e) => e.status === 'approved');
  const experiencesByOutcome = { successful: 0, partially_successful: 0, unsuccessful: 0, abandoned: 0 };
  const byCategory = {};
  exps.forEach((e) => {
    if (experiencesByOutcome[e.outcome] !== undefined) experiencesByOutcome[e.outcome] += 1;
    byCategory[e.category] = (byCategory[e.category] || 0) + 1;
  });
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([slug, count]) => {
      const cat = [...seedCategories, ...store.categories].find((c) => c.slug === slug);
      return { slug, name: cat ? cat.name : slug, count };
    });
  // Newest 6 months of signups, derived from user join dates.
  const signupsByMonth = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const count = allUsers(store).filter((u) => String(u.joinedAt || '').slice(0, 7) === key).length;
    signupsByMonth.push({ month: key, count });
  }
  return { signupsByMonth, experiencesByOutcome, topCategories };
}

// ---------------------------------------------------------------------------
// Categories (public)
// ---------------------------------------------------------------------------
export async function listCategories() {
  await latency();
  const store = loadStore();
  return [...seedCategories, ...store.categories];
}

export async function getCategory(slug) {
  await latency();
  const store = loadStore();
  const user = sessionUser(store);
  const category = [...seedCategories, ...store.categories].find((c) => c.slug === slug);
  if (!category) {
    const err = new Error('Category not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const popular = visibleExperiences(store, user)
    .filter((e) => e.category === slug)
    .sort((a, b) => (b.stats?.views || 0) - (a.stats?.views || 0))
    .slice(0, 4)
    .map((e) => withEffectiveStats(store, e));
  return { ...category, popular };
}

// ---------------------------------------------------------------------------
// Drafts (synchronous localStorage, exposed as async for a uniform API)
// ---------------------------------------------------------------------------
export async function saveDraft(key, data) {
  const store = loadStore();
  store.drafts[key] = data;
  saveStore(store);
  return { ok: true };
}

export async function loadDraft(key) {
  const store = loadStore();
  return store.drafts[key] ?? null;
}

export async function clearDraft(key) {
  const store = updateStore((s) => {
    delete s.drafts[key];
  });
  void store;
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Default export: the full API surface
// ---------------------------------------------------------------------------
const mockAdapter = {
  getStats,
  searchExperiences,
  listExperiences,
  getExperience,
  createExperience,
  updateExperience,
  deleteExperience,
  saveExperience,
  unsaveExperience,
  listSaved,
  createFolder,
  updateFolder,
  deleteFolder,
  listFolders,
  listComments,
  addComment,
  replyComment,
  likeComment,
  deleteComment,
  reportContent,
  findSimilar,
  aiAnalyzeDecision,
  structureStory,
  listDecisions,
  getDecision,
  createDecision,
  updateDecision,
  addDecisionUpdate,
  addMilestone,
  toggleMilestone,
  completeDecision,
  abandonDecision,
  deleteDecision,
  register,
  login,
  logout,
  me,
  updateProfile,
  forgotPassword,
  resetPassword,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  adminOverview,
  adminQueue,
  adminApprove,
  adminReject,
  adminReports,
  resolveReport,
  adminUsers,
  suspendUser,
  adminCategories,
  createCategory,
  updateCategory,
  adminAnalytics,
  listCategories,
  getCategory,
  saveDraft,
  loadDraft,
  clearDraft,
};

export default mockAdapter;

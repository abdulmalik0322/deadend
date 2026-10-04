import { Experience } from '../models/Experience.js';
import { SavedExperience } from '../models/SavedExperience.js';
import { Comment } from '../models/Comment.js';
import { Category } from '../models/Category.js';
import { Folder } from '../models/Folder.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination } from '../utils/pagination.js';
import { uniqueSlug } from '../utils/slugs.js';
import { presentExperience, presentComment } from '../utils/present.js';
import { notify } from '../utils/notify.js';
import { stripHtml } from '../utils/sanitize.js';

/* ------------------------------------------------------------------ */
/* Small helpers                                                      */
/* ------------------------------------------------------------------ */

const WRITE_FIELDS = [
  'title',
  'category',
  'country',
  'goal',
  'description',
  'duration',
  'investmentDisplay',
  'outcome',
  'mainObstacle',
  'tags',
  'privacy',
  'startingPoint',
  'timeline',
  'investment',
  'obstacles',
  'whatWorked',
  'lessons',
  'doDifferently',
];

/** Pick only whitelisted fields from the request body. */
function pick(body) {
  const out = {};
  for (const key of WRITE_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

function assertOwnerOrAdmin(ownerId, user) {
  if (user.role === 'admin') return;
  if (String(ownerId) !== user.id) throw new ApiError(403, 'Forbidden');
}

/** Same visibility rule as GET /:slug: approved+non-private, owner, or admin. */
function assertVisibleExperience(exp, user) {
  const isOwner = user && String(exp.author?._id || exp.author) === user.id;
  const isAdmin = user?.role === 'admin';
  if (!isAdmin && !isOwner && (exp.status !== 'approved' || exp.privacy === 'private')) {
    throw new ApiError(404, 'Experience not found');
  }
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normText(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * Resolve a category slug → ObjectId.
 * Unknown slugs are auto-created (title-cased name) so client flows that send
 * slugs — like the contract's create-experience payload — always succeed.
 */
async function resolveCategorySlug(slug) {
  const clean = normText(slug);
  let cat = await Category.findOne({ slug: clean }).select('_id');
  if (!cat) {
    const name = clean
      .split(/[-_]+/)
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
    cat = await Category.create({ slug: clean, name: name || clean });
  }
  return cat._id;
}

/** Sanitize user-supplied strings in an experience payload (defense against stored XSS). */
function sanitizeExperienceData(data) {
  const s = (v) => (typeof v === 'string' ? stripHtml(v) : v);
  const arr = (a) => (Array.isArray(a) ? a.map(s).filter((x) => x !== '') : a);
  const out = { ...data };
  for (const k of [
    'title',
    'country',
    'goal',
    'description',
    'duration',
    'investmentDisplay',
    'outcome',
    'privacy',
    'mainObstacle',
  ]) {
    if (out[k] !== undefined) out[k] = s(out[k]);
  }
  if (out.tags !== undefined) out.tags = arr(out.tags);
  if (out.startingPoint && typeof out.startingPoint === 'object') {
    const sp = { ...out.startingPoint };
    for (const k of ['education', 'experienceLevel', 'budget', 'timeAvailable', 'location']) {
      if (sp[k] !== undefined) sp[k] = s(sp[k]);
    }
    if (sp.skills !== undefined) sp.skills = arr(sp.skills);
    out.startingPoint = sp;
  }
  if (Array.isArray(out.timeline)) {
    out.timeline = out.timeline
      .filter((t) => t && typeof t === 'object')
      .map((t) => ({ label: s(t.label) ?? '', text: s(t.text) ?? '' }));
  }
  if (out.investment && typeof out.investment === 'object') {
    const inv = { ...out.investment };
    if (inv.money !== undefined) inv.money = s(inv.money);
    if (inv.time !== undefined) inv.time = s(inv.time);
    if (inv.tools !== undefined) inv.tools = arr(inv.tools);
    out.investment = inv;
  }
  for (const k of ['obstacles', 'whatWorked', 'lessons', 'doDifferently']) {
    if (out[k] !== undefined) out[k] = arr(out[k]);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Filter helpers (ported from the frontend mockAdapter so the REST    */
/* API filters behave exactly like the old client-side filtering).     */
/* ------------------------------------------------------------------ */

const OUTCOME_ALIASES = {
  successful: 'successful',
  partially_successful: 'partially_successful',
  partial: 'partially_successful',
  mixed: 'partially_successful',
  unsuccessful: 'unsuccessful',
  failed: 'unsuccessful',
  abandoned: 'abandoned',
};

function normalizeOutcomes(outcome, outcomes) {
  const raw = [];
  if (outcome) raw.push(outcome);
  if (outcomes) raw.push(...String(outcomes).split(','));
  return [
    ...new Set(raw.map((o) => OUTCOME_ALIASES[normText(o)]).filter(Boolean)),
  ];
}

// Budget: both the seed startingPoint.budget values ('Under $500',
// '$500–$2,000', 'Over $2,000') and the filter options ('Under $500',
// '$500–$2k', '$2k–$10k', '$10k+') are normalized to [min, max] ranges; a
// record matches when the ranges overlap.
export function budgetRange(label) {
  const t = normText(label).replace(/,/g, '');
  if (!t) return null;
  const nums = (t.match(/\d+(?:\.\d+)?/g) || []).map(Number);
  if (t.includes('under') && nums.length) return [0, nums[0]];
  if (t.includes('over') && nums.length) return [nums[0], Infinity];
  if (t.endsWith('+') || t.includes('10k+')) return [10000, Infinity];
  if (nums.length >= 2) {
    const parts = t.split(/[^0-9.k]+/).filter(Boolean);
    const scale = (n, s) => (s.includes('k') ? n * 1000 : n);
    return [scale(nums[0], parts[0] || ''), scale(nums[1], parts[1] || '')];
  }
  if (nums.length === 1) return [0, nums[0]];
  return null;
}

export function rangesOverlap(a, b) {
  // Strict on shared boundaries: a [0,500] budget does not fall in the
  // "$500–$2k" bracket just because they touch at 500.
  return a[0] < b[1] && b[0] < a[1];
}

// Time available: records store e.g. '15 hrs/week'; the filter offers
// ranges ('Under 5 hrs/week', '5–15 hrs/week', '15–30 hrs/week', '30+ hrs/week').
export function matchesTimeAvailable(recordValue, filterValue) {
  const t = normText(filterValue);
  const m = String(recordValue || '').match(/(\d+(?:\.\d+)?)/);
  const hrs = m ? Number(m[1]) : NaN;
  if (Number.isNaN(hrs)) return false;
  if (t.includes('under 5')) return hrs < 5;
  if (t.includes('30+') || t.includes('30 +')) return hrs > 30;
  if (t.includes('15') && t.includes('30')) return hrs > 15 && hrs <= 30;
  if (t.includes('5') && t.includes('15')) return hrs >= 5 && hrs <= 15;
  return normText(recordValue) === t;
}

// The filter panel sends skills/tags as comma-separated strings; other
// callers may send arrays. Normalize to a lowercase token list either way.
function toList(value) {
  if (Array.isArray(value)) return value.map((v) => normText(v)).filter(Boolean);
  return String(value || '')
    .split(/[,;]/)
    .map((v) => normText(v))
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* GET /api/experiences                                                */
/* ------------------------------------------------------------------ */

/**
 * Filters: category (slug), country, outcome(s), goal (substring), budget
 * (label), budgetMin/budgetMax (numeric), experienceLevel, timeAvailable,
 * skills/tags (csv, ANY overlap), q (full-text with regex fallback).
 * Sort: relevant (default) | recent | discussed | saves.
 * Visibility: approved AND privacy != private; authed viewers also see own docs.
 * → { items, total, page, pages, limit }
 */
export const listExperiences = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req, { defaultLimit: 20, maxLimit: 50 });
  const {
    category,
    country,
    outcome,
    outcomes,
    goal,
    budget,
    budgetMin,
    budgetMax,
    experienceLevel,
    timeAvailable,
    skills,
    tags,
    q,
    sort = 'relevant',
    status,
  } = req.query;

  const viewer = req.user || null;
  const isAdmin = viewer?.role === 'admin';

  let mongoFilter;
  if (isAdmin && status) {
    mongoFilter = { status };
  } else if (viewer) {
    mongoFilter = {
      $or: [
        { status: 'approved', privacy: { $ne: 'private' } },
        { author: viewer.id },
      ],
    };
  } else {
    mongoFilter = { status: 'approved', privacy: { $ne: 'private' } };
  }

  // category: slug → Category _id; unknown slug → empty result
  if (category) {
    const cat = await Category.findOne({ slug: normText(category) }).select('_id');
    if (!cat) {
      return res.json({ items: [], total: 0, page, pages: 0, limit });
    }
    mongoFilter.category = cat._id;
  }
  if (country) mongoFilter.country = new RegExp(`^${escapeRegExp(country)}$`, 'i');
  if (goal) mongoFilter.goal = new RegExp(escapeRegExp(goal), 'i');
  if (experienceLevel) {
    mongoFilter['startingPoint.experienceLevel'] = new RegExp(
      `^${escapeRegExp(experienceLevel)}$`,
      'i'
    );
  }

  const wantOutcomes = normalizeOutcomes(outcome, outcomes);
  if (wantOutcomes.length) mongoFilter.outcome = { $in: wantOutcomes };

  const wantSkills = toList(skills);
  if (wantSkills.length) {
    // ANY overlap, case-insensitive substring (matches mock behavior)
    mongoFilter['startingPoint.skills'] = {
      $in: wantSkills.map((w) => new RegExp(escapeRegExp(w), 'i')),
    };
  }
  const wantTags = toList(tags);
  if (wantTags.length) mongoFilter.tags = { $in: wantTags }; // tags stored lowercase

  const populateSpec = [
    { path: 'category', select: 'name slug' },
    { path: 'author', select: 'name username country' },
  ];

  // q: $text search with regex fallback when no text index / on error
  let docs;
  let usedTextScore = false;
  const query = String(q || '').trim();
  if (query) {
    try {
      docs = await Experience.find({ ...mongoFilter, $text: { $search: query } })
        .select({ __textScore: { $meta: 'textScore' } })
        .populate(populateSpec)
        .lean();
      usedTextScore = true;
    } catch {
      const rx = new RegExp(escapeRegExp(query), 'i');
      docs = await Experience.find({
        ...mongoFilter,
        $or: [{ title: rx }, { goal: rx }, { description: rx }, { tags: rx }],
      })
        .populate(populateSpec)
        .lean();
    }
  } else {
    docs = await Experience.find(mongoFilter).populate(populateSpec).lean();
  }

  // JS-side filters: budget label / numeric range / time-available heuristic
  const budgetWanted = budget && normText(budget) ? budgetRange(budget) : null;
  const minB = budgetMin !== undefined && budgetMin !== '' ? Number(budgetMin) : NaN;
  const maxB = budgetMax !== undefined && budgetMax !== '' ? Number(budgetMax) : NaN;
  const hasNumericBudget =
    (!Number.isNaN(minB) && budgetMin !== undefined && budgetMin !== '') ||
    (!Number.isNaN(maxB) && budgetMax !== undefined && budgetMax !== '');
  const timeWanted = timeAvailable && normText(timeAvailable) ? String(timeAvailable) : null;

  let items = docs;
  if (budgetWanted || hasNumericBudget || timeWanted) {
    items = docs.filter((d) => {
      const spBudget = d.startingPoint?.budget;
      if (budget && budgetWanted) {
        const have = budgetRange(spBudget);
        if (!have || !rangesOverlap(have, budgetWanted)) return false;
      }
      if (hasNumericBudget) {
        const nums = (String(spBudget || '').match(/\d+(?:\.\d+)?/g) || []).map(Number);
        if (!nums.length) return false;
        const lo = Math.min(...nums);
        const hi = Math.max(...nums);
        const fMin = !Number.isNaN(minB) ? minB : -Infinity;
        const fMax = !Number.isNaN(maxB) ? maxB : Infinity;
        if (!(hi >= fMin && lo <= fMax)) return false;
      }
      if (timeWanted && !matchesTimeAvailable(d.startingPoint?.timeAvailable, timeWanted)) {
        return false;
      }
      return true;
    });
  }

  const sortKey = ['relevant', 'recent', 'discussed', 'saves'].includes(sort) ? sort : 'relevant';
  items.sort((a, b) => {
    switch (sortKey) {
      case 'recent':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'discussed':
        return (b.stats?.comments || 0) - (a.stats?.comments || 0);
      case 'saves':
        return (b.stats?.saves || 0) - (a.stats?.saves || 0);
      case 'relevant':
      default:
        if (query && usedTextScore) return (b.__textScore || 0) - (a.__textScore || 0);
        return (b.stats?.views || 0) - (a.stats?.views || 0);
    }
  });

  const total = items.length;
  const pages = Math.ceil(total / limit);
  const pageItems = items.slice((page - 1) * limit, page * limit);

  // Attach `saved` flags for the current page when authed.
  if (viewer && pageItems.length) {
    const saved = await SavedExperience.find({
      user: viewer.id,
      experience: { $in: pageItems.map((d) => d._id) },
    })
      .select('experience')
      .lean();
    const savedSet = new Set(saved.map((s) => String(s.experience)));
    pageItems.forEach((d) => {
      d.saved = savedSet.has(String(d._id));
    });
  }

  res.json({
    items: pageItems.map((d) => presentExperience(d, viewer)),
    total,
    page,
    pages,
    limit,
  });
});

/* ------------------------------------------------------------------ */
/* GET /api/experiences/search — lightweight autocomplete             */
/* ------------------------------------------------------------------ */

/** Public only → [{ id, slug, title, categoryLabel, outcome }]. */
export const getSearchExperiences = asyncHandler(async (req, res) => {
  const query = String(req.query.q || '').trim();
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 6));
  if (!query) return res.json([]);

  const filter = { status: 'approved', privacy: { $ne: 'private' } };
  let docs;
  try {
    docs = await Experience.find({ ...filter, $text: { $search: query } })
      .populate('category', 'name slug')
      .limit(limit)
      .lean();
  } catch {
    const rx = new RegExp(escapeRegExp(query), 'i');
    docs = await Experience.find({
      ...filter,
      $or: [{ title: rx }, { goal: rx }, { description: rx }],
    })
      .populate('category', 'name slug')
      .limit(limit)
      .lean();
  }

  res.json(
    docs.map((d) => ({
      id: String(d._id),
      slug: d.slug,
      title: d.title,
      categoryLabel: d.category?.name || '',
      outcome: d.outcome,
    }))
  );
});

/* ------------------------------------------------------------------ */
/* GET /api/experiences/:slug                                          */
/* ------------------------------------------------------------------ */

/** Visibility: approved+non-private, owner, or admin → 404 otherwise. No view increment. */
export const getExperienceBySlug = asyncHandler(async (req, res) => {
  const exp = await Experience.findOne({ slug: req.params.slug })
    .populate('category', 'name slug')
    .populate('author', 'name username country')
    .lean();
  if (!exp) throw new ApiError(404, 'Experience not found');

  const viewer = req.user || null;
  assertVisibleExperience(exp, viewer);

  if (viewer) {
    exp.saved = !!(await SavedExperience.exists({ user: viewer.id, experience: exp._id }));
  }
  res.json(presentExperience(exp, viewer));
});

/* ------------------------------------------------------------------ */
/* POST /api/experiences/:id/view — best-effort once per IP per hour   */
/* ------------------------------------------------------------------ */

const viewDedup = new Map(); // `${experienceId}:${ip}` → timestamp
const VIEW_WINDOW_MS = 60 * 60 * 1000;

export const recordView = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const key = `${id}:${ip}`;
  const now = Date.now();

  if (now - (viewDedup.get(key) || 0) > VIEW_WINDOW_MS) {
    viewDedup.set(key, now);
    if (viewDedup.size > 20000) viewDedup.clear(); // bounded memory
    await Experience.updateOne({ _id: id }, { $inc: { 'stats.views': 1 } });
  }

  const doc = await Experience.findById(id).select('stats.views').lean();
  if (!doc) throw new ApiError(404, 'Experience not found');
  res.json({ ok: true, views: doc.stats?.views ?? 0 });
});

/* ------------------------------------------------------------------ */
/* POST /api/experiences                                               */
/* ------------------------------------------------------------------ */

/** Whitelisted fields; status 'pending' unless created by an admin. → 201 presented. */
export const createExperience = asyncHandler(async (req, res) => {
  const viewer = req.user;
  const data = sanitizeExperienceData(pick(req.body));
  if (data.category !== undefined) {
    data.category = await resolveCategorySlug(data.category);
  }

  const exp = await Experience.create({
    ...data,
    slug: await uniqueSlug(Experience, data.title),
    author: viewer.id,
    status: viewer.role === 'admin' ? 'approved' : 'pending',
  });

  await User.updateOne(
    { _id: viewer.id },
    { $inc: { 'stats.experiences': 1, 'stats.contributions': 1 } }
  );

  const presented = await Experience.findById(exp._id)
    .populate('category', 'name slug')
    .populate('author', 'name username country')
    .lean();
  res.status(201).json(presentExperience(presented, viewer));
});

/* ------------------------------------------------------------------ */
/* PATCH /api/experiences/:id — owner or admin; title change → new slug */
/* ------------------------------------------------------------------ */

export const updateExperience = asyncHandler(async (req, res) => {
  const exp = await Experience.findById(req.params.id);
  if (!exp) throw new ApiError(404, 'Experience not found');
  assertOwnerOrAdmin(exp.author, req.user);

  const data = sanitizeExperienceData(pick(req.body));
  if (data.category !== undefined) {
    data.category = await resolveCategorySlug(data.category);
  }
  if (data.title && data.title !== exp.title) {
    exp.slug = await uniqueSlug(Experience, data.title);
  }
  Object.assign(exp, data);
  await exp.save();

  const presented = await Experience.findById(exp._id)
    .populate('category', 'name slug')
    .populate('author', 'name username country')
    .lean();
  res.json(presentExperience(presented, req.user));
});

/* ------------------------------------------------------------------ */
/* DELETE /api/experiences/:id — owner or admin; cascades saves/comments */
/* ------------------------------------------------------------------ */

export const deleteExperience = asyncHandler(async (req, res) => {
  const exp = await Experience.findById(req.params.id);
  if (!exp) throw new ApiError(404, 'Experience not found');
  assertOwnerOrAdmin(exp.author, req.user);

  await Promise.all([
    SavedExperience.deleteMany({ experience: exp._id }),
    Comment.deleteMany({ experience: exp._id }),
    exp.deleteOne(),
  ]);
  await User.updateOne(
    { _id: exp.author },
    { $inc: { 'stats.experiences': -1, 'stats.contributions': -1 } }
  );
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* POST /api/experiences/:id/save — 201; 409 if already saved          */
/* ------------------------------------------------------------------ */

export const saveExperience = asyncHandler(async (req, res) => {
  const experienceId = req.params.id;
  const exp = await Experience.findById(experienceId).select('author slug title');
  if (!exp) throw new ApiError(404, 'Experience not found');

  const { folderId } = req.body || {};
  let folder = null;
  if (folderId) {
    folder = await Folder.findOne({ _id: folderId, user: req.user.id });
    if (!folder) throw new ApiError(400, 'Invalid folder');
  }

  const already = await SavedExperience.exists({ user: req.user.id, experience: experienceId });
  if (already) throw new ApiError(409, 'Experience already saved');

  await SavedExperience.create({
    user: req.user.id,
    experience: experienceId,
    folder: folder ? folder._id : null,
  });
  await Experience.updateOne({ _id: experienceId }, { $inc: { 'stats.saves': 1 } });

  if (String(exp.author) !== req.user.id) {
    notify(String(exp.author), {
      type: 'save',
      title: 'Someone saved your experience',
      body: `"${exp.title}" was saved by another user.`,
      link: `/experiences/${exp.slug}`,
    });
  }
  res.status(201).json({ ok: true, saved: true });
});

/* ------------------------------------------------------------------ */
/* DELETE /api/experiences/:id/save — 404 if not saved                 */
/* ------------------------------------------------------------------ */

export const unsaveExperience = asyncHandler(async (req, res) => {
  const removed = await SavedExperience.findOneAndDelete({
    user: req.user.id,
    experience: req.params.id,
  });
  if (!removed) throw new ApiError(404, 'Saved experience not found');
  await Experience.updateOne({ _id: req.params.id }, { $inc: { 'stats.saves': -1 } });
  res.json({ ok: true, saved: false });
});

/* ------------------------------------------------------------------ */
/* Comments nested under an experience                                  */
/* ------------------------------------------------------------------ */

/** GET /api/experiences/:id/comments — same visibility as the experience. */
export const listExperienceComments = asyncHandler(async (req, res) => {
  const exp = await Experience.findById(req.params.id).select('author status privacy');
  if (!exp) throw new ApiError(404, 'Experience not found');
  assertVisibleExperience(exp, req.user);

  const comments = await Comment.find({ experience: exp._id, status: 'visible' })
    .populate('author', 'name username')
    .sort({ createdAt: 1 })
    .lean();

  const byId = new Map(comments.map((c) => [String(c._id), { ...c, replies: [] }]));
  const roots = [];
  for (const node of byId.values()) {
    const parentId = node.parent ? String(node.parent) : null;
    if (parentId && byId.has(parentId)) {
      byId.get(parentId).replies.push(node);
    } else {
      roots.push(node);
    }
  }

  const viewerId = req.user?.id || null;
  res.json({ items: roots.map((c) => presentComment(c, viewerId)) });
});

/** POST /api/experiences/:id/comments — { body (1-2000), parentId? }. → 201 comment. */
export const addExperienceComment = asyncHandler(async (req, res) => {
  const exp = await Experience.findById(req.params.id).select('author slug title status privacy');
  if (!exp) throw new ApiError(404, 'Experience not found');
  assertVisibleExperience(exp, req.user);

  const body = stripHtml(req.body.body);
  if (!body) throw new ApiError(400, 'Comment body is required');

  let parent = null;
  if (req.body.parentId) {
    parent = await Comment.findById(req.body.parentId);
    if (!parent || String(parent.experience) !== String(exp._id)) {
      throw new ApiError(400, 'Invalid parent comment');
    }
    if (parent.parent) throw new ApiError(400, 'Can only reply to top-level comments');
  }

  const comment = await Comment.create({
    experience: exp._id,
    author: req.user.id,
    body,
    parent: parent ? parent._id : null,
  });
  await comment.populate('author', 'name username');
  await Experience.updateOne({ _id: exp._id }, { $inc: { 'stats.comments': 1 } });

  // Notify the experience owner (unless it's their own comment) ...
  if (String(exp.author) !== req.user.id) {
    notify(String(exp.author), {
      type: 'comment',
      title: 'New comment on your experience',
      body: body.slice(0, 140),
      link: `/experiences/${exp.slug}`,
    });
  }
  // ... and the parent comment's author (unless same person / same as owner).
  if (
    parent &&
    String(parent.author) !== req.user.id &&
    String(parent.author) !== String(exp.author)
  ) {
    notify(String(parent.author), {
      type: 'comment',
      title: 'New reply to your comment',
      body: body.slice(0, 140),
      link: `/experiences/${exp.slug}`,
    });
  }

  res.status(201).json(presentComment(comment, req.user.id));
});

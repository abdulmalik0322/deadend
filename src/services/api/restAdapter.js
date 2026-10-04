// DEADEND REST API adapter.
// Same function surface as mockAdapter, backed by the Express API.
// Active when VITE_API_MODE=rest, or when VITE_API_URL is set (even if MODE is unset).
// Auth token lives in localStorage["deadend_token"], sent as `Authorization: Bearer <token>`.

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const TOKEN_KEY = 'deadend_token';
const DRAFT_PREFIX = 'deadend_draft_';

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.status = status;
    if (code) this.code = code;
  }
}

function isNoFilter(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') {
    const t = value.trim();
    return t === '' || t === 'Any';
  }
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function toCsv(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(',');
  return value || '';
}

async function request(path, { method = 'GET', body, auth = false, query } = {}) {
  if (!BASE) {
    throw new ApiError(
      'REST backend not configured. Set VITE_API_URL to connect the Express API.'
    );
  }
  let url = `${BASE}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', {
      status: 0,
      code: 'NETWORK',
    });
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message =
      (data && (data.error || data.message)) || `Request failed (${res.status})`;
    const err = new ApiError(message, { status: res.status });
    if (res.status === 401) err.code = 'INVALID_CREDENTIALS';
    if (res.status === 403 && /suspend/i.test(message)) err.code = 'SUSPENDED';
    if (res.status === 409 && /email/i.test(message)) err.code = 'EMAIL_TAKEN';
    if (res.status === 404) err.code = 'NOT_FOUND';
    throw err;
  }
  return data;
}

const get = (path, opts = {}) => request(path, { ...opts, method: 'GET' });
const post = (path, body, opts = {}) => request(path, { ...opts, method: 'POST', body });
const patch = (path, body, opts = {}) => request(path, { ...opts, method: 'PATCH', body });
const put = (path, body, opts = {}) => request(path, { ...opts, method: 'PUT', body });
const del = (path, opts = {}) => request(path, { ...opts, method: 'DELETE' });

// ---------------------------------------------------------------------------
// Stats / discovery
// ---------------------------------------------------------------------------

// GET /api/stats -> {experiences, decisions, contributors, countries}
export async function getStats() {
  return get('/api/stats');
}

// GET /api/experiences/search?q=..&limit=6 -> [{id, slug, title, categoryLabel, outcome}]
export async function searchExperiences(query, { limit = 6 } = {}) {
  return get('/api/experiences/search', { query: { q: query, limit } });
}

// GET /api/experiences?... -> {items, total, page, totalPages}
export async function listExperiences({ filters = {}, sort = 'relevant', page = 1, perPage = 9 } = {}) {
  const q = { page, limit: perPage, sort };
  if (!isNoFilter(filters.category)) q.category = filters.category;
  if (!isNoFilter(filters.country)) q.country = filters.country;
  if (!isNoFilter(filters.goal)) q.goal = filters.goal;
  if (!isNoFilter(filters.budget)) q.budget = filters.budget;
  if (!isNoFilter(filters.experienceLevel)) q.experienceLevel = filters.experienceLevel;
  if (!isNoFilter(filters.timeAvailable)) q.timeAvailable = filters.timeAvailable;
  const outcomes = [
    ...(filters.outcome ? [filters.outcome] : []),
    ...(Array.isArray(filters.outcomes) ? filters.outcomes : []),
  ].filter(Boolean);
  if (outcomes.length) q.outcomes = outcomes.join(',');
  const skills = toCsv(filters.skills);
  if (skills) q.skills = skills;
  const tags = toCsv(filters.tags);
  if (tags) q.tags = tags;
  if (filters.q) q.q = filters.q;

  const data = await get('/api/experiences', { query: q, auth: true });
  return {
    items: data.items || [],
    total: data.total || 0,
    page: data.page || 1,
    totalPages: data.pages || 1,
  };
}

// GET /api/experiences/:slug -> full experience (+ records a view)
export async function getExperience(slug) {
  const exp = await get(`/api/experiences/${encodeURIComponent(slug)}`, { auth: true });
  if (exp && exp.id) {
    post(`/api/experiences/${encodeURIComponent(exp.id)}/view`, undefined).catch(() => {});
  }
  return exp;
}

// ---------------------------------------------------------------------------
// Experience mutations
// ---------------------------------------------------------------------------

// POST /api/experiences -> created experience (status pending)
export async function createExperience(data) {
  return post('/api/experiences', data, { auth: true });
}

// PATCH /api/experiences/:id -> updated experience (owner or admin)
export async function updateExperience(id, data) {
  return patch(`/api/experiences/${encodeURIComponent(id)}`, data, { auth: true });
}

// DELETE /api/experiences/:id -> {ok:true}
export async function deleteExperience(id) {
  await del(`/api/experiences/${encodeURIComponent(id)}`, { auth: true });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Saves & folders
// ---------------------------------------------------------------------------

// POST /api/experiences/:id/save {folderId?} -> {ok:true, saved:true}
export async function saveExperience(id, folderId = null) {
  await post(`/api/experiences/${encodeURIComponent(id)}/save`, { folderId }, { auth: true });
  return { ok: true, saved: true };
}

// DELETE /api/experiences/:id/save -> {ok:true, saved:false}
export async function unsaveExperience(id) {
  await del(`/api/experiences/${encodeURIComponent(id)}/save`, { auth: true });
  return { ok: true, saved: false };
}

// GET /api/saved?folderId=..&q=.. -> [{...experience, folderId, savedAt}]
export async function listSaved({ folderId, q } = {}) {
  return get('/api/saved', { auth: true, query: { folderId, q } });
}

// GET /api/saved/folders -> [{id, name, count}]
export async function listFolders() {
  return get('/api/saved/folders', { auth: true });
}

// POST /api/saved/folders {name} -> created folder
export async function createFolder(name) {
  return post('/api/saved/folders', { name }, { auth: true });
}

// PATCH /api/saved/folders/:id {name} -> updated folder
export async function updateFolder(id, name) {
  return patch(`/api/saved/folders/${encodeURIComponent(id)}`, { name }, { auth: true });
}

// DELETE /api/saved/folders/:id -> {ok:true}
export async function deleteFolder(id) {
  await del(`/api/saved/folders/${encodeURIComponent(id)}`, { auth: true });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

// GET /api/experiences/:id/comments -> {items:[...]}
export async function listComments(experienceId) {
  const data = await get(
    `/api/experiences/${encodeURIComponent(experienceId)}/comments`,
    { auth: true }
  );
  return data.items || data;
}

// POST /api/experiences/:id/comments {body} -> created comment
export async function addComment(experienceId, body) {
  return post(
    `/api/experiences/${encodeURIComponent(experienceId)}/comments`,
    { body },
    { auth: true }
  );
}

// POST /api/comments/:id/reply {body} -> created reply
export async function replyComment(commentId, body) {
  return post(`/api/comments/${encodeURIComponent(commentId)}/reply`, { body }, { auth: true });
}

// POST /api/comments/:id/like -> {ok:true, liked} (toggles)
export async function likeComment(id) {
  const data = await post(`/api/comments/${encodeURIComponent(id)}/like`, undefined, {
    auth: true,
  });
  return { ok: true, liked: data.liked, likes: data.likes };
}

// DELETE /api/comments/:id -> {ok:true}
export async function deleteComment(id) {
  await del(`/api/comments/${encodeURIComponent(id)}`, { auth: true });
  return { ok: true };
}

// POST /api/reports {targetType, targetId, reason} -> {ok:true}
export async function reportContent(targetType, targetId, reason) {
  await post('/api/reports', { targetType, targetId, reason }, { auth: true });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Similarity & AI analysis
// ---------------------------------------------------------------------------

// POST /api/similar -> {results:[{experience, score, factors}], totalInDataset}
export async function findSimilar(input) {
  return post('/api/similar', input || {});
}

// POST /api/ai/analyze -> frontend-shaped report
export async function aiAnalyzeDecision(input) {
  const data = await post('/api/ai/analyze', input || {}, { auth: true });
  const stats = data.datasetStats || {};
  const obstacles = (stats.topObstacles || []).map((o) => ({
    text: o.text,
    count: o.count,
  }));
  return {
    relevantCount: stats.relevant ?? stats.total ?? 0,
    obstacles,
    patterns: data.patterns || [],
    questions: data.questions || [],
    relatedExperiences: data.related || [],
    summary: `Based on ${stats.relevant ?? 0} relevant experiences in the current dataset, the most reported obstacle is "${obstacles[0]?.text || '—'}" (reported ${obstacles[0]?.count || 0} times). These summaries describe patterns in submitted experiences — they are not predictions.`,
    _input: data.input,
    _datasetStats: stats,
  };
}

// POST /api/ai/structure {text} -> structured story draft
export async function structureStory(text) {
  return post('/api/ai/structure', { text }, { auth: true });
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

// GET /api/decisions -> current user's decisions (array)
export async function listDecisions() {
  const data = await get('/api/decisions', { auth: true });
  return data.items || data;
}

// GET /api/decisions/:id -> decision
export async function getDecision(id) {
  return get(`/api/decisions/${encodeURIComponent(id)}`, { auth: true });
}

// POST /api/decisions -> created decision (status planning)
export async function createDecision(data) {
  return post('/api/decisions', data, { auth: true });
}

// PATCH /api/decisions/:id -> updated decision
export async function updateDecision(id, data) {
  return patch(`/api/decisions/${encodeURIComponent(id)}`, data, { auth: true });
}

// POST /api/decisions/:id/updates {text, stage?} -> updated decision (refetch)
export async function addDecisionUpdate(id, { text, stage } = {}) {
  await post(`/api/decisions/${encodeURIComponent(id)}/updates`, { text, stage }, { auth: true });
  return getDecision(id);
}

// POST /api/decisions/:id/milestones {title, dueDate} -> updated decision (refetch)
export async function addMilestone(id, { title, dueDate } = {}) {
  await post(
    `/api/decisions/${encodeURIComponent(id)}/milestones`,
    { title, dueDate },
    { auth: true }
  );
  return getDecision(id);
}

// PATCH /api/decisions/:id/milestones/:milestoneId -> updated decision (refetch)
export async function toggleMilestone(decisionId, milestoneId) {
  await patch(
    `/api/decisions/${encodeURIComponent(decisionId)}/milestones/${encodeURIComponent(milestoneId)}`,
    {},
    { auth: true }
  );
  return getDecision(decisionId);
}

// POST /api/decisions/:id/complete {duration, investment, result} -> completed decision
export async function completeDecision(id, actual) {
  const a = actual || {};
  return post(
    `/api/decisions/${encodeURIComponent(id)}/complete`,
    {
      actualDuration: a.duration,
      actualInvestment: a.investment,
      actualResult: a.result,
    },
    { auth: true }
  );
}

// POST /api/decisions/:id/abandon -> abandoned decision
export async function abandonDecision(id) {
  return post(`/api/decisions/${encodeURIComponent(id)}/abandon`, undefined, { auth: true });
}

// DELETE /api/decisions/:id -> {ok:true}
export async function deleteDecision(id) {
  await del(`/api/decisions/${encodeURIComponent(id)}`, { auth: true });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

// POST /api/auth/register {name, email, password} -> user
export async function register({ name, email, password } = {}) {
  const data = await post('/api/auth/register', { name, email, password });
  if (data.token) setToken(data.token);
  return data.user;
}

// POST /api/auth/login {email, password} -> user
export async function login(email, password) {
  const data = await post('/api/auth/login', { email, password });
  if (data.token) setToken(data.token);
  return data.user;
}

// POST /api/auth/logout -> {ok:true}
export async function logout() {
  try {
    await post('/api/auth/logout', undefined);
  } catch {
    /* logout is client-side; ignore server errors */
  } finally {
    setToken(null);
  }
  return { ok: true };
}

// GET /api/auth/me -> user or 401
export async function me() {
  const token = getToken();
  if (!token) {
    throw new ApiError('Not authenticated', { status: 401, code: 'INVALID_CREDENTIALS' });
  }
  return get('/api/auth/me', { auth: true });
}

// PUT /api/auth/profile -> updated user
export async function updateProfile(data) {
  return put('/api/auth/profile', data, { auth: true });
}

// PUT /api/auth/password {currentPassword, newPassword} -> {ok:true}
export async function changePassword(currentPassword, newPassword) {
  await put('/api/auth/password', { currentPassword, newPassword }, { auth: true });
  return { ok: true };
}

// POST /api/auth/forgot-password {email} -> {ok:true}
export async function forgotPassword(email) {
  await post('/api/auth/forgot-password', { email });
  return { ok: true };
}

// POST /api/auth/reset-password {token, password} -> {ok:true}
export async function resetPassword(token, password) {
  await post('/api/auth/reset-password', { token, password });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

// GET /api/notifications -> [notifications]
export async function listNotifications() {
  return get('/api/notifications', { auth: true });
}

// PATCH /api/notifications/:id/read -> {ok:true}
export async function markNotificationRead(id) {
  await patch(`/api/notifications/${encodeURIComponent(id)}/read`, undefined, { auth: true });
  return { ok: true };
}

// PATCH /api/notifications/read-all -> {ok:true}
export async function markAllNotificationsRead() {
  await patch('/api/notifications/read-all', undefined, { auth: true });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

// GET /api/admin/overview -> {users, experiences, decisions, pending, reports, comments}
export async function adminOverview() {
  return get('/api/admin/overview', { auth: true });
}

// GET /api/admin/moderation?status=pending -> [experiences]
export async function adminQueue() {
  const data = await get('/api/admin/moderation', { auth: true, query: { status: 'pending' } });
  return data.items || data;
}

// POST /api/admin/moderation/:id {action} -> {ok:true}
export async function adminApprove(id) {
  await post(
    `/api/admin/moderation/${encodeURIComponent(id)}`,
    { action: 'approve' },
    { auth: true }
  );
  return { ok: true };
}

// POST /api/admin/moderation/:id {action, note} -> {ok:true}
export async function adminReject(id, note) {
  await post(
    `/api/admin/moderation/${encodeURIComponent(id)}`,
    { action: 'reject', note },
    { auth: true }
  );
  return { ok: true };
}

// GET /api/admin/reports -> [reports]
export async function adminReports() {
  const data = await get('/api/admin/reports', { auth: true });
  return data.items || data;
}

// POST /api/admin/reports/:id/resolve {action} -> {ok:true}
export async function resolveReport(id, action) {
  await post(
    `/api/admin/reports/${encodeURIComponent(id)}/resolve`,
    { action },
    { auth: true }
  );
  return { ok: true };
}

// GET /api/admin/users -> [users]
export async function adminUsers() {
  const data = await get('/api/admin/users', { auth: true });
  return data.items || data;
}

// POST /api/admin/users/:id/suspend {suspended} -> {ok:true}
export async function suspendUser(id, suspended) {
  await post(
    `/api/admin/users/${encodeURIComponent(id)}/suspend`,
    { suspended },
    { auth: true }
  );
  return { ok: true };
}

// GET /api/admin/categories -> [categories]
export async function adminCategories() {
  return get('/api/admin/categories', { auth: true });
}

// POST /api/admin/categories {name, description, icon} -> created category
export async function createCategory(data) {
  return post('/api/admin/categories', data, { auth: true });
}

// PUT /api/admin/categories/:slug -> updated category
export async function updateCategory(slug, data) {
  return put(`/api/admin/categories/${encodeURIComponent(slug)}`, data, { auth: true });
}

// GET /api/admin/analytics -> {signupsByMonth, experiencesByOutcome, topCategories}
export async function adminAnalytics() {
  return get('/api/admin/analytics', { auth: true });
}

// ---------------------------------------------------------------------------
// Categories (public)
// ---------------------------------------------------------------------------

// GET /api/categories -> [categories with counts]
export async function listCategories() {
  return get('/api/categories');
}

// GET /api/categories/:slug -> category + popular experiences
export async function getCategory(slug) {
  return get(`/api/categories/${encodeURIComponent(slug)}`);
}

// ---------------------------------------------------------------------------
// Drafts — local only in both modes (autosave lives in the browser)
// ---------------------------------------------------------------------------

function draftKey(key) {
  return `${DRAFT_PREFIX}${key}`;
}

export async function saveDraft(key, data) {
  try {
    localStorage.setItem(draftKey(key), JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    /* ignore */
  }
  return { ok: true };
}

export async function loadDraft(key) {
  try {
    const raw = localStorage.getItem(draftKey(key));
    if (!raw) return null;
    return JSON.parse(raw).data ?? null;
  } catch {
    return null;
  }
}

export async function clearDraft(key) {
  try {
    localStorage.removeItem(draftKey(key));
  } catch {
    /* ignore */
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Default export: the full API surface
// ---------------------------------------------------------------------------
const restAdapter = {
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
  changePassword,
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

export default restAdapter;

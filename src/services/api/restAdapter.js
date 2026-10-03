// DEADEND REST API adapter.
// Same function surface as mockAdapter, backed by an Express API.
// Every function throws until VITE_API_MODE=rest and VITE_API_URL are configured.

const NOT_CONFIGURED =
  'REST backend not configured. Set VITE_API_MODE=rest and VITE_API_URL to connect the Express API.';

function notConfigured() {
  return new Error(NOT_CONFIGURED);
}

// ---------------------------------------------------------------------------
// Stats / discovery
// ---------------------------------------------------------------------------

// GET /api/stats -> {experiences, decisions, contributors, countries}
export async function getStats() {
  throw notConfigured();
}

// GET /api/experiences/search?q=..&limit=6 -> [{id, slug, title, categoryLabel, outcome}]
export async function searchExperiences(query, { limit = 6 } = {}) {
  void query;
  void limit;
  throw notConfigured();
}

// GET /api/experiences?category=..&country=..&outcome=..&budget=..&experienceLevel=..&timeAvailable=..&skills=..&tags=..&q=..&sort=..&page=..&perPage=.. -> {items, total, page, totalPages}
export async function listExperiences({ filters = {}, sort = 'relevant', page = 1, perPage = 9 } = {}) {
  void filters;
  void sort;
  void page;
  void perPage;
  throw notConfigured();
}

// GET /api/experiences/:slug -> full experience + author
export async function getExperience(slug) {
  void slug;
  throw notConfigured();
}

// ---------------------------------------------------------------------------
// Experience mutations
// ---------------------------------------------------------------------------

// POST /api/experiences {title, category, goal, ...} -> created experience (status pending)
export async function createExperience(data) {
  void data;
  throw notConfigured();
}

// PUT /api/experiences/:id {fields} -> updated experience (owner or admin)
export async function updateExperience(id, data) {
  void id;
  void data;
  throw notConfigured();
}

// DELETE /api/experiences/:id -> {ok:true} (owner or admin)
export async function deleteExperience(id) {
  void id;
  throw notConfigured();
}

// ---------------------------------------------------------------------------
// Saves & folders
// ---------------------------------------------------------------------------

// POST /api/experiences/:id/save {folderId?} -> {ok:true, saved:true}
export async function saveExperience(id, folderId = null) {
  void id;
  void folderId;
  throw notConfigured();
}

// DELETE /api/experiences/:id/save -> {ok:true, saved:false}
export async function unsaveExperience(id) {
  void id;
  throw notConfigured();
}

// GET /api/saved?folderId=..&q=.. -> [{...experience, folderId, savedAt}]
export async function listSaved({ folderId, q } = {}) {
  void folderId;
  void q;
  throw notConfigured();
}

// GET /api/folders -> [{id, name, count}]
export async function listFolders() {
  throw notConfigured();
}

// POST /api/folders {name} -> created folder
export async function createFolder(name) {
  void name;
  throw notConfigured();
}

// PUT /api/folders/:id {name} -> updated folder
export async function updateFolder(id, name) {
  void id;
  void name;
  throw notConfigured();
}

// DELETE /api/folders/:id -> {ok:true}
export async function deleteFolder(id) {
  void id;
  throw notConfigured();
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

// GET /api/experiences/:id/comments -> comments with author objects
export async function listComments(experienceId) {
  void experienceId;
  throw notConfigured();
}

// POST /api/experiences/:id/comments {body} -> created comment
export async function addComment(experienceId, body) {
  void experienceId;
  void body;
  throw notConfigured();
}

// POST /api/comments/:id/reply {body} -> created reply
export async function replyComment(commentId, body) {
  void commentId;
  void body;
  throw notConfigured();
}

// POST /api/comments/:id/like -> {ok:true, liked:bool} (toggles)
export async function likeComment(id) {
  void id;
  throw notConfigured();
}

// DELETE /api/comments/:id -> {ok:true} (owner or admin)
export async function deleteComment(id) {
  void id;
  throw notConfigured();
}

// POST /api/reports {targetType, targetId, reason} -> {ok:true}
export async function reportContent(targetType, targetId, reason) {
  void targetType;
  void targetId;
  void reason;
  throw notConfigured();
}

// ---------------------------------------------------------------------------
// Similarity & AI analysis
// ---------------------------------------------------------------------------

// POST /api/similar {goal, country, budget, experienceLevel, timeAvailable, skills[]} -> {results:[{experience, score, factors}], totalInDataset}
export async function findSimilar(input) {
  void input;
  throw notConfigured();
}

// POST /api/ai/analyze {title, goal, country, budget, experienceLevel, timeAvailable, skills} -> {relevantCount, obstacles[], patterns[], questions[], relatedExperiences[], summary}
export async function aiAnalyzeDecision(input) {
  void input;
  throw notConfigured();
}

// POST /api/ai/structure {text} -> structured story draft
export async function structureStory(text) {
  void text;
  throw notConfigured();
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

// GET /api/decisions -> current user's decisions
export async function listDecisions() {
  throw notConfigured();
}

// GET /api/decisions/:id -> decision (owner or admin)
export async function getDecision(id) {
  void id;
  throw notConfigured();
}

// POST /api/decisions {title, situation, expectations} -> created decision (status planning)
export async function createDecision(data) {
  void data;
  throw notConfigured();
}

// PUT /api/decisions/:id {fields} -> updated decision
export async function updateDecision(id, data) {
  void id;
  void data;
  throw notConfigured();
}

// POST /api/decisions/:id/updates {text, stage?} -> updated decision
export async function addDecisionUpdate(id, { text, stage } = {}) {
  void id;
  void text;
  void stage;
  throw notConfigured();
}

// POST /api/decisions/:id/milestones {title, dueDate} -> updated decision
export async function addMilestone(id, { title, dueDate } = {}) {
  void id;
  void title;
  void dueDate;
  throw notConfigured();
}

// POST /api/decisions/:id/milestones/:milestoneId/toggle -> updated decision
export async function toggleMilestone(decisionId, milestoneId) {
  void decisionId;
  void milestoneId;
  throw notConfigured();
}

// POST /api/decisions/:id/complete {duration, investment, result} -> completed decision
export async function completeDecision(id, actual) {
  void id;
  void actual;
  throw notConfigured();
}

// POST /api/decisions/:id/abandon -> abandoned decision
export async function abandonDecision(id) {
  void id;
  throw notConfigured();
}

// DELETE /api/decisions/:id -> {ok:true}
export async function deleteDecision(id) {
  void id;
  throw notConfigured();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

// POST /api/auth/register {name, email, password} -> user
export async function register({ name, email, password } = {}) {
  void name;
  void email;
  void password;
  throw notConfigured();
}

// POST /api/auth/login {email, password} -> user
export async function login(email, password) {
  void email;
  void password;
  throw notConfigured();
}

// POST /api/auth/logout -> {ok:true}
export async function logout() {
  throw notConfigured();
}

// GET /api/auth/me -> user or 401
export async function me() {
  throw notConfigured();
}

// PUT /api/users/me {fields} -> updated user
export async function updateProfile(data) {
  void data;
  throw notConfigured();
}

// POST /api/auth/forgot-password {email} -> {ok:true}
export async function forgotPassword(email) {
  void email;
  throw notConfigured();
}

// POST /api/auth/reset-password {token, password} -> {ok:true}
export async function resetPassword(token, password) {
  void token;
  void password;
  throw notConfigured();
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

// GET /api/notifications -> user's notifications
export async function listNotifications() {
  throw notConfigured();
}

// PATCH /api/notifications/:id/read -> {ok:true}
export async function markNotificationRead(id) {
  void id;
  throw notConfigured();
}

// PATCH /api/notifications/read-all -> {ok:true}
export async function markAllNotificationsRead() {
  throw notConfigured();
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

// GET /api/admin/overview -> {users, experiences, decisions, pending, reports, comments}
export async function adminOverview() {
  throw notConfigured();
}

// GET /api/admin/queue -> pending experiences with authors
export async function adminQueue() {
  throw notConfigured();
}

// POST /api/admin/experiences/:id/approve -> {ok:true}
export async function adminApprove(id) {
  void id;
  throw notConfigured();
}

// POST /api/admin/experiences/:id/reject {note} -> {ok:true}
export async function adminReject(id, note) {
  void id;
  void note;
  throw notConfigured();
}

// GET /api/admin/reports -> open/resolved reports
export async function adminReports() {
  throw notConfigured();
}

// POST /api/admin/reports/:id/resolve {action} -> {ok:true}
export async function resolveReport(id, action) {
  void id;
  void action;
  throw notConfigured();
}

// GET /api/admin/users -> users with suspension flags
export async function adminUsers() {
  throw notConfigured();
}

// POST /api/admin/users/:id/suspend {suspended} -> {ok:true}
export async function suspendUser(id, suspended) {
  void id;
  void suspended;
  throw notConfigured();
}

// GET /api/admin/categories -> all categories
export async function adminCategories() {
  throw notConfigured();
}

// POST /api/admin/categories {name, description, icon} -> created category
export async function createCategory(data) {
  void data;
  throw notConfigured();
}

// PUT /api/admin/categories/:slug {fields} -> updated category
export async function updateCategory(slug, data) {
  void slug;
  void data;
  throw notConfigured();
}

// GET /api/admin/analytics -> {signupsByMonth, experiencesByOutcome, topCategories}
export async function adminAnalytics() {
  throw notConfigured();
}

// ---------------------------------------------------------------------------
// Categories (public)
// ---------------------------------------------------------------------------

// GET /api/categories -> categories with counts
export async function listCategories() {
  throw notConfigured();
}

// GET /api/categories/:slug -> category + popular experiences
export async function getCategory(slug) {
  void slug;
  throw notConfigured();
}

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------

// Local draft helpers (no REST equivalent; kept client-side in both modes)
export async function saveDraft(key, data) {
  void key;
  void data;
  throw notConfigured();
}

export async function loadDraft(key) {
  void key;
  throw notConfigured();
}

export async function clearDraft(key) {
  void key;
  throw notConfigured();
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

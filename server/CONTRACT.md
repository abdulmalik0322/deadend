# DEADEND API Contract (canonical — law for frontend + backend)

Base URL: `{VITE_API_URL}` (e.g. `https://deadend-api.onrender.com`). All paths below are prefixed with `/api`.
Auth: `Authorization: Bearer <redacted>` header. No cookies, no sessions.
Errors: `{ "error": "message", "details?": [...] }` with proper HTTP status codes. Never leak stack traces in production.

Conventions:
- IDs in JSON are strings named `id` (Mongo `_id` mapped).
- Timestamps are ISO-8601 strings.
- List endpoints return `{ items: [], total, page, pages, limit }` UNLESS noted.
- `protect` = requires valid Bearer <redacted> `adminOnly` = requires role=admin.

---

## Presented shapes (what the server returns; the frontend adapter maps 1:1)

**User**: `{ id, name, username, email, bio, country, role, publicProfile, stats: { experiences, decisionsCompleted, contributions }, createdAt }` — never passwordHash.

**Experience**:
```json
{
  "id": "...", "slug": "i-tried-freelancing-for-8-months", "title": "...",
  "category": "freelancing", "categoryLabel": "Freelancing",
  "country": "Pakistan", "goal": "...", "description": "...",
  "duration": "8 months", "investmentDisplay": "$120 invested",
  "outcome": "successful|partially_successful|unsuccessful|abandoned",
  "mainObstacle": "...", "tags": ["..."], "privacy": "public|anonymous|private",
  "status": "draft|pending|approved|rejected", "rejectionNote": "",
  "author": { "id": "...", "name": "...", "username": "...", "country": "..." },
  "startingPoint": { "education": "", "experienceLevel": "", "budget": "", "timeAvailable": "", "location": "", "skills": [] },
  "timeline": [{ "label": "", "text": "" }],
  "investment": { "money": "", "time": "", "tools": [] },
  "obstacles": [], "whatWorked": [], "lessons": [], "doDifferently": [],
  "stats": { "views": 0, "saves": 0, "comments": 0 },
  "saved": false, "createdAt": "...", "updatedAt": "..."
}
```
- If `privacy === "anonymous"` and viewer is NOT owner/admin → `author = { "anonymous": true, "name": "Anonymous" }`.
- `category` is the category **slug** (frontend filters send slugs); `categoryLabel` is the display name.

**Decision**:
```json
{
  "id": "...", "decisionId": "D-10482", "title": "...", "status": "planning|active|completed|abandoned",
  "visibility": "public|private", "progress": 0,
  "situation": { "location": "", "education": "", "experience": "", "budget": "", "timeAvailable": "", "skills": [] },
  "expectations": { "duration": "", "investment": "", "expectedResult": "", "goal": "" },
  "actual": { "duration": "", "investment": "", "result": "" },
  "timeline": [{ "stage": "", "date": "", "note": "", "done": false }],
  "milestones": [{ "id": "...", "title": "", "done": false, "dueDate": null }],
  "updates": [{ "id": "...", "date": "", "text": "", "stage": "" }],
  "createdAt": "...", "updatedAt": "..."
}
```

**Comment**: `{ id, experienceId, authorId, authorName, body, likes, likedByMe, parentId: null, replies: [same shape, parentId set], createdAt }`

**Notification**: `{ id, type, title, body, link, read, createdAt }`

**Folder**: `{ id, name, count }`

---

## Auth — `/api/auth`
| Method | Path | Auth | Body | Success |
|---|---|---|---|---|
| POST | /api/auth/register | — | `{ name (2-120), email, password (≥8) }` | 201 `{ token, user }`; 409 if email taken |
| POST | /api/auth/login | — | `{ email, password }` | 200 `{ token, user }`; 401 bad creds; 403 suspended |
| POST | /api/auth/logout | — | — | 200 `{ ok: true }` |
| GET | /api/auth/me | protect | — | 200 user |
| PUT | /api/auth/profile | protect | `{ name?, bio? (≤500), country?, publicProfile? }` | 200 user |
| PUT | /api/auth/password | protect | `{ currentPassword, newPassword (≥8) }` | 200 `{ ok: true }`; 401 if current wrong |
| POST | /api/auth/forgot-password | — (rate-limited) | `{ email }` | 200 `{ ok: true }` always (no email oracle); **503 `{ error: "email_not_configured", message: "Password reset email is not configured" }`** when SMTP env missing |
| POST | /api/auth/reset-password | — (rate-limited) | `{ token, password (≥8) }` | 200 `{ ok: true }`; 400 invalid/expired token |

JWT: HS256, `JWT_SECRET`, expiry 7d, payload `{ sub: userId, role }`.

## Experiences — `/api/experiences`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/experiences | optional | Query: `category` (slug), `country`, `outcome`, `outcomes` (csv), `goal` (substring), `budget` (label e.g. "Under $500"), `budgetMin`, `budgetMax`, `experienceLevel`, `timeAvailable`, `skills` (csv), `tags` (csv), `q` (full-text), `sort` = `relevant`\|`recent`\|`discussed`\|`saves`, `status` (admin only), `page`, `limit` (≤50). Public = approved AND privacy != private. Owner sees own non-approved too. → `{ items, total, page, pages, limit }` |
| GET | /api/experiences/search | — | `?q=&limit=` → `[{ id, slug, title, categoryLabel, outcome }]` (public only) |
| GET | /api/experiences/:slug | optional | Visibility: approved+non-private, or owner, or admin → presented experience (+`saved` when authed). 404 otherwise |
| POST | /api/experiences/:id/view | optional | Increments `stats.views` (once per caller token/IP per hour — best effort) → `{ ok: true, views }` |
| POST | /api/experiences | protect | Body: whitelisted experience fields. → 201 presented; `status: "pending"` (admin-created → `"approved"`) |
| PATCH | /api/experiences/:id | protect | Owner or admin. Title change regenerates slug. → presented |
| DELETE | /api/experiences/:id | protect | Owner or admin. Cascades saves/comments. → `{ ok: true }` |
| POST | /api/experiences/:id/save | protect | Body `{ folderId? }` → 201 `{ ok: true, saved: true }`; 409 if already saved |
| DELETE | /api/experiences/:id/save | protect | → `{ ok: true, saved: false }` |
| GET | /api/experiences/:id/comments | optional | Same visibility as experience → `{ items: [Comment] }` (flat, replies nested) |
| POST | /api/experiences/:id/comments | protect | `{ body (1-2000), parentId? }` → 201 Comment; notifies experience owner |

## Comments — `/api/comments`
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /api/comments/:id/reply | protect | `{ body (1-2000) }` → 201 reply Comment |
| POST | /api/comments/:id/like | protect | Toggles → `{ ok: true, liked, likes }` |
| DELETE | /api/comments/:id | protect | Owner or admin → `{ ok: true }` |

## Saved — `/api/saved` (protect all)
| Method | Path | Notes |
|---|---|---|
| GET | /api/saved | `?folderId=&q=` → `[ { ...presentedExperience, folderId, savedAt } ]` (array) |
| GET | /api/saved/folders | → `[Folder]` |
| POST | /api/saved/folders | `{ name (1-60) }` → 201 Folder |
| PATCH | /api/saved/folders/:id | `{ name }` → Folder |
| DELETE | /api/saved/folders/:id | → `{ ok: true }` |

## Decisions — `/api/decisions` (protect all, owner-scoped)
| Method | Path | Notes |
|---|---|---|
| GET | /api/decisions | `?status=` → `{ items, total, page, pages }` |
| POST | /api/decisions | `{ title, question?, situation?, expectations?, visibility? (default "private") }` → 201 Decision, `status: "planning"`, `decisionId: "D-xxxxx"` |
| GET | /api/decisions/:id | → Decision |
| PATCH | /api/decisions/:id | Whitelisted fields; status transitions validated: planning→active→completed/abandoned; completed/abandoned are terminal |
| DELETE | /api/decisions/:id | → `{ ok: true }` |
| POST | /api/decisions/:id/updates | `{ text (1-2000), stage? }` → 201 the new update |
| POST | /api/decisions/:id/milestones | `{ title (1-120), dueDate? }` → 201 the new milestone |
| PATCH | /api/decisions/:id/milestones/:mid | `{}` toggles, `{ done: bool }` sets → `{ milestone, progress }` |
| POST | /api/decisions/:id/complete | `{ actualInvestment?, actualDuration?, actualResult?, outcome? }` → 200 Decision (status completed, progress 100; creates Outcome snapshot) |
| POST | /api/decisions/:id/abandon | → 200 Decision (status abandoned) |

## Similarity
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /api/similar | — | `{ goal?, country?, budget?, experienceLevel?, timeAvailable?, skills?[] }` → `{ results: [{ experience, score (0-100), factors: [{ key, label, pct, detail }] }], totalInDataset }`. Weights: goal 30, country 15, experience 20, budget 15, time 10, skills 10. Label: "platform-generated relevance score". |

## AI — `/api/ai` (protect, rate-limited)
| Method | Path | Notes |
|---|---|---|
| POST | /api/ai/analyze | `{ goal?, country?, budget?, experienceLevel?, timeAvailable?, skills? }` → `{ input, datasetStats: { total, outcomeDistribution, topObstacles: [{text,count}], topWhatWorked: [{text,count}] }, patterns: [{ title, text, records, total }], questions: [string], related: [presented experiences] }`. ALL counts real. Sections labeled generated. |
| POST | /api/ai/structure | `{ text (10-5000) }` → `{ goal, startingPoint: {...}, timeline: [], investment: { money, time, tools[] }, outcome: null, obstacles: [], lessons: [], doDifferently: [], generated: true }`. Rule-based extraction; never invents; empty stays empty. |

## Search
| Method | Path | Notes |
|---|---|---|
| GET | /api/search | `?q=&limit=` → `{ experiences: [...], categories: [...], tags: [...] }` (public only) |
| GET | /api/search/suggestions | `?q=&limit=` → `[{ type: "experience"|"category"|"tag", label, slug }]` |

## Stats
| Method | Path | Notes |
|---|---|---|
| GET | /api/stats | → `{ experiences, decisions, contributors, countries }` — real counts |

## Categories
| Method | Path | Notes |
|---|---|---|
| GET | /api/categories | → `[{ slug, name, description, icon, count }]` (real approved counts) |
| GET | /api/categories/:slug | → `{ slug, name, description, icon, count, popularSearches, popular: [presented experiences ×4], stats: {...} }` |

## Users
| Method | Path | Notes |
|---|---|---|
| GET | /api/users/:username | Public profile; respects `publicProfile=false` (limited shape); never email/hash → `{ id, name, username, bio, country, role?, publicProfile, stats, createdAt }` |
| GET | /api/users/me/stats | protect → `{ ... }` (existing) |

## Notifications — `/api/notifications` (protect)
| Method | Path | Notes |
|---|---|---|
| GET | /api/notifications | → `[Notification]` newest first (array) |
| PATCH | /api/notifications/:id/read | → `{ ok: true }` |
| PATCH | /api/notifications/read-all | → `{ ok: true }` |

Server generates notifications for: comment on your experience, reply to your comment, someone saved your experience, your experience approved/rejected. (Milestone-due reminders are computed client-side on dashboard fetch — no cron on free tier.)

## Reports
| Method | Path | Notes |
|---|---|---|
| POST | /api/reports | protect. `{ targetType: "experience"|"comment"|"user", targetId, reason: spam|harassment|false_information|privacy_violation|dangerous_content|other, details? }` → 201 `{ ok: true, id }` |

## Admin — `/api/admin` (protect + adminOnly)
| Method | Path | Notes |
|---|---|---|
| GET | /api/admin/overview | → `{ users, experiences, decisions, pending, reports, comments }` |
| GET | /api/admin/moderation | `?status=pending` → `[presented experiences + author]` |
| POST | /api/admin/moderation/:id | `{ action: "approve"|"reject", note? }` → `{ ok: true }`; notifies owner |
| GET | /api/admin/reports | → `[reports]` newest first |
| POST | /api/admin/reports/:id/resolve | `{ action: "resolved"|"dismissed", note? }` → `{ ok: true }` |
| GET | /api/admin/users | `?search=&page=` → `{ items: [User + suspended], total, page, pages }` |
| POST | /api/admin/users/:id/suspend | `{ suspended: bool }` → `{ ok: true }` |
| GET | /api/admin/categories | → all categories |
| POST | /api/admin/categories | `{ name, description?, icon? }` → 201 |
| PUT | /api/admin/categories/:slug | → 200 |
| GET | /api/admin/analytics | → `{ signupsByMonth: [{month, count}], experiencesByOutcome: [{outcome, count}], topCategories: [{slug, name, count}] }` |

## Setup (bootstrap only)
Guarded by `x-setup-key` header, constant-time compared against `SETUP_KEY`. If `SETUP_KEY` is unset → 404 (route disabled).
| Method | Path | Notes |
|---|---|---|
| POST | /api/setup/seed | Idempotent: if any users exist → `{ ok: true, skipped: true }`. Else seeds 10 fictional users (random unguessable passwords), 18 approved+public experiences (2 anonymous), decisions, comments, categories. |
| POST | /api/setup/promote | `{ email }` → sets `role: "admin"`. → `{ ok: true }` |

---

## Frontend adapter mapping (restAdapter.js)
The frontend's existing function surface (60 fns, same names) is preserved. restAdapter implements each via fetch:
- Token storage: `localStorage["deadend_token"]`; header `Authorization: Bearer <redacted>`.
- `login`/`register` return `data.user` (token stored); `me`/`updateProfile` return user.
- `listExperiences` maps `{ pages }` → `{ totalPages }`; filters passed as query params (`outcomes` → csv).
- `getExperience(slug)`: GET experience, then POST `/:id/view` (fire-and-forget), return experience.
- `saveDraft`/`loadDraft`/`clearDraft` stay **localStorage-only** (no REST equivalent).
- Error mapping: HTTP 401 → Error("Invalid email or password"); 403 with "suspend" → Error("This account has been suspended"); 409 on register → Error("An account with this email already exists"); else Error(server `error` message).
- Mode selection: `VITE_API_MODE=rest`, OR `VITE_API_URL` set (even if MODE unset) → rest adapter.

---

## Deployment (production path: Vercel serverless)

- **Primary: Vercel (Hobby, free).** The API ships as a serverless function: `api/index.js` (repo root) wraps the Express `server/app.js`, caches the Mongoose connection on `globalThis` across warm invocations, and connects lazily per cold start. `vercel.json` rewrites `/api/*` → `/api/index.js` with `maxDuration: 10`. Cold starts are ~200ms; there is no sleep/idle shutdown. The frontend stays on GitHub Pages and calls the API via `VITE_API_URL=https://<project>.vercel.app` with `VITE_API_MODE=rest`; CORS allows `CLIENT_URL=https://abdulmalik0322.github.io` (Bearer headers, no cookies).
- **Fallback: Render** (`render.yaml` at repo root, kept as a documented alternative). Note: Render's free tier sleeps after ~15 min idle, causing 30–60s cold starts — Vercel is the recommended production path.
- **Local dev:** `cd server && npm run dev` (or `node server.js`).

### Environment variables (identical on Vercel and Render)
`MONGODB_URI` (Atlas connection string), `JWT_SECRET` (long random string), `JWT_EXPIRES_IN` (default `7d`), `CLIENT_URL` (frontend origin), `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (password reset email; if unset, forgot-password returns 503 `email_not_configured`), `SETUP_KEY` (bootstrap guard; if unset, `/api/setup/*` returns 404), `NODE_ENV=production`, `PORT` (local/Render only).

### Bootstrap order on a fresh database
1. Deploy, set env vars.
2. `POST /api/setup/promote` with header `x-setup-key: <SETUP_KEY>` and body `{ "email": "<your email>" }` — after registering that email in the app — to make yourself admin. (Or `POST /api/setup/seed` first for demo content; it is idempotent and skips when users exist.)
3. Rotate or unset `SETUP_KEY` afterwards to disable the setup routes.

# DEADEND — Server

Backend API for **DEADEND** ("Before You Decide, See What Happened.") — a structured
knowledge platform where people share what they tried, what it cost, and what actually
happened, so others can decide with real before/after evidence.

Stack: Node.js (ESM) + Express 4 + Mongoose 8 + JWT + bcryptjs + express-validator +
helmet + cors + express-rate-limit + morgan + dotenv + slugify.

## Setup

```bash
cd server
cp .env.example .env        # then edit values
# npm install               # install dependencies (do this once)
npm run seed                # seed dev data (demo + admin users, categories, samples)
npm run dev                 # start with --watch
```

`npm start` runs without the watcher (production). Requires MongoDB running locally
or a `MONGODB_URI` pointing at MongoDB Atlas (see `.env.example`).

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | HTTP port |
| `MONGODB_URI` | `mongodb://localhost:27017/deadend` | MongoDB connection string (Atlas URI in prod) |
| `JWT_SECRET` | `change-me-in-production` | Secret for signing JWTs — **must** be changed in prod |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin(s), comma-separated |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate-limit window (15 min) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window per IP (general API) |

## How the frontend connects

Set in the frontend `.env`:

```
VITE_API_MODE=rest
VITE_API_URL=http://localhost:5000
```

The frontend calls `VITE_API_URL + /api/...` and sends the JWT as
`Authorization: Bearer <token>`. When `VITE_API_MODE` is anything else, the
frontend falls back to its local dataset (`src/data/seed.js`).

## Auth scheme

- `POST /api/auth/register` / `POST /api/auth/login` return `{ token, user }`.
- Every protected route needs `Authorization: Bearer <token>`.
- Token payload: `{ sub: userId, role }`. `protect` middleware sets `req.user = { id, role }`.
- Roles: `user` (default), `admin`. Admin routes use `authorize('admin')`.
- Logout is stateless: the client discards the token (`POST /api/auth/logout` just confirms).
- Forgot/reset password are **mock** flows for development — wire a real email provider before launch.

## Endpoints

Base URL: `http://localhost:5000/api`. Auth column: `–` public, `U` logged-in user, `A` admin.

### Health / search / users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | – | Health check |
| GET | `/search?q=...` | – | Global search → `{ experiences, categories, tags }` |
| GET | `/users/me/stats` | U | Current user's dashboard stats |
| GET | `/users/:username` | – | Public profile (respects `publicProfile`) |

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | – | Register (username derived from email) |
| POST | `/auth/login` | – | Login → `{ token, user }` |
| GET | `/auth/me` | U | Current user |
| POST | `/auth/logout` | – | Stateless logout message |
| POST | `/auth/forgot-password` | – | Mock reset request |
| POST | `/auth/reset-password` | – | Mock reset (email, token, newPassword) |
| PATCH | `/auth/profile` | U | Update name, bio, country, publicProfile |

### Experiences

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/experiences` | – | List w/ filters (`category`, `country`, `outcome`, `tags`, `q`), `sort=newest\|oldest\|popular`, pagination |
| GET | `/experiences/:slug` | – | Detail (visibility rules apply; increments views) |
| POST | `/experiences` | U | Create → `status: pending`, slug auto-generated |
| PATCH | `/experiences/:id` | U | Update (owner or admin) |
| DELETE | `/experiences/:id` | U | Delete + cascade saves/comments (owner or admin) |
| POST | `/experiences/:id/save` | U | Bookmark (optional `{ folder }`) |
| DELETE | `/experiences/:id/save` | U | Remove bookmark |
| POST | `/experiences/:id/report` | U | File a moderation report |

### Decisions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/decisions` | U | Owner's decisions (`?status=` filter) |
| POST | `/decisions` | U | Create (auto `decisionId`, e.g. `D-10482`) |
| GET | `/decisions/:id` | U | Detail (owner or admin) |
| PATCH | `/decisions/:id` | U | Update |
| DELETE | `/decisions/:id` | U | Delete (+ its Outcome) |
| POST | `/decisions/:id/updates` | U | Append dated progress note |
| POST | `/decisions/:id/milestones` | U | Add milestone |
| PATCH | `/decisions/:id/milestones/:milestoneId` | U | Toggle done (recomputes progress) |
| POST | `/decisions/:id/complete` | U | Complete → snapshots before/after `Outcome` |
| POST | `/decisions/:id/abandon` | U | Mark abandoned |

### Categories

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/categories` | – | List all |
| GET | `/categories/:slug` | – | Detail + popular searches + experience count |
| POST | `/categories` | A | Create (slug derived from name if omitted) |
| PATCH | `/categories/:slug` | A | Update |

### Comments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/comments?experienceId=...` | – | Visible comments as a reply tree |
| POST | `/comments` | U | Create (`experienceId`, `body`); notifies author |
| POST | `/comments/:id/replies` | U | Reply to a comment |
| POST | `/comments/:id/like` | U | Toggle like |
| DELETE | `/comments/:id` | U | Delete (owner or admin) |
| POST | `/comments/:id/report` | U | Report a comment |

### Saved & folders

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/saved` | U | Saved list (`?folder=` filter), populated |
| GET | `/saved/folders` | U | List folders |
| POST | `/saved/folders` | U | Create folder |
| PATCH | `/saved/folders/:id` | U | Rename folder |
| DELETE | `/saved/folders/:id` | U | Delete folder (items become unfiled) |

### Notifications & reports

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | U | List (`?unread=true`), includes unread count |
| PATCH | `/notifications/:id/read` | U | Mark one read |
| POST | `/notifications/read-all` | U | Mark all read |
| POST | `/reports` | U | File a report (`targetType`, `targetId`, `reason`) |
| GET | `/reports` | A | Triage queue (`?status=`, `?targetType=`) |
| PATCH | `/reports/:id` | A | Resolve (`resolved`/`dismissed`) |

### AI (stub)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/ai/analyze` | U | `{ input }` → honest dataset-statistics summary (no predictions) |
| POST | `/ai/structure` | U | `{ text }` → Experience-shaped draft for review |

See `services/ai.service.js` for where a real LLM plugs in and the guardrails
(never predict, always label AI output, never invent statistics).

### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/admin/overview` | A | Platform counts |
| GET | `/admin/queue` | A | Pending experiences (oldest first) |
| PATCH | `/admin/experiences/:id/approve` | A | Approve + notify author |
| PATCH | `/admin/experiences/:id/reject` | A | Reject (requires `rejectionNote`) + notify |
| GET | `/admin/users` | A | User list (`?suspended=true`) |
| PATCH | `/admin/users/:id/suspend` | A | Suspend/unsuspend (`{ suspended }`) |
| GET | `/admin/analytics` | A | Event counts by type/day, last 30 days |

## Pagination & errors

- List endpoints accept `?page=` / `?limit=` (max 100) and return
  `{ page, limit, total, pages, items }` (notifications add `unread`).
- Errors are JSON: `{ error, details? }`. Validation failures → `422`,
  bad ids → `400`, duplicates → `409`, auth → `401`, forbidden → `403`.

## Rate limits

- General API: 100 req / 15 min per IP (env-tunable).
- Auth endpoints: 20 req / 15 min per IP.
- AI endpoints: 30 req / hour per IP.

## Security notes

- `helmet` headers, CORS restricted to `CLIENT_URL`, JSON body limit 1 MB.
- Passwords hashed with bcrypt (cost 12); `passwordHash` is `select: false`.
- JWTs are short-lived bearer tokens — store them securely on the client.
- `suspended` users cannot log in; private experiences/profiles are never
  exposed publicly; admin-only routes are role-gated.
- Change `JWT_SECRET`, use an Atlas URI with a strong password, set
  `NODE_ENV=production`, and replace the mock password-reset flow before launch.
- No secrets are committed: `.env` is gitignored (see `.env.example`).

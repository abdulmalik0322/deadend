# DEADEND — Before You Decide, See What Happened.

DEADEND is a structured knowledge platform for learning from real human decisions and outcomes.
Its core idea: **before you make a decision, see what happened to people who made a similar one.**

People share structured experiences (goal, starting situation, timeline, investment, outcome,
obstacles, lessons). The platform turns those into searchable data, matches similar situations,
tracks decisions before/after, and produces honest, evidence-backed analysis — never predictions.

Live site: **https://abdulmalik0322.github.io/deadend/** (frontend, GitHub Pages)

> **Production.** The frontend talks to a real backend: an Express API deployed as
> Vercel serverless functions + MongoDB Atlas (see *Production deployment* below).
> The in-browser mock adapter (fictional sample data in `src/data/seed.js`) is still
> available for local demos via `VITE_API_MODE=mock`.

## Quick start

**Frontend** (GitHub Pages build):

```bash
cd ~/workspace/deadend
npm install
npm run dev      # http://localhost:5173 (mock data by default)
```

```bash
npm run build    # production build -> dist/
npm run preview  # preview the production build
```

**Backend** (local):

```bash
cd server
npm install
cp .env.example .env   # fill in MONGODB_URI (Atlas) and the rest
npm run dev            # node --watch server.js
npm test               # 49-step integration + serverless-wrapper suite
```

## Local demo credentials (mock adapter only)

These work only with `VITE_API_MODE=mock` (localStorage demo data). Real accounts
register through the app against the live API.

| Role        | Email              | Password   |
|-------------|--------------------|------------|
| Contributor | demo@deadend.app   | demo1234   |
| Admin       | admin@deadend.app  | admin1234  |

Use the Admin account to try the moderation queue, reports, users, and analytics at `/admin`.

## Project structure

```
deadend/
  index.html                 # SEO/OG meta, fonts, SPA fallback for GitHub Pages
  public/                    # robots.txt, sitemap.xml, 404.html, favicon.svg
  vite.config.js             # base: '/deadend/' for GitHub Pages project site
  src/
    main.jsx                 # entry: router, AuthProvider, ToastProvider, styles
    App.jsx                  # route table (semantic slugs, e.g. /experiences/freelancing-for-8-months)
    styles/                  # tokens.css (design tokens), base.css (reset, a11y, motion)
    data/seed.js             # 10 users, 20 experiences, 10 decisions, 10 categories, comments, ...
    utils/                   # format.js, similarity.js (relevance scoring), icons.jsx (inline SVG)
    hooks/                   # useReveal (scroll reveal), useCountUp, useDocumentTitle
    context/AuthContext.jsx  # auth state: login/register/logout/updateProfile
    components/              # 26 reusable components (Navbar, Footer, ExperienceCard,
                             #   DecisionCard, SearchBar, FilterPanel, SimilarityCard,
                             #   Timeline, StatsCard, Modal, Toast, Skeleton, EmptyState,
                             #   ErrorState, OutcomeBadge, Pagination, TagList, Avatar,
                             #   ProgressBar, StepWizard, BeforeAfterCompare, CommentThread,
                             #   NotificationItem, FolderList, AdminTable, RequireAuth)
    pages/                   # 27 routed pages (Home, Explore, ExperienceDetail, Share,
                             #   Decisions, DecisionNew, DecisionDetail, Similar, Analysis,
                             #   Categories, CategoryDetail, HowItWorks, Profile, Dashboard,
                             #   Saved, Notifications, Login, Register, ForgotPassword,
                             #   ResetPassword, About, Contact, Terms, Privacy, Guidelines,
                             #   Admin, NotFound)
    services/api/
      index.js               # THE ONLY import pages/components use: `import { api } from ...`
      mockAdapter.js         # full demo implementation over seed data (localStorage persistence)
      restAdapter.js         # same signatures; throws until a REST backend is configured,
                             #   with the endpoint contract documented per function
  server/                    # Production Express + Mongoose API (see server/CONTRACT.md)
  api/index.js               # Vercel serverless entry: wraps the Express app,
                             #   caches the Mongoose connection across invocations
  vercel.json                # /api/* -> serverless function (primary production host)
  render.yaml                # documented fallback host (Render free tier sleeps when idle)
```

## API layer

Pages and components never touch data directly — they call `api.*` from
`src/services/api/index.js`, which selects the adapter:

- `VITE_API_MODE=rest` → REST adapter (real backend)
- `VITE_API_MODE=mock` → mock adapter (localStorage demo data)
- **`VITE_API_URL` set (MODE unset) → REST adapter** (production default)

Token storage: `localStorage["deadend_token"]`, sent as `Authorization: Bearer <token>`.

### Connecting the frontend to the real backend

Local dev:

1. Start the API: `cd server && npm install && cp .env.example .env`
   (point `MONGODB_URI` at MongoDB Atlas) `&& npm run dev`.
2. Create `.env` in the project root:
   ```
   VITE_API_MODE=rest
   VITE_API_URL=http://localhost:5000
   ```
3. `npm run dev` — the app now talks to Express instead of the mock adapter.

Production (GitHub Pages → Vercel API): set the Pages build env to
`VITE_API_MODE=rest` and `VITE_API_URL=https://<your-vercel-project>.vercel.app`.

The REST contract (method + path + body + response shape) is law in
`server/CONTRACT.md` and implemented per-function in
`src/services/api/restAdapter.js`.

## Production deployment

**Architecture:** React SPA on GitHub Pages → Express API as Vercel serverless
functions (`api/index.js` wraps `server/app.js`; Mongoose connection cached on
`globalThis` across warm invocations) → MongoDB Atlas. Vercel was chosen over
Render as the primary host because Render's free tier sleeps after ~15 min idle
(30–60s cold starts); Vercel cold starts are ~200ms with no sleep page.

### Deploy the API to Vercel

1. Push this repo to GitHub; import it in Vercel (framework preset: **Other**).
2. Set environment variables (see `server/.env.example` for details):

   | Variable | Notes |
   |---|---|
   | `MONGODB_URI` | MongoDB Atlas connection string |
   | `JWT_SECRET` | long random string (64+ chars) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `CLIENT_URL` | `https://abdulmalik0322.github.io` |
   | `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `SMTP_FROM` | password-reset email; if unset, forgot-password returns 503 `email_not_configured` |
   | `SETUP_KEY` | bootstrap guard (see below); unset disables `/api/setup/*` (404) |
   | `NODE_ENV` | `production` |

3. Deploy. `vercel.json` routes `/api/*` to the function (`maxDuration: 10`).
   The frontend is NOT bundled into Vercel — it stays on GitHub Pages.

### Bootstrap a fresh database (in order)

1. Register your own account in the live app.
2. `POST https://<project>.vercel.app/api/setup/promote` with header
   `x-setup-key: <SETUP_KEY>` and body `{ "email": "<your email>" }` → you are admin.
   (Optionally run `POST /api/setup/seed` first for demo content — it is idempotent
   and skips when users already exist. Seeded users get random unguessable passwords
   and cannot log in.)
3. Rotate or unset `SETUP_KEY` afterwards to disable the setup routes.

### Fallback: Render

`render.yaml` (repo root) deploys the same code as a classic Node web service
(`rootDir: server`, `node server.js`). Kept as a documented alternative; note the
free-tier sleep behavior above.

## Design

- Near-black dark UI (`#0A0A0B`), charcoal surfaces, 1px subtle borders, 8–14px radii.
- Inter typeface, strong hierarchy. Amber (`#F59E0B`) accent used sparingly.
- No gradients-as-decoration, no glassmorphism excess, no emojis (inline SVG icons only).
- Responsive (320 → 1920px), keyboard-friendly, visible focus states, skeleton loaders,
  empty/error states everywhere, `prefers-reduced-motion` respected.

## Backend (`server/`)

Production Node.js + Express + Mongoose API: JWT (HS256, 7d) + bcrypt-12 auth,
express-validator on all inputs, helmet, CORS (Bearer headers, no cookies),
rate limits (global 300/15min, auth 20/15min, AI 30/hour), ownership checks,
HTML-stripped user text, Mongo indexes (text search on experiences, category,
country, outcome, userId, createdAt, tags).

`server/CONTRACT.md` is the canonical endpoint reference (every route, auth,
body, response). `npm test` runs the 49-step integration + serverless-wrapper
suite against an in-memory MongoDB — all green. Similarity scoring in
`server/services/similarity.service.js` uses the documented weights
(goal 30 / experience 20 / country 15 / budget 15 / time 10 / skills 10) and is
labeled a "platform-generated relevance score"; `server/services/ai.service.js`
computes real dataset stats and never invents figures.

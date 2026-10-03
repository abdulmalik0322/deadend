# DEADEND — Before You Decide, See What Happened.

DEADEND is a structured knowledge platform for learning from real human decisions and outcomes.
Its core idea: **before you make a decision, see what happened to people who made a similar one.**

People share structured experiences (goal, starting situation, timeline, investment, outcome,
obstacles, lessons). The platform turns those into searchable data, matches similar situations,
tracks decisions before/after, and produces honest, evidence-backed analysis — never predictions.

Live demo: **https://abdulmalik0322.github.io/deadend/**

> **Demo mode.** This build runs entirely in the browser against fictional sample data
> (see `src/data/seed.js`). It is clearly labeled "Demo dataset" in the footer.
> Nothing here is a real backend — see *Connecting the real backend* below.

## Quick start

```bash
cd ~/workspace/deadend
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # production build -> dist/
npm run preview  # preview the production build
```

## Demo credentials

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
  server/                    # Express + Mongoose backend scaffold (see server/README.md)
```

## API layer

Pages and components never touch data directly — they call `api.*` from
`src/services/api/index.js`, which selects the adapter via `VITE_API_MODE`
(default: `mock`).

### Connecting the real backend

1. Start the API: `cd server && npm install && cp .env.example .env` (point
   `MONGODB_URI` at MongoDB Atlas) `&& npm run dev`.
2. Create `.env` in the project root:
   ```
   VITE_API_MODE=rest
   VITE_API_URL=http://localhost:5000
   ```
3. `npm run dev` — the app now talks to Express instead of the mock adapter.

The REST contract (method + path + body shape) is documented above every function
in `src/services/api/restAdapter.js` and implemented in `server/`.

## Design

- Near-black dark UI (`#0A0A0B`), charcoal surfaces, 1px subtle borders, 8–14px radii.
- Inter typeface, strong hierarchy. Amber (`#F59E0B`) accent used sparingly.
- No gradients-as-decoration, no glassmorphism excess, no emojis (inline SVG icons only).
- Responsive (320 → 1920px), keyboard-friendly, visible focus states, skeleton loaders,
  empty/error states everywhere, `prefers-reduced-motion` respected.

## Backend scaffold (`server/`)

Node.js + Express + Mongoose + JWT + bcrypt, organized per spec:
`config/ controllers/ middleware/ models/ routes/ services/ utils/ validators/`,
plus `seed/seed.js` and a full endpoint reference in `server/README.md`.
Similarity scoring in `server/services/similarity.service.js` mirrors the frontend
weights; `server/services/ai.service.js` is a documented stub with guardrails
(never predicts, labels AI output, separates user input / dataset stats / AI summary).

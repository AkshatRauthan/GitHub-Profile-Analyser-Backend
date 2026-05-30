# GitHub Profile Analyser — Backend API

A Node.js backend that helps recruiters and hiring teams **analyze, compare, and rank GitHub developers** using real public data — instead of manually opening profiles one by one.

Built with **Node.js**, **Express**, **TypeScript**, **MySQL**, **Prisma**, and the **GitHub API** (REST + GraphQL).

---

## The problem

Hiring developers from GitHub is painful and inconsistent:

- A recruiter opens dozens of profiles by hand and judges them subjectively in a few seconds.
- There is no structured way to compare candidates on **languages, project quality, activity, or documentation**.
- GitHub shows raw data (repos, stars, green squares) but not **“how good is this person for a Frontend / Backend / DevOps role?”**
- Teams cannot **save, search, or re-rank** profiles they have already reviewed.
- Screening the same candidate twice gives no history of what was checked or when.

**Problem statement:**  
*How can we turn a public GitHub username into stored, searchable, role-specific insights so a team can screen developers faster and more fairly?*

---

## What we are building

**GitHub Profile Analyser** is a REST API that:

1. Lets authenticated users **analyze** any public GitHub profile and **persist** useful metrics in MySQL.
2. Lets users **search and filter** only the profiles *they* have analyzed (languages, stars, repos, dates, etc.).
3. Fetches **live contribution heatmaps** for activity checks (week / month / year).
4. **Scores and ranks** each profile against **6 engineering personas** (Frontend, Backend, Full Stack, AI/ML, DevOps, Mobile) with a **0–100 score** and **metric breakdown**.
5. Provides **leaderboards** and **persona-based search** so teams can sort the best matches for a role.

Every analyzed profile is **scoped to the logged-in user** — your data is isolated from other accounts on the platform.

---

## Why we built it this way

| Decision | Reason |
|----------|--------|
| **MySQL + Prisma** | Reliable storage for profiles, rankings, and audit logs |
| **GitHub as single source of truth** | No fake validation rules — if GitHub says the user does not exist, we fail honestly |
| **Separate analyze vs rank steps** | Analysis is fast; ranking is heavy (README + repo metadata) — users choose when to pay that cost |
| **6 predefined personas** | Consistent, explainable scores for screening and hiring use cases |
| **JWT auth** | Secure multi-user app; each recruiter sees only their own analyzed profiles |
| **Request audit log** | Track every analyze attempt (success/failure) for transparency |

---

## Features

### 1. Authentication & user accounts

Secure access so each recruiter has a private workspace.

| Sub-feature | What it does |
|-------------|----------------|
| **Register** | Create account with email, password, username |
| **Login** | Issue JWT access + refresh tokens |
| **Refresh token** | Get new tokens without logging in again |
| **Protected routes** | All profile/rank/search APIs require `Bearer` token |
| **Get / update profile** | View or change account details |
| **Google OAuth** | Optional sign-in via Google (redirect + callback flow) |
| **Set password / link Google** | For mixed auth accounts |

📄 [Full docs → docs/authentication.md](docs/authentication.md)

---

### 2. GitHub profile analysis

Fetch public GitHub data and store structured insights in the database.

| Sub-feature | What it does |
|-------------|----------------|
| **Analyze by username** | `POST /api/v1/profiles/analyze/:username` — pulls live data from GitHub |
| **Profile insights stored** | Name, bio, location, company, avatar, followers, following, public repos, total stars, top 5 languages, account age |
| **Upsert on re-analyze** | Same username → update existing row + refresh `lastAnalyzedAt` |
| **User-scoped storage** | Only *you* see profiles *you* analyzed |
| **List all profiles** | Paginated list of your analyzed profiles |
| **Get single profile** | Fetch one profile by GitHub username |
| **Analysis request log** | Every analyze call logged (`success` / `failed`) with timestamp and error message |

📄 [Full docs → docs/profile-analysis.md](docs/profile-analysis.md)

---

### 3. Profile search & filtering

Search your analyzed profiles with rich filters and sorting.

| Sub-feature | What it does |
|-------------|----------------|
| **Global text search (`q`)** | Match username, name, bio, company, location, blog |
| **Field-specific text** | `githubUsername`, `name`, `bio`, `location`, `company`, `blog` |
| **Language filters** | `languages` (comma-separated), `languagesMatch=any\|all`, `primaryLanguage` |
| **Language depth** | `minTopLanguages`, `language` + `minLanguageRepos` |
| **Numeric ranges** | `minStars` / `maxStars`, `minRepos` / `maxRepos`, `minFollowers` / `maxFollowers`, `minFollowing` / `maxFollowing` |
| **Date filters** | Account created range, last analyzed range |
| **Account age** | `minAccountAgeDays` / `maxAccountAgeDays` |
| **Profile completeness** | `hasBio`, `hasCompany`, `hasLocation`, `hasBlog`, `hasTwitter` |
| **Persona score filters** | `persona`, `minPersonaScore`, `maxPersonaScore`, `bestPersona` (requires ranking first) |
| **Sorting** | By stars, repos, followers, dates, `bestPersonaScore`, `personaScore` |
| **Pagination** | `page`, `limit` (max 100) |
| **Applied filters in response** | API echoes what filters were used |

📄 [Full docs → docs/profile-search.md](docs/profile-search.md)

---

### 4. Contribution heatmap

Live GitHub contribution graph data — not stored in DB; always fresh from GitHub GraphQL.

| Sub-feature | What it does |
|-------------|----------------|
| **Current week (`currWeek`)** | Contributions from start of week (Sunday) → today |
| **Current month (`currMonth`)** | From 1st of month → today |
| **Current year (`currYear`)** | From Jan 1 → today (default) |
| **Per-day breakdown** | Array of `{ date, count }` for charting |
| **Total contributions** | Sum for the selected period |
| **Private contributions** | Included when `GITHUB_TOKEN` can view private activity (`includesPrivateContributions`, `privateContributions`) |
| **No prior analyze required** | Works for any public GitHub username |

📄 [Full docs → docs/contribution-heatmap.md](docs/contribution-heatmap.md)

---

### 5. Repository composition

Live breakdown of a user's repos by language, technology topics, frameworks, and repo type.

| Sub-feature | What it does |
|-------------|----------------|
| **Composition API** | `GET /api/v1/profiles/:username/composition` |
| **Languages** | Primary language per repo with percentages |
| **Technologies** | Topic tags (docker, kubernetes, tensorflow, etc.) |
| **Frameworks** | Topic tags (react, django, flutter, etc.) |
| **Repo types** | Original, Fork, Archived, GitHub Pages |
| **Private repos** | Included when token has access (`includesPrivateRepos`, `privateRepoCount`) |
| **Live only** | Not stored in DB — fetched on each request |

📄 [Full docs → docs/repo-composition.md](docs/repo-composition.md)

---

### 6. Persona-based ranking

Score developers **out of 100** for specific job roles with explainable sub-metrics.

| Sub-feature | What it does |
|-------------|----------------|
| **6 personas** | Frontend, Backend, Full Stack, AI/ML, DevOps, Mobile Developer |
| **List personas** | `GET /api/v1/profiles/personas` |
| **Rank profile** | `POST /api/v1/profiles/rank/:username` — scores all 6 personas at once |
| **Deep repo analysis** | Up to 100 repos (public + private when token allows); README fetch for top 40 by stars |
| **8 scoring metrics** | Language alignment, repo quality, documentation, activity, community impact, project depth, tech stack match, profile completeness |
| **Weighted scores per persona** | Each persona uses different weights |
| **Grade labels** | Excellent / Strong / Good / Moderate / Developing |
| **Metric breakdown** | Score, weight, weighted contribution, summary per metric |
| **Best persona saved** | `bestPersona` + `bestPersonaScore` on profile for quick sorting |
| **Get rankings** | `GET /api/v1/profiles/:username/rankings` |
| **Leaderboard** | `GET /api/v1/profiles/rankings/leaderboard?persona=...` |
| **Search by persona score** | Works with profile search (`sortBy=personaScore`) |

📄 [Full docs → docs/persona-ranking.md](docs/persona-ranking.md)

---

### 7. Private GitHub data (optional)

When `GITHUB_TOKEN` is set with **`repo`** scope, the API includes private repos and private contributions wherever the token has access (typically when analyzing the token owner's own profile).

📄 [Full docs → docs/private-github-data.md](docs/private-github-data.md)

---

### 8. Database & API reference

| Sub-feature | What it does |
|-------------|----------------|
| **MySQL schema** | `users`, `github_profiles`, `profile_rankings`, `github_analysis_requests` |
| **Prisma migrations** | Versioned schema in `prisma/migrations/` |
| **Prisma reconnect/retry** | Auto-retries transient DB errors (TiDB Cloud, remote MySQL) |
| **Consistent API responses** | `{ success, message, data }` on success; structured errors |

📄 [Database → docs/database-schema.md](docs/database-schema.md)  
📄 [All endpoints → docs/api-reference.md](docs/api-reference.md)  
📄 [Changelog → docs/changelog.md](docs/changelog.md)

---

## How it fits together

```
Register / Login  →  Analyze profiles  →  Rank profiles (6 personas)
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
             Search & filter           Leaderboard              Contribution heatmap
```

**Example flow**

1. `POST /api/v1/auth/login`
2. `POST /api/v1/profiles/analyze/gaearon`
3. `POST /api/v1/profiles/rank/gaearon`
4. `GET /api/v1/profiles/rankings/leaderboard?persona=frontend_developer`
5. `GET /api/v1/profiles/octocat/composition`
6. `GET /api/v1/profiles/search?persona=frontend_developer&minPersonaScore=60&sortBy=personaScore`

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Language | TypeScript |
| Database | MySQL |
| ORM | Prisma |
| Auth | JWT + bcrypt |
| External API | GitHub REST + GraphQL |
| HTTP client | Axios |

---

## Quick start

```bash
cp .env.example .env
# Set DATABASE_URL, JWT_SECRET, GITHUB_TOKEN (recommended)

npm install
npm run db:generate
npm run db:migrate
npm run dev
```

- Server: `http://localhost:3000`
- Health: `GET /health`

More detail: [docs/setup-and-installation.md](docs/setup-and-installation.md)

---

## Postman

Import from [`postman/`](postman/):

1. `GitHub-Profile-Analyser.postman_environment.json`
2. `GitHub-Profile-Analyser.postman_collection.json`

Login auto-saves tokens. Run **Demo Flow → Full Screening Workflow** for an end-to-end demo.

Guide: [postman/README.md](postman/README.md)

---

## Project structure

```
├── prisma/           # Schema + migrations (database export)
├── src/
│   ├── config/       # Persona definitions, server config
│   ├── controllers/
│   ├── services/     # GitHub API, ranking engine
│   ├── repositories/
│   ├── routes/
│   ├── middlewares/
│   └── types/
├── docs/             # Feature documentation
├── postman/          # API collection + environment
└── README.md
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Setup & installation](docs/setup-and-installation.md) | Env vars, database, troubleshooting |
| [Authentication](docs/authentication.md) | Auth endpoints and tokens |
| [Profile analysis](docs/profile-analysis.md) | Analyze & store profiles |
| [Profile search](docs/profile-search.md) | All search filters |
| [Contribution heatmap](docs/contribution-heatmap.md) | Heatmap API |
| [Repository composition](docs/repo-composition.md) | Live repo breakdown API |
| [Persona ranking](docs/persona-ranking.md) | Scoring system |
| [Private GitHub data](docs/private-github-data.md) | PAT scopes, private repos & contributions |
| [Database schema](docs/database-schema.md) | Tables & migrations |
| [API reference](docs/api-reference.md) | Endpoint cheat sheet |
| [Changelog](docs/changelog.md) | Recent changes (backend + frontend summary) |

Index: [docs/README.md](docs/README.md) · Frontend: [../frontend/docs/README.md](../frontend/docs/README.md)

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | MySQL connection string (TiDB: add `sslaccept=strict&connect_timeout=60&pool_timeout=60`) |
| `JWT_SECRET` | Yes | JWT signing secret |
| `GITHUB_TOKEN` | Strongly recommended | GitHub PAT — use `repo` scope for private repos/contributions |
| `PORT` | No | Default `3000` |
| `CORS_ORIGINS` | No | Frontend URLs (comma-separated) |
| `FRONTEND_URL` | No | Frontend base URL for OAuth redirects |
| `ACCESS_TOKEN_EXPIRY` | No | Seconds (numeric, unquoted). Default `3600` |
| `REFRESH_TOKEN_EXPIRY` | No | Seconds (numeric, unquoted). Default `86400` |
| `COOKIE_SECRET` | No | Cookie signing secret |
| `GOOGLE_CLIENT_*` | No | Google OAuth |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Run built app |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Prisma Studio |

---

## Author

**Akshat Rauthan**

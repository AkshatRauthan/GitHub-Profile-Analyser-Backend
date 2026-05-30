# Changelog

Notable changes across backend and frontend. For API details, follow the linked docs.

---

## 2026-05-30 — Private GitHub data, composition API, DB resilience

### Backend

| Change | Details |
|--------|---------|
| **Private repo fetching** | When `GITHUB_TOKEN` is set, repos fetched via GraphQL with `ownerAffiliations` — includes private repos the token can access |
| **Private contributions** | Heatmap includes `restrictedContributionsCount`; response adds `includesPrivateContributions`, `privateContributions` |
| **Repository composition** | New `GET /api/v1/profiles/:username/composition` — languages, technologies, frameworks, repo types (live, not stored) |
| **Ranking repo metadata** | `IGitHubRepoDetail.isPrivate` flag; codebase size weighting uses repo `size` + README length |
| **Health endpoints** | `GET /` (HF liveness) + `GET /health` (DB-aware, always HTTP 200) |
| **Hugging Face Docker** | `Dockerfile`, README `sdk: docker`, port 7860, bind `0.0.0.0` |
| **Keep-alive workflow** | Hourly GitHub cron pings `$HF_BACKEND_URL/health` |
| **DB reconnect/retry** | Prisma auto-retries transient connection errors (`P1001`, `P1002`, `P1017`) |
| **JWT expiry fix** | `ACCESS_TOKEN_EXPIRY` / `REFRESH_TOKEN_EXPIRY` parsed as numbers (jwt v9 treats quoted strings as milliseconds) |
| **CORS fix** | Direct import in `cors.config.ts` to avoid circular dependency crash |
| **Prisma version pin** | `@prisma/client` aligned to `^6.19.3` with CLI |

📄 [Private GitHub Data](private-github-data.md) · [Repository Composition](repo-composition.md)

### Frontend

| Change | Details |
|--------|---------|
| **Home page** | Public landing at `/` with feature overview; dashboard moved to `/dashboard` |
| **Profile detail layout** | Header → language badges → heatmap → 2-column grid (repo composition \| persona rankings) |
| **Repo composition chart** | Donut chart with tabs (languages / technologies / frameworks / repo types) |
| **GitHub-style heatmap** | Contribution calendar with week/month/year toggle |
| **Private data indicators** | Badge for private repo count; heatmap shows private contribution count when present |
| **Google OAuth** | Login/register + `/auth/callback` handler |
| **Theme toggle** | Light/dark mode persisted |
| **Compare page** | Side-by-side comparison of up to 4 profiles |
| **Typography** | Report pages use enlarged `.app-reports` scale |

### Postman

- Added **Repository Composition** requests
- Heatmap tests check contribution day array; optional private fields documented
- Environment variable `githubTokenOwnerUsername` for private-data testing
- Demo flow includes composition step

### Environment

```env
# GITHUB_TOKEN — PAT with `repo` scope for private data
# DATABASE_URL — TiDB Cloud: add &connect_timeout=60&pool_timeout=60
# ACCESS_TOKEN_EXPIRY / REFRESH_TOKEN_EXPIRY — numeric seconds, do not quote
```

See [Setup & Installation](setup-and-installation.md) and `.env.example`.

# Database Schema

MySQL database managed with **Prisma ORM**. Migrations are in `backend/prisma/migrations/`.

---

## Entity relationship

```
users
  ├── github_profiles (1:N, scoped per user)
  │     └── profile_rankings (1:N, one per persona)
  └── github_analysis_requests (1:N, audit log)
```

Each user only sees profiles **they** analyzed. The `(userId, githubUsername)` pair is unique.

---

## Tables

### `users`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `email` | String | Unique |
| `username` | String | Display name |
| `password` | String? | Bcrypt hash (null for Google-only) |
| `googleId` | String? | Unique Google sub ID |
| `authMethods` | String | JSON array: `["local","google"]` |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

### `github_profiles`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | FK → users | Owner |
| `githubUsername` | String | GitHub login |
| `name`, `bio`, `location`, `company`, `blog` | String? | Profile fields |
| `avatarUrl`, `twitterUsername` | String? | |
| `publicRepos`, `followers`, `following` | Int | Counts |
| `totalStars` | Int | Sum of repo stars |
| `topLanguages` | String? | JSON: `[{ language, count }]` |
| `accountCreatedAt` | DateTime? | GitHub account age |
| `bestPersona` | String? | Top persona key after ranking |
| `bestPersonaScore` | Float? | Score for best persona |
| `lastAnalyzedAt` | DateTime | Last analyze timestamp |
| `lastRankedAt` | DateTime? | Last rank timestamp |
| `createdAt`, `updatedAt` | DateTime | |

**Unique:** `(userId, githubUsername)`

### `profile_rankings`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `profileId` | FK → github_profiles | |
| `persona` | String | Persona key |
| `overallScore` | Float | 0–100 |
| `grade` | String | Excellent/Strong/Good/Moderate/Developing |
| `breakdown` | Text | JSON array of metric breakdowns |
| `computedAt` | DateTime | |
| `updatedAt` | DateTime | |

**Unique:** `(profileId, persona)`  
**Index:** `(persona, overallScore)` for leaderboard queries

### `github_analysis_requests`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | FK → users | |
| `githubUsername` | String | Target username |
| `profileId` | FK? → github_profiles | Set on success |
| `status` | String | `success` or `failed` |
| `errorMessage` | String? | Failure reason |
| `createdAt` | DateTime | |

---

## Migrations

| Migration | Description |
|-----------|-------------|
| `20260529171642_init` | Users table |
| `20260530110932_add_github_profiles` | Profiles + analysis requests |
| `20260530120507_add_profile_rankings` | Rankings + best persona fields |

### Export schema

To export the current schema SQL:

```bash
cd backend
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

Or use migration files directly from `prisma/migrations/`.

---

## Prisma commands

```bash
npm run db:generate   # Regenerate client after schema changes
npm run db:migrate    # Apply migrations in dev
npm run db:push       # Push schema without migration (dev only)
npm run db:studio     # Visual database browser
```

## Related

- [Setup & Installation](setup-and-installation.md)
- [Profile Analysis](profile-analysis.md)
- [Persona Ranking](persona-ranking.md)

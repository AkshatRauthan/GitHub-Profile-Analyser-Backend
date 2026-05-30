# API Reference

Base URL: `http://localhost:3000` (configurable via `PORT`)

All API routes are prefixed with `/api/v1`.

## Response format

### Success

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { }
}
```

### Error

```json
{
  "success": false,
  "message": "Error message",
  "explanation": "Additional detail"
}
```

---

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Server health check |

---

## Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | No | Register with email/password |
| POST | `/api/v1/auth/login` | No | Login |
| POST | `/api/v1/auth/refresh` | No | Refresh tokens |
| POST | `/api/v1/auth/google` | No | Google auth (direct) |
| GET | `/api/v1/auth/google` | No | Google OAuth redirect |
| GET | `/api/v1/auth/google/callback` | No | Google OAuth callback |
| GET | `/api/v1/auth/profile` | Yes | Get user profile |
| PUT | `/api/v1/auth/profile` | Yes | Update user profile |
| POST | `/api/v1/auth/set-password` | Yes | Set password |
| POST | `/api/v1/auth/link-google` | Yes | Link Google account |

See [Authentication](authentication.md) for request bodies.

---

## Profiles

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/profiles/analyze/:username` | Yes | Analyze GitHub profile |
| GET | `/api/v1/profiles` | Yes | List your analyzed profiles |
| GET | `/api/v1/profiles/:username` | Yes | Get single profile |
| GET | `/api/v1/profiles/requests` | Yes | Analysis request audit log |
| GET | `/api/v1/profiles/search` | Yes | Search/filter profiles |

See [Profile Analysis](profile-analysis.md) and [Profile Search](profile-search.md).

---

## Contribution Heatmap

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/profiles/:username/heatmap?period=` | Yes | Live contribution heatmap |

Periods: `currWeek`, `currMonth`, `currYear`

See [Contribution Heatmap](contribution-heatmap.md).

---

## Persona Ranking

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/profiles/personas` | Yes | List all personas |
| POST | `/api/v1/profiles/rank/:username` | Yes | Rank profile (all personas) |
| GET | `/api/v1/profiles/:username/rankings` | Yes | Get stored rankings |
| GET | `/api/v1/profiles/rankings/leaderboard?persona=` | Yes | Persona leaderboard |

See [Persona Ranking](persona-ranking.md).

---

## HTTP status codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 404 | Not found |
| 409 | Conflict (duplicate record) |
| 429 | Too many requests (GitHub rate limit) |
| 502 | Bad gateway (GitHub API failure) |
| 500 | Internal server error |

---

## Auth header

All protected endpoints:

```
Authorization: Bearer <accessToken>
```

---

## Quick reference — search query params

```
GET /api/v1/profiles/search
  ?q=
  &languages=JavaScript,TypeScript
  &languagesMatch=any|all
  &minStars=&maxStars=
  &minRepos=&maxRepos=
  &minFollowers=&maxFollowers=
  &persona=frontend_developer
  &minPersonaScore=&maxPersonaScore=
  &bestPersona=
  &sortBy=personaScore|bestPersonaScore|totalStars|...
  &sortOrder=asc|desc
  &page=1&limit=10
```

Full filter list: [Profile Search](profile-search.md)

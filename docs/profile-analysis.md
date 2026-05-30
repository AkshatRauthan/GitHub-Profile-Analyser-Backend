# Profile Analysis

Analyze public GitHub profiles and persist insights scoped to the authenticated user.

## Analyze a profile

**`POST /api/v1/profiles/analyze/:username`**

Fetches live data from GitHub, upserts the profile in MySQL, and logs the request.

### Example

```bash
POST /api/v1/profiles/analyze/octocat
Authorization: Bearer <token>
```

### What gets fetched from GitHub

- User profile: name, bio, location, company, avatar, followers, following, public repo count
- Repositories (up to 100): languages, star counts → used to compute `totalStars` and `topLanguages`

### Stored insights

| Field | Source |
|-------|--------|
| `githubUsername` | GitHub login |
| `name`, `bio`, `location`, `company`, `blog` | Profile API |
| `avatarUrl`, `twitterUsername` | Profile API |
| `publicRepos`, `followers`, `following` | Profile API |
| `totalStars` | Sum of stars across fetched repos |
| `topLanguages` | Top 5 languages by repo count |
| `accountCreatedAt` | GitHub account creation date |
| `lastAnalyzedAt` | Timestamp of this analysis |

### Response (201)

```json
{
  "success": true,
  "message": "GitHub profile analyzed successfully",
  "data": {
    "id": "profile-uuid",
    "userId": "your-user-id",
    "githubUsername": "octocat",
    "name": "The Octocat",
    "publicRepos": 8,
    "followers": 9000,
    "totalStars": 1200,
    "topLanguages": [
      { "language": "JavaScript", "count": 3 }
    ],
    "lastAnalyzedAt": "2026-05-30T12:00:00.000Z"
  }
}
```

### Re-analysis behavior

If you analyze the same GitHub username again, the existing record is **updated** (upsert) and `lastAnalyzedAt` is refreshed. Each user has their own isolated copy — User A's analyses are separate from User B's.

## List your profiles

**`GET /api/v1/profiles?page=1&limit=10`**

Returns paginated profiles analyzed by the current user, sorted by `lastAnalyzedAt` descending.

## Get single profile

**`GET /api/v1/profiles/:username`**

Returns one analyzed profile. Returns `404` if you haven't analyzed that username.

## Analysis request audit log

**`GET /api/v1/profiles/requests?page=1&limit=10`**

Every analyze attempt (success or failure) is logged:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "req-uuid",
        "githubUsername": "octocat",
        "profileId": "profile-uuid",
        "status": "success",
        "createdAt": "2026-05-30T12:00:00.000Z"
      },
      {
        "id": "req-uuid-2",
        "githubUsername": "invalid-user-xyz",
        "status": "failed",
        "errorMessage": "GitHub user \"invalid-user-xyz\" not found",
        "createdAt": "2026-05-30T11:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 2, "totalPages": 1 }
  }
}
```

## Prerequisites for ranking

Persona ranking requires the profile to be analyzed first:

```
POST /profiles/analyze/:username  →  POST /profiles/rank/:username
```

See [Persona Ranking](persona-ranking.md).

## Related

- [Profile Search](profile-search.md) — filter analyzed profiles
- [Contribution Heatmap](contribution-heatmap.md) — separate live contribution API
- [API Reference](api-reference.md)

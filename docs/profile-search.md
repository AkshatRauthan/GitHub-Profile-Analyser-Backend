# Profile Search

Search and filter your analyzed GitHub profiles with comprehensive query parameters.

**`GET /api/v1/profiles/search`**

All results are scoped to profiles **you** have analyzed.

---

## Text filters

| Parameter | Description |
|-----------|-------------|
| `q` | Search across username, name, bio, company, location, blog |
| `githubUsername` | Partial match on GitHub username |
| `name` | Partial match on display name |
| `bio` | Keyword in bio |
| `location` | Partial match on location |
| `company` | Partial match on company |
| `blog` | Partial match on blog URL |

## Language filters

| Parameter | Description |
|-----------|-------------|
| `languages` | Comma-separated, e.g. `JavaScript,TypeScript` |
| `languagesMatch` | `any` (default) or `all` |
| `primaryLanguage` | Top language (highest repo count) |
| `minTopLanguages` | Minimum number of distinct languages |
| `language` + `minLanguageRepos` | Min repos for a specific language |

## Numeric range filters

| Parameter | Field |
|-----------|-------|
| `minStars` / `maxStars` | Total stars |
| `minRepos` / `maxRepos` | Public repos |
| `minFollowers` / `maxFollowers` | Followers |
| `minFollowing` / `maxFollowing` | Following |

## Date & age filters

| Parameter | Description |
|-----------|-------------|
| `accountCreatedAfter` / `accountCreatedBefore` | GitHub account creation (ISO date) |
| `lastAnalyzedAfter` / `lastAnalyzedBefore` | When you last analyzed them |
| `minAccountAgeDays` / `maxAccountAgeDays` | Account age in days |

## Profile completeness

| Parameter | Values |
|-----------|--------|
| `hasBio`, `hasCompany`, `hasLocation`, `hasBlog`, `hasTwitter` | `true` / `false` |

## Persona / ranking filters

Requires profiles to be ranked first (`POST /profiles/rank/:username`).

| Parameter | Description |
|-----------|-------------|
| `persona` | Filter by persona score, e.g. `frontend_developer` |
| `minPersonaScore` / `maxPersonaScore` | Score range (0–100) |
| `bestPersona` | Filter by best-matching persona |
| `sortBy=personaScore` | Sort by score for the given `persona` |
| `sortBy=bestPersonaScore` | Sort by best persona score |

Valid personas: `frontend_developer`, `backend_developer`, `fullstack_developer`, `ai_engineer`, `devops_engineer`, `mobile_developer`

## Sorting & pagination

| Parameter | Options |
|-----------|---------|
| `sortBy` | `githubUsername`, `name`, `publicRepos`, `totalStars`, `followers`, `following`, `lastAnalyzedAt`, `createdAt`, `accountCreatedAt`, `bestPersonaScore`, `personaScore` |
| `sortOrder` | `asc` / `desc` (default: `desc`) |
| `page` | Page number (default: 1) |
| `limit` | Items per page (default: 10, max: 100) |

---

## Examples

### Find JavaScript devs with 50+ stars

```
GET /api/v1/profiles/search?languages=JavaScript&minStars=50&sortBy=totalStars&sortOrder=desc
```

### Strong frontend candidates (ranked)

```
GET /api/v1/profiles/search?persona=frontend_developer&minPersonaScore=65&sortBy=personaScore&sortOrder=desc
```

### Profiles whose best fit is AI Engineer

```
GET /api/v1/profiles/search?bestPersona=ai_engineer&sortBy=bestPersonaScore&sortOrder=desc
```

### Keyword + follower range

```
GET /api/v1/profiles/search?q=react&minFollowers=100&maxFollowers=10000
```

---

## Response

```json
{
  "success": true,
  "message": "Profile search completed successfully",
  "data": {
    "items": [ /* matching profiles */ ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 3,
      "totalPages": 1
    },
    "appliedFilters": {
      "persona": "frontend_developer",
      "minPersonaScore": 65,
      "sortBy": "personaScore",
      "sortOrder": "desc"
    },
    "persona": "frontend_developer",
    "personaName": "Frontend Developer"
  }
}
```

## Validation errors

Invalid params return `400`:

- `minStars` > `maxStars`
- Invalid `sortBy` value
- `sortBy=personaScore` without `persona`
- Invalid date format

## Related

- [Persona Ranking](persona-ranking.md)
- [Profile Analysis](profile-analysis.md)

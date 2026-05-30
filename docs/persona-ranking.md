# Persona Ranking

Score analyzed GitHub profiles against **6 predefined engineering personas**, each with an overall score out of 100 and a detailed metric breakdown.

---

## Personas

| Key | Name |
|-----|------|
| `frontend_developer` | Frontend Developer |
| `backend_developer` | Backend Developer |
| `fullstack_developer` | Full Stack Developer |
| `ai_engineer` | AI / ML Engineer |
| `devops_engineer` | DevOps Engineer |
| `mobile_developer` | Mobile Developer |

List all personas: **`GET /api/v1/profiles/personas`**

---

## Workflow

```
1. POST /profiles/analyze/:username   ← required first
2. POST /profiles/rank/:username        ← deep analysis + scoring
3. GET  /profiles/:username/rankings   ← view stored scores
4. GET  /profiles/rankings/leaderboard  ← compare candidates
5. GET  /profiles/search?persona=...    ← filter by score
```

---

## Rank a profile

**`POST /api/v1/profiles/rank/:username`**

### Deep repo analysis performed

- Fetches up to **100 repos** from GitHub
- For top **40 repos by stars**, fetches **README content** (existence + length)
- Collects: topics, license, forks, issues, wiki, homepage, push dates
- Filters out forks, archived, and disabled repos for scoring

### Scoring metrics (8 sub-scores → 100 total)

Each persona applies different **weights** to these metrics:

| Metric | What it measures |
|--------|------------------|
| **Language Alignment** | % of owned repos using persona-aligned languages (star-weighted) |
| **Repository Quality** | Descriptions, licenses, topics, size, engagement signals |
| **Documentation & README** | README coverage + average length, descriptions, wiki, homepage |
| **Activity & Freshness** | Recent pushes (6mo/1yr), repo volume, analysis recency |
| **Community Impact** | Followers, total stars, forks (log-normalized) |
| **Project Depth** | Standout projects (10+ stars), peak project impact |
| **Tech Stack Match** | GitHub topics + repo names/descriptions vs persona keywords |
| **Profile Completeness** | Bio, company, blog, location + persona keyword match in bio |

### Grades

| Score | Grade |
|-------|-------|
| 90+ | Excellent |
| 75–89 | Strong |
| 60–74 | Good |
| 45–59 | Moderate |
| <45 | Developing |

### Response (201)

```json
{
  "success": true,
  "message": "Profile ranked successfully across all personas",
  "data": {
    "profile": {
      "githubUsername": "octocat",
      "bestPersona": "fullstack_developer",
      "bestPersonaScore": 72.5,
      "lastRankedAt": "2026-05-30T12:00:00.000Z"
    },
    "bestMatch": {
      "persona": "fullstack_developer",
      "personaName": "Full Stack Developer",
      "overallScore": 72.5,
      "grade": "Good",
      "breakdown": [
        {
          "key": "languageAlignment",
          "label": "Language Alignment",
          "score": 85,
          "weight": 0.15,
          "weightedScore": 12.75,
          "summary": "12/18 original repos use Full Stack Developer languages"
        }
      ],
      "computedAt": "2026-05-30T12:00:00.000Z"
    },
    "rankings": [ "/* all 6 personas with full breakdowns */" ],
    "reposAnalyzed": 8,
    "computedAt": "2026-05-30T12:00:00.000Z"
  }
}
```

Re-ranking **updates** all stored scores.

---

## Get stored rankings

**`GET /api/v1/profiles/:username/rankings`**

Returns all 6 persona scores with breakdowns. Returns `404` if not ranked yet.

---

## Leaderboard

**`GET /api/v1/profiles/rankings/leaderboard`**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `persona` | Yes | Persona key, e.g. `frontend_developer` |
| `page` | No | Default: 1 |
| `limit` | No | Default: 10, max: 100 |
| `minScore` | No | Minimum score filter |

### Example

```
GET /api/v1/profiles/rankings/leaderboard?persona=backend_developer&minScore=60&page=1&limit=10
```

### Response

```json
{
  "success": true,
  "data": {
    "persona": "backend_developer",
    "personaName": "Backend Developer",
    "items": [
      {
        "rank": 1,
        "profile": { "githubUsername": "gaearon", "bestPersonaScore": 78.2 },
        "overallScore": 78.2,
        "grade": "Strong",
        "computedAt": "2026-05-30T12:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 2, "totalPages": 1 }
  }
}
```

Only profiles **you** have analyzed and ranked appear in your leaderboard.

---

## Search by persona score

See [Profile Search](profile-search.md) for filtering with `persona`, `minPersonaScore`, and `sortBy=personaScore`.

---

## Storage

Rankings are stored in `profile_rankings` table. Best persona is denormalized on `github_profiles` for fast sorting.

See [Database Schema](database-schema.md).

## Related

- [Profile Analysis](profile-analysis.md)
- [Profile Search](profile-search.md)

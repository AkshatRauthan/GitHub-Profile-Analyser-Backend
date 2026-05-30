# Repository Composition

Live breakdown of a GitHub user's repositories by language, technology topics, frameworks, and repo type. Fetched from GitHub on each request — **not stored** in the database.

**`GET /api/v1/profiles/:username/composition`**

---

## Example

```bash
GET /api/v1/profiles/octocat/composition
Authorization: Bearer <token>
```

Does **not** require prior profile analysis, but the profile detail UI typically loads this alongside rankings and heatmap.

---

## Response

```json
{
  "success": true,
  "message": "Repository composition retrieved successfully",
  "data": {
    "githubUsername": "octocat",
    "totalRepos": 8,
    "includesPrivateRepos": false,
    "privateRepoCount": 0,
    "languages": [
      { "label": "JavaScript", "count": 3, "percentage": 37.5 }
    ],
    "technologies": [
      { "label": "Docker", "count": 2, "percentage": 25 },
      { "label": "None detected", "count": 4, "percentage": 50 }
    ],
    "frameworks": [
      { "label": "React", "count": 2, "percentage": 25 },
      { "label": "None detected", "count": 5, "percentage": 62.5 }
    ],
    "repoTypes": [
      { "label": "Original", "count": 6, "percentage": 75 },
      { "label": "Fork", "count": 2, "percentage": 25 }
    ]
  }
}
```

---

## Dimensions

| Dimension | Source | Notes |
|-----------|--------|-------|
| **languages** | `primaryLanguage` on each repo | Top 8 slices; remainder grouped as "Other" |
| **technologies** | GitHub repo topics matched against infra/ML/data catalog | e.g. docker, kubernetes, tensorflow |
| **frameworks** | GitHub repo topics matched against framework catalog | e.g. react, django, flutter |
| **repoTypes** | Derived from repo flags | Original, Fork, Archived, GitHub Pages |

Each slice includes `label`, `count`, and `percentage` (of `totalRepos`).

---

## Data source

Uses the same repo fetch pipeline as persona ranking (`fetchDetailedRepos`):

- **Without `GITHUB_TOKEN`:** public repos only (REST API, up to 100)
- **With `GITHUB_TOKEN`:** GraphQL fetch of all repos the token can access (public + private where permitted)

When private repos are included, the response sets:

| Field | Description |
|-------|-------------|
| `includesPrivateRepos` | `true` when at least one private repo was fetched |
| `privateRepoCount` | Number of private repos in the composition |

See [Private GitHub Data](private-github-data.md).

---

## Related

- [Persona Ranking](persona-ranking.md) — uses the same repo metadata for scoring
- [Profile Analysis](profile-analysis.md)
- [API Reference](api-reference.md)

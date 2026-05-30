# Private GitHub Data

When a **`GITHUB_TOKEN`** (Personal Access Token) is configured on the backend, the API can include **private repositories** and **private contributions** — but only when the token has permission to see them.

Without a token, all GitHub fetches use public data only.

---

## What gets unlocked

| Feature | Endpoint | Private data |
|---------|----------|--------------|
| Profile analysis | `POST /profiles/analyze/:username` | Private repos in star/language totals |
| Persona ranking | `POST /profiles/rank/:username` | Private repos in all 8 scoring metrics |
| Repository composition | `GET /profiles/:username/composition` | Private repos in breakdown slices |
| Contribution heatmap | `GET /profiles/:username/heatmap` | Private contributions in totals + `privateContributions` count |

---

## Required token scope

Create a GitHub PAT with at least the **`repo`** scope:

1. GitHub → **Settings → Developer settings → Personal access tokens**
2. Generate a classic token with **`repo`** (Full control of private repositories)
3. Add to `backend/.env`:

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

Restart the backend after changing the token.

---

## Who can see private data?

GitHub only exposes private repos and private contribution counts when the **token holder has access**:

| Scenario | Private repos | Private contributions |
|----------|---------------|----------------------|
| Analyzing **your own** username (token owner) | Yes | Yes |
| Token is **collaborator** on user's private repos | Those repos only | No (unless token owner is that user) |
| Token has **org access** to user's private org repos | Those repos only | No (unless token owner is that user) |
| Analyzing **arbitrary public user** | Public repos only | Public contributions only |

You **cannot** fetch another person's private repos or private activity unless your token has explicit access.

---

## How it works (backend)

### Repositories

When `GITHUB_TOKEN` is set, repos are fetched via **GitHub GraphQL**:

```graphql
user(login: $username) {
  repositories(
    ownerAffiliations: [OWNER, ORGANIZATION_MEMBER, COLLABORATOR]
    ...
  )
}
```

This returns every repo visible to the authenticated token for that profile. Without a token, the REST `/users/{username}/repos` endpoint is used (public only).

Each repo detail includes `isPrivate: boolean` for downstream ranking and composition.

### Contributions

The heatmap query reads `restrictedContributionsCount` from `contributionsCollection`. When the token can view private activity:

- `totalContributions` includes private activity
- `includesPrivateContributions: true`
- `privateContributions` = count from private/restricted activity

---

## Testing with Postman

1. Set `GITHUB_TOKEN` in backend `.env` (token owner = your GitHub account)
2. In Postman environment, set `githubUsername` to **your GitHub login** (same as token owner)
3. Run **Analyze → Rank → Heatmap → Composition**
4. Check response fields: `includesPrivateRepos`, `privateContributions`

For public demo users (`octocat`, `gaearon`), private fields will be `false` / `0`.

---

## Rate limits

| Auth | Limit |
|------|-------|
| No token | 60 REST requests/hour per IP |
| With token | 5,000 requests/hour |

Ranking and composition make many GitHub calls — a token is **strongly recommended** even for public-only usage.

---

## Related

- [Setup & Installation](setup-and-installation.md) — env vars
- [Profile Analysis](profile-analysis.md)
- [Contribution Heatmap](contribution-heatmap.md)
- [Repository Composition](repo-composition.md)
- [Persona Ranking](persona-ranking.md)

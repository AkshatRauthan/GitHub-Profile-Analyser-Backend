# Postman Collection

API testing collection for GitHub Profile Analyser.

## Files

| File | Description |
|------|-------------|
| `GitHub-Profile-Analyser.postman_collection.json` | Full API collection with scripts |
| `GitHub-Profile-Analyser.postman_environment.json` | Local environment with dummy data |

## Import

1. Open Postman → **Import** → select both JSON files
2. Select **GitHub Profile Analyser - Local** from the environment dropdown

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `baseUrl` | `http://localhost:3000` | API base URL |
| `accessToken` | *(auto-set)* | JWT access token |
| `refreshToken` | *(auto-set)* | JWT refresh token |
| `userId` | *(auto-set)* | Current user ID after login |
| `userEmail` | `demo.recruiter@example.com` | Demo login email |
| `userPassword` | `DemoPass123!` | Demo login password |
| `userUsername` | `demo_recruiter` | Demo register username |
| `githubUsername` | `octocat` | Primary test GitHub user |
| `githubUsername2` | `gaearon` | Secondary test user |
| `githubUsername3` | `sindresorhus` | Tertiary test user |
| `githubTokenOwnerUsername` | *(empty)* | Set to your GitHub login to test **private** repos/contributions (requires backend `GITHUB_TOKEN` with `repo` scope) |
| `persona` | `frontend_developer` | Default persona for search/leaderboard |
| `personaBackend` | `backend_developer` | Backend persona |
| `heatmapPeriod` | `currMonth` | Default heatmap period |
| `searchMinStars` | `10` | Min stars for search demo |
| `searchMinPersonaScore` | `50` | Min persona score for search |
| `leaderboardMinScore` | `40` | Min score for leaderboard |
| `lastAnalyzedUsername` | *(auto-set)* | Last analyzed username |
| `lastBestPersona` | *(auto-set)* | Best persona from last rank |
| `lastBestScore` | *(auto-set)* | Best score from last rank |

## Collection folders

| Folder | Endpoints |
|--------|-----------|
| **Health** | `GET /health` |
| **Auth** | Register, login, refresh, profile |
| **Profiles** | Analyze, list, get, analysis requests |
| **Search** | Language, persona score, keyword |
| **Contribution Heatmap** | Week, month, year |
| **Repository Composition** | Live repo breakdown (languages, tech, frameworks, types) |
| **Persona Ranking** | Personas, rank, rankings, leaderboards |
| **Demo Flow** | Full screening workflow (9 steps) |

## Auto-scripts

### Post-request (Auth)

**Register** and **Login** automatically save:
- `accessToken`
- `refreshToken`
- `userId`

**Refresh Token** updates both tokens.

**Rank Profile** saves:
- `lastBestPersona`
- `lastBestScore`

### Tests (Heatmap & Composition)

- Heatmap logs private contribution count when `includesPrivateContributions` is true
- Composition logs private repo count when `includesPrivateRepos` is true

### Pre-request (Collection)

Warns in console if `accessToken` is missing on protected routes.

### Tests (Collection)

Every request checks response time is under 30 seconds.

## Demo flow

Run the **Demo Flow → Full Screening Workflow** folder using **Collection Runner**:

1. Login
2. Analyze `octocat` and `gaearon`
3. Rank both profiles
4. View fullstack leaderboard
5. Search frontend candidates
6. Fetch contribution heatmap
7. Fetch repository composition

Set a **delay of 500ms** between requests when ranking to avoid GitHub rate limits without a token.

## Private GitHub data testing

1. Add `GITHUB_TOKEN=ghp_...` to backend `.env` (PAT with **`repo`** scope)
2. Set Postman `githubUsername` to the **same GitHub account** as the token owner
3. Run **Analyze → Rank → Heatmap → Get Repo Composition**
4. Check console for `✅ Private repos` / `✅ Private contributions` logs

Public demo users (`octocat`, `gaearon`) will not return private fields.

See [Private GitHub Data](../docs/private-github-data.md).

## Production environment

Duplicate the environment and update:
- `baseUrl` → your deployed API URL
- `userEmail` / `userPassword` → production credentials

## Related docs

- [API Reference](../docs/api-reference.md)
- [Repository Composition](../docs/repo-composition.md)
- [Contribution Heatmap](../docs/contribution-heatmap.md)
- [Changelog](../docs/changelog.md)

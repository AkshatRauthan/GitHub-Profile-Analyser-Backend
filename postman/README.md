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
| `userEmail` | `demo.recruiter@example.com` | Demo login email |
| `userPassword` | `DemoPass123!` | Demo login password |
| `userUsername` | `demo_recruiter` | Demo register username |
| `githubUsername` | `octocat` | Primary test GitHub user |
| `githubUsername2` | `gaearon` | Secondary test user |
| `githubUsername3` | `sindresorhus` | Tertiary test user |
| `persona` | `frontend_developer` | Default persona for search/leaderboard |
| `personaBackend` | `backend_developer` | Backend persona |
| `heatmapPeriod` | `currMonth` | Default heatmap period |
| `searchMinStars` | `10` | Min stars for search demo |
| `searchMinPersonaScore` | `50` | Min persona score for search |
| `leaderboardMinScore` | `40` | Min score for leaderboard |

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

Set a **delay of 500ms** between requests when ranking to avoid GitHub rate limits without a token.

## Production environment

Duplicate the environment and update:
- `baseUrl` → your deployed API URL
- `userEmail` / `userPassword` → production credentials

# Setup & Installation

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 18 or higher |
| npm | 9+ |
| MySQL | 8.0+ |
| GitHub PAT | Optional but strongly recommended |

## Clone & install

```bash
git clone <your-repo-url>
cd "GitHub Profile Analyser/backend"
npm install
```

## Environment configuration

Copy the example env file:

```bash
cp .env.example .env
```

### Required variables

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET="a-long-random-secret-string"
```

### Recommended variables

```env
GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
```

Without `GITHUB_TOKEN`, GitHub API rate limits are **60 requests/hour** per IP. Ranking and analysis make multiple API calls per profile, so a token (5000 req/hr) is essential for real usage.

For **private repos and private contributions**, use a PAT with the **`repo`** scope. See [Private GitHub Data](private-github-data.md).

### Database URL (TiDB Cloud / remote MySQL)

For cloud-hosted MySQL (e.g. TiDB Cloud), include SSL and timeout parameters:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:4000/DATABASE?sslaccept=strict&connect_timeout=60&pool_timeout=60"
```

Ensure your IP is allowlisted in the cloud provider console and the cluster is not paused.

The backend automatically **retries** transient DB connection errors (useful after long GitHub API calls or cold cluster wake-up).

### Optional variables

```env
PORT=3000
CORS_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
ACCESS_TOKEN_EXPIRY=3600
REFRESH_TOKEN_EXPIRY=86400
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
COOKIE_SECRET=
```

> **JWT expiry:** Use numeric seconds only (e.g. `3600`). Do not quote values — `jsonwebtoken` v9 treats `"3600"` as milliseconds.

## Database setup

```bash
# Generate Prisma client
npm run db:generate

# Apply all migrations
npm run db:migrate

# (Optional) Open visual DB browser
npm run db:studio
```

Migration files live in `backend/prisma/migrations/`.

## Running the server

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

Verify the server:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "github-profile-analyser-api",
  "timestamp": "2026-05-30T12:00:00.000Z",
  "uptimeSeconds": 42,
  "checks": { "database": "connected" }
}
```

## Postman

1. Open Postman → **Import**
2. Import both files from `postman/`:
   - `GitHub-Profile-Analyser.postman_environment.json`
   - `GitHub-Profile-Analyser.postman_collection.json`
3. Select **GitHub Profile Analyser - Local** environment (top-right dropdown)
4. Run **Auth → Register** or **Auth → Login**
   - Pre/post scripts automatically save `accessToken` and `refreshToken`
5. All protected requests use `{{accessToken}}` via collection auth

### Demo flow folder

The collection includes a **Demo Flow → Full Screening Workflow** folder that runs the complete screening pipeline in order using dummy GitHub usernames (`octocat`, `gaearon`).

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Failed to connect to the database` | Check `DATABASE_URL`, ensure MySQL/TiDB is running and IP is allowlisted |
| `Can't reach database server` (TiDB) | Cluster may be paused — wake it in TiDB console; retry (backend auto-retries 2×) |
| GitHub rate limit errors | Add `GITHUB_TOKEN` to `.env` |
| Private repos not appearing | Token needs `repo` scope; analyze the **token owner's** username |
| JWT expires immediately after login | Ensure `ACCESS_TOKEN_EXPIRY` is unquoted numeric seconds |
| `Profile not found. Analyze first` | Run `POST /profiles/analyze/:username` before ranking |
| Prisma client errors | Run `npm run db:generate` after schema changes |

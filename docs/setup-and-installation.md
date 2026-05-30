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
```

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
  "timestamp": "2026-05-30T12:00:00.000Z"
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
| `Failed to connect to the database` | Check `DATABASE_URL`, ensure MySQL is running |
| GitHub rate limit errors | Add `GITHUB_TOKEN` to `.env` |
| `Profile not found. Analyze first` | Run `POST /profiles/analyze/:username` before ranking |
| Prisma client errors | Run `npm run db:generate` after schema changes |

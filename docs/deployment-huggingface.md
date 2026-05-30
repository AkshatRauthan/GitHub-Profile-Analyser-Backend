# Hugging Face Spaces — Backend Deployment

Deploy this API as a **Docker Space** on Hugging Face. HF runs the container and probes **`/`** and **`/health`** on **`app_port`** (default **7860**) to mark the Space as **Running**.

Official docs: [Docker Spaces](https://huggingface.co/docs/hub/spaces-sdks-docker)

---

## HF requirements (Node backend)

| Requirement | This project |
|-------------|--------------|
| Space SDK | `docker` (set in `README.md` YAML frontmatter) |
| Exposed port | **7860** (`app_port: 7860`) |
| Bind address | **`0.0.0.0`** (not `127.0.0.1`) — set via `HOST=0.0.0.0` in Dockerfile |
| Root response | `GET /` → HTTP 200 |
| Health probe | `GET /health` → HTTP 200 (always, even if DB is down) |
| Container user | Runs as **`node`** (uid 1000, built into official `node:22-alpine` image) |
| Build-time `DATABASE_URL` | Dummy value in Dockerfile — real URL from Space secrets at runtime |
| Build-time GPU | Not used — no GPU calls during `docker build` |

If the app binds to `127.0.0.1` or the wrong port, the Space stays stuck on **Starting** even when logs look fine.

---

## Health endpoints

### `GET /`

Liveness probe for Hugging Face (root must not 404):

```json
{
  "service": "github-profile-analyser-api",
  "status": "ok",
  "health": "/health",
  "api": "/api/v1"
}
```

### `GET /health`

Used by HF monitoring and the GitHub **keep-alive** workflow:

```json
{
  "status": "healthy",
  "service": "github-profile-analyser-api",
  "timestamp": "2026-05-30T12:00:00.000Z",
  "uptimeSeconds": 3600,
  "startedAt": "2026-05-30T11:00:00.000Z",
  "checks": {
    "database": "connected"
  }
}
```

When the database is unreachable, HTTP status stays **200** but:

```json
{
  "status": "degraded",
  "checks": { "database": "disconnected" }
}
```

This keeps HF and `curl -sSf` keep-alive pings successful while still reporting DB state.

---

## Space setup

1. Create a new Space → SDK: **Docker**
2. Set **Space secrets** (Settings → Repository secrets):
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `GITHUB_TOKEN` (recommended)
   - `CORS_ORIGINS`, `FRONTEND_URL`
   - Google OAuth vars if used
3. Allowlist Hugging Face egress IPs on your database (TiDB Cloud / MySQL)
4. Push this repo (or use the deploy workflow)

---

## Docker (local test)

```bash
cd backend
docker build -t gpa-backend .
docker run --rm -p 7860:7860 \
  -e DATABASE_URL="mysql://..." \
  -e JWT_SECRET="your-secret" \
  gpa-backend
```

Verify:

```bash
curl http://localhost:7860/health
curl http://localhost:7860/
```

---

## GitHub Actions

### Deploy (`deploy-backend.yaml`)

Triggers on push to `akshat-prod`. Uploads the **backend repo root** to the Space:

```bash
hf upload $HF_BACKEND_SPACE . . --repo-type space --token $HF_TOKEN
```

**Secrets:** `HF_TOKEN`, `HF_BACKEND_SPACE` (e.g. `your-username/gpa-backend`)

### Keep-alive (`keep-alive.yaml`)

Hourly cron pings the deployed Space so free-tier instances avoid the **48-hour sleep**:

```bash
curl -sSf "${HF_BACKEND_URL%/}/health"
```

**Secret:** `HF_BACKEND_URL` = Space base URL, e.g. `https://your-username-gpa-backend.hf.space` (no trailing slash)

---

## Environment variables on HF

Set in Space **Settings → Variables and secrets**:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | MySQL/TiDB; allow HF IPs |
| `JWT_SECRET` | Yes | |
| `PORT` | No | Dockerfile sets `7860` |
| `HOST` | No | Dockerfile sets `0.0.0.0` |
| `CORS_ORIGINS` | Yes | Your frontend URL(s) |
| `FRONTEND_URL` | Yes | OAuth redirects |
| `GITHUB_TOKEN` | Recommended | Rate limits + private data |

Do **not** commit `.env` to the Space repo.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Space stuck on **Starting** | Confirm `app_port: 7860`, `EXPOSE 7860`, app listens on `0.0.0.0:7860` |
| `libquery_engine-linux-musl` not found | Alpine needs `binaryTargets = ["linux-musl-openssl-3.0.x"]` and engine `.node` files copied to `dist/generated/prisma` in Dockerfile |
| `addgroup: gid 1000 in use` | Use built-in `node` user — do not create a second uid-1000 user |
| `/health` 200 but API 500 | Check `DATABASE_URL` and DB IP allowlist |
| Keep-alive fails | Set `HF_BACKEND_URL`; Space must be **public** or add HF auth to curl |
| OAuth broken | Update `GOOGLE_CALLBACK_URL` and Google console to HF URL |

---

## Related

- [Setup & Installation](setup-and-installation.md)
- [API Reference](api-reference.md)

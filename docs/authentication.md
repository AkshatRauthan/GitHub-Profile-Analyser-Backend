# Authentication

All profile, search, ranking, and heatmap endpoints require a valid JWT access token. Auth endpoints are public unless noted.

## Registration

**`POST /api/v1/auth/register`**

```json
{
  "email": "recruiter@company.com",
  "password": "SecurePass123!",
  "username": "recruiter_akshat"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "recruiter@company.com",
      "username": "recruiter_akshat",
      "authMethods": ["local"]
    },
    "tokens": {
      "accessToken": "eyJhbG...",
      "refreshToken": "eyJhbG..."
    }
  }
}
```

## Login

**`POST /api/v1/auth/login`**

```json
{
  "email": "recruiter@company.com",
  "password": "SecurePass123!"
}
```

Returns the same shape as registration with `200 OK`.

## Token refresh

**`POST /api/v1/auth/refresh`**

```json
{
  "refreshToken": "eyJhbG..."
}
```

Returns new `accessToken` and `refreshToken`.

## Using tokens

Send the access token on every protected request:

```
Authorization: Bearer <accessToken>
```

### Token expiry (defaults)

| Token | Default TTL |
|-------|-------------|
| Access | 1 hour (`ACCESS_TOKEN_EXPIRY=3600`) |
| Refresh | 24 hours (`REFRESH_TOKEN_EXPIRY=86400`) |

## Protected auth routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/profile` | Get logged-in user profile |
| PUT | `/api/v1/auth/profile` | Update email/username/password |
| POST | `/api/v1/auth/set-password` | Set password (Google-only accounts) |
| POST | `/api/v1/auth/link-google` | Link Google account |

### Update profile body

```json
{
  "userId": "your-user-id",
  "currPassword": "SecurePass123!",
  "newUsername": "new_name",
  "newEmail": "new@email.com"
}
```

## Google OAuth (optional)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/google` | Redirect to Google consent |
| GET | `/api/v1/auth/google/callback` | OAuth callback (browser redirect) |
| POST | `/api/v1/auth/google` | Direct Google auth with payload |

Direct Google auth body:

```json
{
  "googleId": "google-sub-id",
  "email": "user@gmail.com",
  "name": "User Name"
}
```

Requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL` in `.env`.

## Error responses

```json
{
  "success": false,
  "message": "Invalid email or password",
  "explanation": "Invalid email or password"
}
```

Common status codes: `401` (invalid/expired token), `409` (duplicate email).

## Middleware behavior

The `authenticateUser` middleware:

1. Reads `Authorization: Bearer <token>` header
2. Verifies JWT signature and expiry
3. Confirms user still exists in database
4. Attaches `req.user` with `{ id, email, username }`

All `/api/v1/profiles/*` routes use this middleware.

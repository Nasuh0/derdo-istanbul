# Derdo Istanbul Communication Platform

## Stage 1 — Database and authentication

Implemented:
- NestJS API
- PostgreSQL + Prisma ORM
- Username/password registration and login
- bcrypt password hashing
- JWT access tokens
- Rotating JWT refresh tokens in HttpOnly cookies
- Server-side token revocation with tokenVersion
- Login/register rate limiting
- Helmet security headers
- Strict DTO validation
- Database health endpoint

### Local setup

1. Install Node.js 24 LTS, pnpm, and Docker.
2. Start PostgreSQL:
   `docker compose up -d postgres`
3. Copy `apps/api/.env.example` to `apps/api/.env`.
4. Replace both JWT secrets with different random values of at least 32 characters.
5. Run:
   `pnpm install`
   `pnpm --dir apps/api prisma:migrate:deploy`
6. Start:
   `pnpm dev:api`

API base URL: `http://localhost:3000/api`

Routes:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me` with `Authorization: Bearer <access-token>`
- `GET /api/health`

Register body example:
```json
{
  "username": "nasuh",
  "password": "change-this-password"
}
```

The access token is returned in JSON. The refresh token is stored only in an HttpOnly cookie.


## First administrator

Do not expose an endpoint that promotes arbitrary users to admin. After a normal account is
registered, promote the first administrator from the trusted server shell:

```bash
pnpm --dir apps/api admin:promote -- username
```

The command invalidates that user's existing sessions so they must sign in again and receive
the new ADMIN role.

## Current platform stages

- Stage 1: PostgreSQL authentication, bcrypt, JWT access/refresh sessions
- Stage 2: Socket.IO chat, Redis presence, public/private rooms and direct messages
- Stage 3: LiveKit WebRTC voice channels with microphone controls
- Stage 4: Cloudinary image uploads, attachment messages, admin moderation and audit logs

# Production deployment

The application is split into three deployable pieces:

1. **Web** — React/Vite static application from `apps/web`
2. **API** — NestJS application from `apps/api`
3. **Voice** — LiveKit server

PostgreSQL and Redis must be persistent services.

## Required production environment

Create a secret environment file outside source control with:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `COOKIE_SECURE=true`
- `COOKIE_SAME_SITE=strict`
- `CORS_ORIGINS=https://derdoistanbul.com`
- `LIVEKIT_URL=wss://<voice-host>`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Use different long random values for the two JWT secrets. Never commit production
secrets to Git.

## API container

Build from repository root:

```bash
docker build -f apps/api/Dockerfile -t derdo-api .
```

The container runs pending Prisma migrations before starting the API.

Expose the API behind HTTPS. The health endpoint is:

```text
GET /api/health
```

## Web container

If the API is on a separate hostname:

```bash
docker build \
  -f apps/web/Dockerfile \
  --build-arg VITE_API_URL=https://api.example.com \
  -t derdo-web .
```

If a reverse proxy serves the API on the same origin, leave `VITE_API_URL` empty.

## PostgreSQL and Redis

Do not publish PostgreSQL or Redis ports to the public Internet. Allow only the
application/private network to reach them. Enable automated PostgreSQL backups before launch.

## LiveKit

The repository's `infra/livekit/livekit.yaml` is for local development only.

For public production voice, use LiveKit's official VM deployment generator. It generates
LiveKit, Redis, Caddy/TLS and TURN configuration for the selected domain. Public voice
deployment also requires the WebRTC/TURN ports documented by LiveKit to be open on the VM.

Set the API's `LIVEKIT_URL` to the public WSS endpoint produced by that deployment.

## First administrator

Register a normal user, then run from a trusted API/server shell:

```bash
pnpm --dir apps/api admin:promote -- username
```

The promoted account's existing sessions are invalidated and the user must sign in again.

## Pre-launch checklist

- Run all Prisma migrations.
- Confirm `/api/health` reports PostgreSQL and Redis up.
- Confirm HTTPS on web/API and WSS on LiveKit.
- Verify CORS only contains production origins.
- Confirm Cloudinary upload credentials and upload size limit.
- Create the first admin from the trusted server shell.
- Test register/login/refresh/logout.
- Test public/private rooms and DM permissions with two users.
- Test ban: HTTP session, Socket.IO and active voice connection must all terminate.
- Test microphone join/mute/leave from desktop and mobile.
- Verify PostgreSQL backups and restore procedure.
- Keep GitHub CI green before deployment.

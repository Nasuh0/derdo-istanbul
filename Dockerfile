FROM node:24-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.34.6 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --no-frozen-lockfile

COPY apps/api ./apps/api
COPY apps/web ./apps/web

RUN pnpm build:api && VITE_API_URL= pnpm build:web

EXPOSE 3000

CMD ["sh", "-c", "pnpm --dir apps/api prisma:migrate:deploy && node apps/api/dist/main.js"]

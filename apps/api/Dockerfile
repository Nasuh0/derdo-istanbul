FROM node:24-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.34.6 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json

RUN pnpm install --filter @derdo/api... --no-frozen-lockfile

COPY apps/api ./apps/api

RUN pnpm --dir apps/api build

EXPOSE 3000

CMD ["sh", "-c", "pnpm --dir apps/api prisma:migrate:deploy && node apps/api/dist/main.js"]

# US24 API — for a host that runs a process (Fly.io, Railway, Render, a VM).
#
# NOT for Vercel. The API keeps state on disk (SQLite + artifact files), runs an
# in-process job queue, and holds SSE streams open. Serverless breaks all three.
# See DEPLOYMENT.md.
#
# node:sqlite (DatabaseSync) requires Node >= 22.5; this image pins the 24 line
# to match the engines field and local development.
FROM node:24-slim AS build

WORKDIR /repo
RUN corepack enable

# Manifests first so the dependency layer caches independently of source changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/domain/package.json    packages/domain/
COPY packages/schemas/package.json   packages/schemas/
COPY packages/testing/package.json   packages/testing/
COPY packages/ui/package.json        packages/ui/
COPY apps/api/package.json           apps/api/
COPY apps/web/package.json           apps/web/
COPY e2e/package.json                e2e/

RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/

# Typechecks, then bundles the workspace packages into one runnable file.
RUN pnpm --filter @us24/api build

# ---------------------------------------------------------------------------

FROM node:24-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Only the third-party dependencies the bundle left external.
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml /repo/
RUN corepack enable && pnpm install --prod --no-frozen-lockfile --ignore-scripts

COPY --from=build /repo/apps/api/dist ./dist

# 12 §18: the API listens inside a private network segment behind the approved
# access boundary. 0.0.0.0 is required for the platform health check to reach it
# — it is NOT an invitation to expose this port publicly. ADR-008 still applies:
# there is no authentication in this application.
ENV HOST=0.0.0.0
ENV PORT=8080

# Persistent volume. Both paths MUST point at mounted storage, or every deploy
# starts with an empty database and orphaned artifact references.
ENV DATABASE_PATH=/data/us24.db
ENV STORAGE_ROOT=/data/artifacts
VOLUME ["/data"]

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]

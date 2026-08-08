# Deployment

**Short version:** deploy `apps/web` to Vercel. Host `apps/api` somewhere that
runs a process. Point one rewrite at it. No application code changes.

---

## Why the API cannot go on Vercel

This is not a configuration problem. `apps/api/src/index.ts` calls
`app.listen()` — it is a server, not a request handler — and four independent
things about it are incompatible with a serverless runtime:

| Component | What it does | On serverless |
|---|---|---|
| `db/database.ts` | Opens a SQLite file and enables WAL | `/var/task` is read-only → `EROFS` on every cold start |
| `adapters/index.ts` | `LocalDiskStorage` writes artifact files | A file written by one instance does not exist for the next |
| `jobs/queue.ts` | In-process runner holding state in `Map`s | Idempotency keys and cancellation are instance-local, so retries duplicate rows into append-only tables |
| `routes/index.ts` | SSE stream with `setInterval` | Killed at the function timeout, billed for the whole open stream |

Pointing SQLite at `/tmp` is **worse than failing**. `CREATE TABLE IF NOT EXISTS`
makes an empty database look healthy while cases silently vanish and concurrent
instances fork into divergent databases. A verification platform that loses
audit history without erroring is the one failure mode this design exists to
prevent.

Making the API serverless is a rewrite, not a config change: PostgreSQL, object
storage, a real queue, and a handler entrypoint. It is also not just swapping the
adapter — `node:sqlite` is **synchronous**, so every `Repository` method and
every caller in `CaseService`, `DocumentService` and the routes becomes async,
including the synchronous flush loop in the SSE handler.

---

## The shape that works

```
Browser ──▶ Vercel (apps/web, static SPA)
                │
                │  /v1/*  rewritten same-origin
                ▼
           Fly.io / Railway / Render
           apps/api + mounted volume, ONE replica
```

Same-origin proxying is what keeps `BASE = '/v1'` in
`apps/web/src/lib/api.ts` and the relative `EventSource` in
`routes/processing.tsx` working untouched — and keeps CORS out of it entirely.

---

## 1. Frontend on Vercel

`vercel.json` at the repository root already has the build, output, rewrites and
security headers. In the Vercel project settings:

- **Root Directory:** the repository root. **Not `apps/web`** — `vite.config.ts`
  aliases into `../../packages/*/src`, so a scoped root cannot resolve the
  workspace packages.
- **Node version:** 22.x or 24.x.

Then edit one line in `vercel.json`, replacing `REPLACE-WITH-YOUR-API-HOST` with
your API hostname.

## 2. API on a persistent host

`apps/api/Dockerfile` builds and runs it. Whichever host you pick:

- **Mount a volume** and set `DATABASE_PATH` and `STORAGE_ROOT` onto it.
  Without this, every deploy starts with an empty database.
- **Run exactly one replica.** SQLite and the in-process job runner cannot scale
  horizontally. Two instances means two divergent databases.
- `HOST=0.0.0.0` is already set in the image so the platform health check can
  reach the process.

Fly.io, for example:

```bash
fly launch --no-deploy --dockerfile apps/api/Dockerfile
fly volumes create us24_data --size 10
# in fly.toml: mount us24_data at /data, and set [http_service] internal_port = 8080
fly scale count 1
fly deploy
```

## 3. Initialise the database

The image runs the server only. On first deploy, apply the schema once:

```bash
fly ssh console -C "node dist/index.js --help"   # confirm the image runs
# then run the migration from a one-off machine, or add a release_command
```

Simplest is a release command that runs the migration before the new version
takes traffic. The seed script is **development demo data** — do not run it
against a real deployment.

---

## The thing that is not optional

**ADR-008: this application has no authentication.** No login screen, no session,
no authorisation check on any route. The workstation label in the top bar is
operational metadata and proves nothing about who performed an action.

Do not expose either deployment to the open internet. Put both behind an approved
controlled-access boundary — a VPN, an identity-aware proxy, an allowlist, or
Vercel's own access protection on the frontend plus a private network or
authenticated tunnel to the API.

The `X-Robots-Tag: noindex, nofollow` header in `vercel.json` reduces accidental
discovery. It is not access control.

---

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3001` | `8080` in the Docker image |
| `HOST` | `127.0.0.1` | Deliberately loopback by default — there is no auth. The image overrides to `0.0.0.0` for health checks. |
| `DATABASE_PATH` | `./.private-storage/us24.db` | **Point at a mounted volume.** |
| `STORAGE_ROOT` | `./.private-storage/artifacts` | **Point at a mounted volume.** |
| `CORS_ORIGINS` | `http://localhost:5173` | Unnecessary if you use the same-origin rewrite. |
| `MAX_UPLOAD_BYTES` | `209715200` | 200 MB. |
| `EXCEPTION_AUTHORITY_CONFIGURED` | `false` | Leave false until the client names an approval authority (09 §12, 17 §18). |
| `ENVIRONMENT_LABEL` | `Local development` | Shown in the top bar. |
| `OPERATOR_LABEL` | `Workstation (unauthenticated)` | Operational metadata only. |

No AI, storage or database credential is ever read by the browser bundle
(11 §18). Everything above is server-side.

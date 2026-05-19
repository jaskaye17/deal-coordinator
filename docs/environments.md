# Environments

How to run and operate Deal Coordinator locally, in staging, and in production. Values here are **guidelines**; always align secrets and URLs with your actual hosting provider.

## Local development

### Infrastructure

- **Docker Compose** (`docker-compose.yml`) provides:
  - **Postgres 16** on port `5432`, database `deal_coordinator`, user/password `postgres` / `postgres`.
  - **Redis 7** on port `6379` (used by future worker/queue work; safe to leave up in Phase 1).

Start detached:

```bash
docker compose up -d
```

### Configuration

1. Copy `.env.example` → `.env` at the repo root.
2. Ensure `DATABASE_URL` points at the Compose Postgres instance (default in `.env.example` matches `docker-compose.yml`).
3. Set `APP_ENV=local` and `NODE_ENV=development` for typical dev.

### Scripts

| Goal | Command |
| --- | --- |
| One-shot bootstrap | `pnpm setup` (Compose, install, `.env`, generate, migrate, seed) |
| Prisma client | `pnpm db:generate` |
| Apply migrations | `pnpm db:migrate` |
| Demo data | `pnpm db:seed` |
| All apps in dev mode | `pnpm dev` |

Ports are controlled via env vars (`WEB_PORT`, `API_PORT`, `WORKER_PORT`, `GATEWAY_PORT`); defaults match README.

### Optional tools

- **Prisma Studio:** `pnpm db:studio` for browsing tables.
- **API e2e:** `pnpm --filter @deal-coordinator/api test:e2e` when configured (requires running DB and env).

---

## Staging

Staging validates integrations and data migrations before production traffic.

### Deployment (Render + Vercel on `main`)

**Goal:** every push to **`main`** that passes [CI](../.github/workflows/ci.yml) deploys the **Render** Docker services; the **web** app deploys via **Vercel** (Git integration or optional GitHub Action).

#### Render (API, gateway, worker, Postgres)

1. In [Render](https://dashboard.render.com): **New → Blueprint**, connect this GitHub repo, apply [`render.yaml`](../render.yaml).
2. Link the repo with **GitHub** for automatic deploys from **`main`**.
3. Each service is pinned to **`branch: main`**. The blueprint uses **`autoDeployTrigger: commit`**, so Render deploys on **every** push to `main`. To deploy **only after** GitHub Actions CI succeeds, set **`autoDeployTrigger: checksPass`** for each service in `render.yaml` and sync the blueprint (Render must be able to see your CI checks on the repo).
4. Fill **sync** env vars when prompted (for example `S3_*` when using real S3).
5. **Deploy hooks (optional):** only if a service is **not** Git-linked, add [deploy hook](https://render.com/docs/deploy-hooks) URLs to the GitHub **`staging`** environment as `RENDER_DEPLOY_HOOK_API`, `RENDER_DEPLOY_HOOK_GATEWAY`, and `RENDER_DEPLOY_HOOK_WORKER`. [`.github/workflows/deploy-staging.yml`](../.github/workflows/deploy-staging.yml) POSTs them after CI. If services already auto-deploy from Git, leave these empty to avoid double deploys.

#### Vercel (`apps/web`)

1. Create a [Vercel](https://vercel.com) project from this repo.
2. **Root Directory:** `apps/web`.
3. **Monorepo / workspace files:** For projects created after Aug 2020, Vercel usually **already includes** source outside the root directory ([faq](https://vercel.com/docs/monorepos/monorepo-faq)). The **new-project** flow may not show a toggle. If the build cannot resolve `@deal-coordinator/shared` / `@deal-coordinator/ui`, open **Settings → General** → **Root Directory** and enable the equivalent option. [`apps/web/vercel.json`](../apps/web/vercel.json) runs install/build from the monorepo root.
4. Set **`NEXT_PUBLIC_API_URL`** to the public **API** URL (for example `https://deal-coordinator-api.onrender.com`). The **gateway** is for inbound webhooks; the browser calls the API directly.
5. **Production branch:** set to **`main`** (Vercel → Project → Settings → Git) so production deploys track `main`.
6. **Option A — Vercel Git (simplest):** connect the repo in Vercel; it deploys on pushes to `main` per your Git settings. Optionally turn on “wait for CI” / deployment protection in Vercel if you want parity with Render.
7. **Option B — GitHub Action:** add secrets on the GitHub **`staging`** environment: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (from Vercel → Project → Settings → General, or from `.vercel/project.json` after `vercel link`). [`.github/workflows/deploy-staging.yml`](../.github/workflows/deploy-staging.yml) runs `vercel deploy --prod` after CI when all three are set. Skip this if you use Option A only.

#### GitHub

- Create a **`staging`** [environment](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment) if you use deploy hooks or Vercel secrets above.
- **Manual run:** the deploy workflow also supports **`workflow_dispatch`** from the Actions tab.

### Environment variables

Mirror production **shape** but use **non-production** credentials:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Staging Postgres connection string (often a managed instance). |
| `REDIS_URL` | Staging Redis when worker/queue is enabled. |
| `APP_ENV` | Set to `staging`. |
| `NODE_ENV` | Usually `production` for built artifacts. |
| `API_URL` / `NEXT_PUBLIC_API_URL` | Public URL of the staging API as seen by the browser and server-side web fetches. |
| `AUTH_SECRET` | Strong random secret for session/JWT signing when real auth lands. |
| `STORAGE_DRIVER` | `s3` for shared staging buckets, or `local` for single-node experiments. |
| `AI_PROVIDER` | `fake` for deterministic QA, or `openai` with a **scoped** API key. |

Run migrations as a deploy step:

```bash
pnpm --filter @deal-coordinator/db exec prisma migrate deploy
```

(Execute in CI/CD or release container with `DATABASE_URL` injected.)

### Database

- Use a **dedicated** staging database; never point staging at production.
- Refresh from anonymized dumps if you need realistic load tests; avoid copying PII from prod without a policy.

---

## Production

### Deployment

- **Trigger:** `.github/workflows/deploy-production.yml` on GitHub **Release published** (configure your release process accordingly).
- **Secrets:** Store `DATABASE_URL`, API keys, and signing secrets in the host’s secret manager (GitHub Environments, AWS Secrets Manager, Vault, etc.)—not in the image.

### Environment variables

Production should set at minimum:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Managed Postgres with TLS; restricted network access from API/worker only. |
| `REDIS_URL` | When async features are enabled. |
| `APP_ENV` | `production`. |
| `NODE_ENV` | `production`. |
| `API_URL` | Canonical API base URL. |
| `NEXT_PUBLIC_API_URL` | Same origin or CDN path the browser uses to call the API. |
| `AUTH_SECRET` | High-entropy, rotated on compromise; used when auth is implemented. |
| `STORAGE_DRIVER` | Typically `s3` with least-privilege IAM. |
| `S3_*` | Bucket, region, credentials or IRSA/workload identity. |
| `AI_PROVIDER` / `OPENAI_API_KEY` | Production LLM access with quotas and monitoring. |

### Secrets management

- **GitHub Actions:** Use environment-scoped secrets for `staging` and `production` environments; require reviewers for production.
- **Runtime:** Inject secrets as env vars or mounted files; avoid baking them into Docker layers.
- **Rotation:** Document owners and rotation frequency for DB passwords, API keys, and `AUTH_SECRET`.

### Database

- Run `prisma migrate deploy` during deploy (zero-downtime patterns depend on your migration style).
- Backups and point-in-time recovery are operator responsibilities; audit retention policy is documented in [architecture.md](architecture.md) and [ADR 005](adr/005-audit-policy.md).

---

## Environment variable reference

| Variable | Required | Example / default | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@localhost:5432/deal_coordinator?schema=public` | Prisma connection string. |
| `REDIS_URL` | For future queue | `redis://localhost:6379` | Redis connection. |
| `API_PORT` | No | `3001` | API listen port. |
| `API_URL` | Yes (non-local) | `http://localhost:3001` | Base URL for server-side and gateway calls. |
| `NEXT_PUBLIC_API_URL` | Yes (web) | `http://localhost:3001` | Browser-visible API base. |
| `WEB_PORT` | No | `3000` | Next.js dev port. |
| `WORKER_PORT` | No | `3002` | Reserved for worker HTTP/metrics if added. |
| `GATEWAY_PORT` | No | `3003` | Gateway listen port. |
| `NODE_ENV` | Yes | `development` / `test` / `production` | Standard Node convention. |
| `APP_ENV` | No | `local` | `local` \| `staging` \| `production` for app-level branching. |
| `AUTH_SECRET` | Production | — | Signing secret for auth (stubbed in Phase 1). |
| `STORAGE_DRIVER` | No | `local` | `local` \| `s3`. |
| `STORAGE_LOCAL_PATH` | If local | `./tmp/storage` | Filesystem root for uploads. |
| `S3_BUCKET` | If S3 | — | Object bucket name. |
| `S3_REGION` | If S3 | — | AWS region. |
| `S3_ACCESS_KEY` | If S3 | — | Access key (prefer IAM roles in cloud). |
| `S3_SECRET_KEY` | If S3 | — | Secret key. |
| `S3_ENDPOINT` | Optional | — | Custom S3-compatible endpoint. |
| `AI_PROVIDER` | No | `fake` | `fake` \| `openai`. |
| `OPENAI_API_KEY` | If OpenAI | — | Provider API key. |

See `.env.example` for a copy-paste template maintained alongside the code.

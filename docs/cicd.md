# CI/CD and environments

This repo uses **GitHub Actions** (not CircleCI): [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs lint, typecheck, tests, and build. A follow-up workflow can run deploy hooks and optional Vercel CLI deploys.

See also [environments.md](environments.md) for env vars and [render.yaml](../render.yaml) / [vercel-first-setup.md](vercel-first-setup.md).

## Recommended flow for `main` (staging today)

1. **Branch protection:** Require PRs into `main`, require the **CI** check to pass before merge.
2. **Database migrations:** Apply **`prisma migrate deploy`** against the **staging** database **before** new API containers rely on the new schema.
   - **Automated (recommended):** set GitHub repository secret **`STAGING_DATABASE_URL`** to your Render Postgres **external** connection string (same DB as `deal-coordinator-api`). The **CI** workflow runs `migrate deploy` on every **push to `main`** (after tests, before the final build step) when that secret is set.
   - **Manual:** omit the secret and run locally:  
     `DATABASE_URL='…' pnpm --filter @deal-coordinator/db migrate:deploy`
3. **Render:** Prefer **`autoDeployTrigger: checksPass`** on API / gateway / worker so deploys start **only after** GitHub reports a green **CI** run for that commit (avoids deploying broken code and lines up with migrate-in-CI). If you use **`commit`**, Render may deploy before migrations finish—avoid for schema-breaking releases unless you coordinate.
4. **Vercel:** Connect the Git repo with **Production branch = `main`**. Previews below handle feature branches. Avoid **both** Vercel Git production deploys **and** `vercel deploy --prod` from [deploy-staging.yml](../.github/workflows/deploy-staging.yml) unless you want double deploys.

## Seed (`db:seed`) — usually **not** on every deploy

- **Do not** run seed in CI on every push: it may **duplicate** rows or fight **idempotency** unless the seed script is strictly safe to re-run.
- Run **`pnpm --filter @deal-coordinator/db seed`** manually when bootstrapping a fresh database or refreshing demo data, or add a **one-off** “bootstrap” workflow / `workflow_dispatch` guarded by environment approval.
- Treat **production** seeding as a deliberate, audited operation.

## Feature branches and previews

| Target | Web (Vercel) | API (Render) | Database |
| --- | --- | --- | --- |
| **PR / feature branch** | **Preview deployments** (built-in when Git is connected). Set **`NEXT_PUBLIC_API_URL`** in Vercel **Preview** env to point at an API the preview can reach (often **shared staging API** or a dedicated preview API). | **Option A:** Use **same staging API** as `main` (simplest; schema must stay compatible with both). **Option B:** Duplicate Render services pinned to the **feature branch** (more cost/ops). **Option C:** Manual deploy from branch in Render dashboard. | Shared staging DB vs dedicated preview DB: shared is cheaper; dedicated avoids cross-branch migration clashes (advanced). |
| **Long-lived `staging` branch** | Add a second Vercel **environment** or project wired to that branch; optional second Render blueprint. | Same idea: services on `staging` branch + staging DB URL. | Separate Postgres instance recommended if migrations diverge from `main`. |

**Preview + API caveat:** If the preview uses **production or shared staging** API, you only exercise frontend changes unless you deploy a matching API revision.

## GitHub secrets checklist (staging)

| Secret | Purpose |
| --- | --- |
| `STAGING_DATABASE_URL` | Optional: enables **automated `prisma migrate deploy`** on each `main` push inside CI. |
| `RENDER_DEPLOY_HOOK_*` | Optional: trigger Render when not relying solely on Git auto-deploy. |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Optional: [deploy-staging.yml](../.github/workflows/deploy-staging.yml) production Vercel deploy; skip if Vercel Git deploys `main` only. |

Use [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment) (`staging`) for approval gates on sensitive steps later.

## Cursor / team memory

Point people at this file (or add a short [Cursor rule](https://docs.cursor.com/context/rules-for-ai) that says: “Deployment and migrations: read `docs/cicd.md` and `docs/environments.md`”) so migrations, seeds, and preview API URLs stay consistent.

## Further improvements (incremental)

- **E2E smoke** after deploy (against staging URL) in a small workflow.
- **Sentry / logging** correlation IDs (API already has request id patterns in places).
- **Immutable tags** for production images when you outgrow “deploy from `main` branch”.
- **Prisma migrate resolve** playbook in runbooks if hotfixes touch migration history (rare).

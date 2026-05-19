# Vercel: first-time project setup (web app)

The Next.js app lives in **`apps/web`**. This repo uses **`apps/web/vercel.json`** so install and build run from the monorepo root (`pnpm install …`, `pnpm run build:web …`).

## Option A — Vercel Dashboard (recommended first time)

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → **Add New** → **Project** → import this Git repository.
2. Configure:
   - **Root Directory**: `apps/web`
   - **“Include source files outside of the Root Directory”:** The **import** wizard often does not show this toggle. Vercel turns it **on by default** for projects created after [August 27, 2020](https://vercel.com/docs/monorepos/monorepo-faq) so shared workspace packages resolve. If the build fails because sibling packages are missing, open **Project → Settings → General**, find the **Root Directory** section, and ensure that option is enabled (wording may vary slightly by UI version).
3. **Environment variables** (Production + Preview as needed):
   - `NEXT_PUBLIC_API_URL` — public URL of your API (see `docs/environments.md`).
4. Deploy. Optional: set **Production Branch** and preview behavior under **Settings → Git**.

## Option B — Vercel CLI from your machine

1. The CLI is a dev dependency of **`apps/web`**. Log in: `cd apps/web && pnpm exec vercel login`
2. From the **repository root**, link (creates the project on first run if it does not exist):

   ```bash
   # Optional: your team slug from Vercel → Team → Settings
   export VERCEL_TEAM_SLUG="your-team-slug"

   ./scripts/vercel-link-web.sh
   # Or pass a custom project name:
   # ./scripts/vercel-link-web.sh my-app-web
   ```

3. In the Vercel project **Settings → General**, confirm **Root Directory** is `apps/web`. If builds cannot see `packages/*`, check the Root Directory section for the monorepo / “include files outside root” option. Set **`NEXT_PUBLIC_API_URL`** under **Environment Variables** if you did not add it at import time.
4. Connect the Git repo under **Settings → Git** if you want push-to-deploy, or deploy manually:

   ```bash
   cd apps/web && pnpm exec vercel deploy --prod
   ```

## CI (GitHub Actions)

The workflow **`.github/workflows/deploy-staging.yml`** can run **`npx vercel deploy --prod`** from **`apps/web`** after the `CI` job when these secrets exist on the **`staging`** environment: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. See `docs/environments.md`. Avoid enabling **both** Vercel Git auto-deploy and the same Action on the same branch unless you want double deploys.

## MCP / API limits

The Vercel MCP in this workspace can list teams and deployments but **does not create or link projects**. Initial setup still uses the Dashboard or `vercel link` with your account.

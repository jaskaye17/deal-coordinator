#!/usr/bin/env bash
# Link apps/web to a Vercel project (creates the project on first link if it does not exist).
#
# Prerequisite: log in once:
#   cd apps/web && pnpm exec vercel login
#
# Usage (from repo root):
#   ./scripts/vercel-link-web.sh [project-name]
#
# Optional env:
#   VERCEL_TEAM_SLUG   — team slug (e.g. from Vercel → team settings). If unset, CLI uses your default scope.
#   VERCEL_TOKEN       — if set, passed to the CLI (CI / non-interactive); usually use login instead locally.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"
PROJECT="${1:-deal-coordinator-web}"

if [[ ! -f "$WEB/vercel.json" ]]; then
  echo "error: expected $WEB/vercel.json" >&2
  exit 1
fi

cd "$WEB"

CLI=(pnpm exec vercel)
if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  CLI+=(--token "$VERCEL_TOKEN")
fi

LINK=(link --yes --project "$PROJECT")
if [[ -n "${VERCEL_TEAM_SLUG:-}" ]]; then
  LINK+=(--scope "$VERCEL_TEAM_SLUG")
fi

"${CLI[@]}" "${LINK[@]}"

echo ""
echo "Linked apps/web → Vercel project \"$PROJECT\"."
echo "If this is a new project, open Vercel → Project → Settings → General:"
echo "  - Root Directory should be apps/web (already implied when linking from this folder)."
echo "  - If builds miss workspace packages: Settings → General → Root Directory → include source outside root (often default-on; import UI may hide it)."
echo "  - Add env: NEXT_PUBLIC_API_URL (your public API URL)."
echo "  - Connect Git (Settings → Git) for auto-deploys on push, or run: pnpm exec vercel deploy --prod"
echo ""

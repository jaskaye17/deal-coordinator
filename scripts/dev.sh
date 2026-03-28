#!/usr/bin/env bash
set -euo pipefail

echo "==> Ensuring local infrastructure is running..."
docker compose up -d

echo "==> Starting all services..."
pnpm dev

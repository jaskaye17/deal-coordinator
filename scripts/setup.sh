#!/usr/bin/env bash
set -euo pipefail

echo "==> Starting local infrastructure..."
docker compose up -d

echo "==> Installing dependencies..."
pnpm install

echo "==> Copying environment file..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "    Created .env from .env.example"
else
  echo "    .env already exists, skipping"
fi

echo "==> Generating Prisma client..."
pnpm db:generate

echo "==> Running database migrations..."
pnpm db:migrate

echo "==> Seeding database..."
pnpm db:seed

echo ""
echo "Setup complete! Run 'pnpm dev' to start all services."

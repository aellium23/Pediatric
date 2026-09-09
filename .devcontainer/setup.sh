#!/usr/bin/env bash
# One-time Codespace setup: Postgres + backend schema/seed + deps.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▶ Starting Postgres…"
docker compose up -d postgres
echo "▶ Waiting for Postgres…"
until docker compose exec -T postgres pg_isready -U pedia >/dev/null 2>&1; do sleep 1; done

echo "▶ Backend: install + schema + seed…"
( cd apps/backend && cp -n .env.example .env || true && npm install && node scripts/db-migrate.js && npm run seed )

echo "▶ Web: install…"
( cd apps/web && npm install )

echo "✓ Setup complete. Start everything with:  bash .devcontainer/start.sh"

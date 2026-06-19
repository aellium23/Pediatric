#!/usr/bin/env bash
# Boots Postgres + backend (:3000) + web (:3001). Open the forwarded :3001 URL.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▶ Ensuring Postgres is up…"
docker compose up -d postgres
until docker compose exec -T postgres pg_isready -U pedia >/dev/null 2>&1; do sleep 1; done

echo "▶ Building backend…"
( cd apps/backend && npm run build )

echo "▶ Starting backend on :3000 (background, logs: /tmp/backend.log)…"
( cd apps/backend && nohup node dist/main.js > /tmp/backend.log 2>&1 & )

echo "▶ Waiting for the API…"
until curl -sf http://localhost:3000/health >/dev/null 2>&1; do sleep 1; done
echo "  API ready → http://localhost:3000/docs"

echo "▶ Starting web on :3001 (foreground)…"
cd apps/web
NEXT_PUBLIC_API_BASE=http://localhost:3000/api exec npm run dev -- -p 3001 -H 0.0.0.0

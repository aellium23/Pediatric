#!/usr/bin/env bash
# Local dev bootstrap: Postgres + backend migrations + seed.
set -euo pipefail

echo "▶ Starting Postgres…"
docker compose up -d postgres

echo "▶ Installing backend deps…"
( cd apps/backend && npm install )

echo "▶ Applying migrations + seed…"
( cd apps/backend && cp -n .env.example .env || true && npx prisma migrate dev --name init && npm run seed )

echo "✓ Ready. Run: cd apps/backend && npm run start:dev"
echo "  OpenAPI: http://localhost:3000/docs"

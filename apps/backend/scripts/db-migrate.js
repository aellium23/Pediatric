#!/usr/bin/env node
/**
 * Apply schema migrations at boot, safely, on a database that may predate them.
 *
 * The deployed database was built by `prisma db push`, so it has all the tables
 * but no `_prisma_migrations` ledger. Running `migrate deploy` against it would
 * fail with P3005 ("the database schema is not empty") and the API would never
 * start. The documented fix is to *baseline*: tell Prisma the first migration is
 * already applied, because it is — `db push` produced exactly that schema.
 *
 * So, in order:
 *   1. ledger exists            → nothing to do, just deploy.
 *   2. no ledger, tables exist  → baseline the initial migration, then deploy.
 *   3. no ledger, empty database→ nothing to baseline, deploy builds it.
 *
 * Step 2 runs once in the life of the database and is a no-op forever after.
 *
 * This script exits non-zero if migrations fail. That is deliberate: better a
 * deploy that refuses to start than an API serving against a schema it does not
 * agree with — which, with clinical documents in the vault, is how data gets
 * silently lost.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'prisma', 'migrations');

function run(args) {
  execFileSync('npx', ['prisma', ...args], { stdio: 'inherit' });
}

function firstMigrationName() {
  const names = fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  if (!names.length) throw new Error('No migrations found in prisma/migrations.');
  return names[0];
}

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  let needsBaseline = false;

  try {
    // to_regclass returns NULL for a name that does not resolve, so this is a
    // existence check that never throws on a missing table.
    const [{ ledger, tables }] = await prisma.$queryRawUnsafe(
      `SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS ledger,
              to_regclass('public."User"') IS NOT NULL AS tables`,
    );
    needsBaseline = !ledger && tables;
    if (ledger) console.log('[db] migration ledger present');
    else if (tables) console.log('[db] schema exists without a ledger — baselining');
    else console.log('[db] empty database — migrations will build it');
  } finally {
    await prisma.$disconnect();
  }

  if (needsBaseline) {
    const first = firstMigrationName();
    console.log(`[db] marking ${first} as already applied`);
    run(['migrate', 'resolve', '--applied', first]);
  }

  run(['migrate', 'deploy']);
}

main().catch((e) => {
  console.error('[db] migration step failed:', e.message ?? e);
  process.exit(1);
});

CREATE EXTENSION IF NOT EXISTS vector;
# Initial migration

pgvector needs to be enabled once per database, and Prisma's migration
engine won't infer the `Unsupported("vector(1536)")` column type from
nothing on the very first run — so the cleanest path is:

```bash
# 1. install deps (from the repo root, once package.json exists)
npm install prisma @prisma/client
npm install -D typescript ts-node @types/node

# 2. create the migration (this will fail on the vector column the
#    first time on a fresh DB because the extension isn't enabled yet
#    — that's expected, see step 3)
npx prisma migrate dev --name init --create-only

# 3. open the generated file at
#    prisma/migrations/<timestamp>_init/migration.sql
#    and add this line at the very top, before any CREATE TABLE:
#
#      CREATE EXTENSION IF NOT EXISTS vector;
#
#    Prisma already emitted the `vector vector(1536) NOT NULL` column
#    definition for the embeddings table because of the Unsupported()
#    type — you don't need to hand-write that part.

# 4. apply it
npx prisma migrate dev

# 5. generate the client (also runs automatically after migrate dev)
npx prisma generate
```

If your Postgres role can't run `CREATE EXTENSION` (common on some
managed tiers), enable `vector` once from your provider's dashboard
(Neon and Supabase both have a one-click toggle) and drop that line
from the migration file.

## Re-running after schema changes

```bash
npx prisma migrate dev --name <what_changed>
```

## Seeding

Add to `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

Then:

```bash
npx prisma db seed
```

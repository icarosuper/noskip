# Conventions

Readability rules (named variables, named functions, names) live in the root `CLAUDE.md`; not
repeated here.

## Feature modules

Vertical slices under `src/features/<feature>/`:

```
features/<feature>/
  server.ts        → server functions (createServerFn) + server-only helpers (createServerOnlyFn)
  constants.ts     → shared by server and client; must not import #/db or #/lib/auth
  components/      → React components of this feature
```

Routes stay thin: `loader` calls server functions, the component renders feature components. A
query used by one route still lives in the feature's `server.ts`, not in the route file.

A component or helper used by two features moves to `src/shared/` (create it when the first such
case appears).

## Server functions

- Input is validated with zod in `.validator(...)`. Never trust a client-sent user id — writes get
  the user from `requireUserId()`.
- `GET` for reads, `POST` for writes.
- Missing entity → `throw notFound()` (router renders the not-found component), not `null`.
- Server-only helpers → `createServerOnlyFn`
  ([decisions.md #7](decisions.md#7-server-only-helpers-are-createserveronlyfn-not-plain-functions)).

## Database

- Schema files in `src/db/schema/`, re-exported from `index.ts`. `auth.ts` is generated.
- Column names `snake_case` in SQL, `camelCase` in TS (`titleRomaji: text('title_romaji')`).
- Every schema change ships with its migration: `bun run db:generate --name <change>` →
  commit the file in `drizzle/`. Do not use `db:push` against a database that has data you care
  about.
- Aggregates with `sql<T>\`...\`.mapWith(Number)` — Postgres returns `count`/`avg` as strings.
- Upsert `set` keys are TS field names; unknown keys are silently dropped (see architecture.md
  "What bites").

## Components

- Tailwind with the design tokens from `src/styles.css` (`bg-surface`, `text-muted`, `border-line`,
  `text-accent`…). No raw hex in components.
- After a mutation, `await router.invalidate()` to refresh loader data.
- UI text in English.

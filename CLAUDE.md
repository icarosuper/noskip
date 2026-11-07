# CLAUDE.md

Navigation guide for Claude Code in this repo. Critical rules are here; the rest lives in `docs/`.

## Project

NoSkip: rate anime openings and endings (insert songs are imported but not rated yet). Users sign
in, score themes 1–10, review them, keep a top 10 and follow each other; the site builds all-time,
yearly and per-season rankings from the scores. Think "AniList, but only for OP/ED".

The theme catalog (anime, themes, songs, artists) is a **local copy of AnimeThemes**, written only
by the importer in `scripts/import/`. The app never calls AnimeThemes or AniList at request time.
Our own data is users and what they create (ratings, reviews, top 10s, follows, settings).

## Commands

```bash
bun run db:up                                    # Postgres in Docker (docker-compose.yml)
bun run db:migrate                               # apply migrations in drizzle/
bun run import:animethemes --year 2025 --season FALL   # fill the catalog (or --year / --all)
bun run db:seed-demo                             # made-up users/ratings over the imported catalog
bun run dev                                      # http://localhost:3000
bun run build
bun run typecheck                                # tsc --noEmit
bun run check                                    # biome check (lint + format); add --write to fix
bun run test                                     # unit + integration (Vitest; Postgres for integration)
bun run e2e                                      # Playwright on the fixture server (:3210)
bun run ui:screens                               # screenshot every screen to tests/e2e/.artifacts/screens/
bun run verify                                   # typecheck + check + test + e2e
bun run db:generate --name <change>              # new migration after editing src/db/schema/
```

Full setup (env, OAuth apps): [docs/guides/development.md](docs/guides/development.md). Tests:
[docs/agents/testing.md](docs/agents/testing.md).

## Stack

TanStack Start (React, SSR, file-based routing) · Drizzle ORM + Postgres · Better Auth (Discord +
Google) · Tailwind v4 · zod · bun · Biome.

## Always-on rules

- **The catalog is read-only for the app.** Only `scripts/import/` writes to `anime`, `theme`,
  `song`, `artist`, `song_artist`. Routes and server functions only read them. Ratings point at
  `theme.id`, so the importer upserts by `animethemes_id` and **never deletes**
  ([decisions.md #1](docs/agents/decisions.md#1-the-catalog-is-a-local-copy-of-animethemes-upserted-never-deleted)).
- **Do not hand-edit generated files:** `src/routeTree.gen.ts` (TanStack Router),
  `src/db/schema/auth.ts` (Better Auth CLI — command in its header), `drizzle/` (drizzle-kit).
- **Server-only code in a file that routes import** must be `createServerFn` or
  `createServerOnlyFn`, never a plain exported function — it leaks into the client bundle and the
  build fails with `import-protection`
  ([decisions.md #7](docs/agents/decisions.md#7-server-only-helpers-are-createserveronlyfn-not-plain-functions)).
- **AnimeThemes terms:** the project must stay non-commercial and keep the attribution in the
  footer. Read [data-sources.md](docs/agents/data-sources.md) before touching the importer,
  adding a data source, or embedding videos.

## Language: English only

Everything in the repo is in English: code, comments, UI strings, docs, file names, commit
messages. (Conversation with the user is in Portuguese; the repo is not.)

## Readability

- **Named variable instead of an inline expression.** The result of a check, query or async call
  gets a name before it enters a condition.

  ```ts
  // ✅
  const isQueryTooShort = query.length < MIN_QUERY_LENGTH
  if (isQueryTooShort) return []

  // ❌
  if (query.length < MIN_QUERY_LENGTH) return []
  ```

- **Complex logic becomes a named function.** If a block needs a comment to explain itself, it
  needs a name.
- **A name says "what", not "how".** No abbreviations, no single-letter names (except loop
  indices), no generic names (`result`, `data`, `temp`).
- **The formatter decides formatting** — `bun run check`. 2 spaces, single quotes, no semicolons,
  110 columns.

## Commit style

Conventional Commits, in English, subject line only — no body, no scope, no `Co-Authored-By`, no
trailing period. `<type>: <imperative verb> <complement>`, lowercase after the type, up to ~72
chars. Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`.

The subject states the behavior, not the file: describe the rule that now holds.

```
feat: rank season themes with a bayesian average
fix: keep ratings when a theme disappears upstream
```

## Branch

Straight to `master` by default. For a larger feature that takes several commits, **ask first**
whether the user wants a branch.

## Never commit without an explicit request

1. Implement the change
2. Run `bun run typecheck`, `bun run check` and `bun run test` (plus `bun run e2e` if the UI changed)
3. Show what changed and **suggest one** commit title
4. Wait for the user to approve or ask for the commit

## Bad code along the way

Found bad code **near** what you are touching — badly written, deprecated, unused, duplicated, a
comment lying about the code — **ask before acting**, always offering the three options:

1. **fix it now**
2. **just leave a TODO** (in the code, next to it)
3. **ignore it**

Never pick one on your own. Say what it is, where (`file:line`) and why it is bad in one or two
lines, and ask. What the user's request already covers is not "along the way", it is the work.

## What to read when

Read the doc **before** the task it describes.

- **[docs/agents/architecture.md](docs/agents/architecture.md)** — before creating routes, touching
  the schema, the importer, or auth. Layout, data flow, invariants, what bites.
- **[docs/agents/conventions.md](docs/agents/conventions.md)** — before writing code: feature module
  layout, server functions, queries, components.
- **[docs/agents/features-index.md](docs/agents/features-index.md)** — when looking for "where is
  X", or before adding a feature. Maps features → files, server functions, routes.
- **[docs/agents/decisions.md](docs/agents/decisions.md)** — before "fixing" something that looks
  wrong. Start from the index; read only the entry it points to.
- **[docs/agents/data-sources.md](docs/agents/data-sources.md)** — before touching the importer,
  adding AniList/MAL, or embedding videos. API limits and what each source's terms allow.
- **[docs/agents/testing.md](docs/agents/testing.md)** — before writing or changing a test, or when a
  suite fails for a reason that isn't the code under test. Suites, test databases, fixtures.
- **[docs/TODO.md](docs/TODO.md)** — the backlog: what is left for v0 and what comes after.

## After any change

1. `bun run typecheck`, `bun run check` and `bun run test` (plus `bun run e2e` if the UI changed).
2. **Update the affected docs in the same change:**
   - new/removed route, server function or component → `docs/agents/features-index.md`
   - schema, data flow, layout or an invariant changed → `docs/agents/architecture.md` (a schema
     change follows the skill `schema-change`)
   - a non-obvious pattern introduced → new entry in `docs/agents/decisions.md` (skill
     `record-decision`: next number + one line in the index; never renumber)
   - a new data source, or a terms/limits change → `docs/agents/data-sources.md`
   - closed or discovered work → `docs/TODO.md` (delete closed items; git keeps the history)
   - command, port or setup step changed → this file and `docs/guides/development.md`
3. Suggest the commit title and stop.

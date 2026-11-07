# Testing

> **How to use this file.** Read it before writing or changing a test, or when a suite fails for a
> reason that isn't the code under test. It says which suite a test belongs in, which database it
> hits and what each harness does for you. To look at the UI yourself, use the `review-ui` skill
> (`.claude/skills/review-ui/SKILL.md`).

## Suites

| Suite | Command | Files | Runs against |
|---|---|---|---|
| Unit | `bun run test:unit` | `*.test.ts` in `src/`, `scripts/`, `tests/` | nothing: no database, no network |
| Integration | `bun run test:integration` | `*.integration.test.ts` in `src/`, `scripts/` | Postgres `noskip_test` |
| E2E | `bun run e2e` | `tests/e2e/*.spec.ts` | fixture server on :3210, Postgres `noskip_e2e` |
| Screenshot sweep | `bun run ui:screens` | `tests/screens/screens.spec.ts` | same as E2E |

`bun run test` runs unit + integration; `bun run verify` runs typecheck, check, test and e2e.
Postgres must be up (`bun run db:up`) for everything but unit. Neither suite ever touches the dev
database (`noskip`): connection strings live in `tests/support/env.ts`.

## Unit and integration (Vitest, `vitest.config.ts`)

- **Where a test goes:** pure logic (parsing, the bayesian formula, constants) → unit, next to the
  file. Anything that runs SQL (`features/*/queries.ts`, the importer's upsert) → integration, next
  to the file, named `*.integration.test.ts`.
- **Database:** the global setup (`tests/support/integration-global-setup.ts`) creates
  `noskip_test` if missing and applies `drizzle/` migrations. Each file calls
  `setupTestDatabase()` or `setupTestDatabase(seedAll)` (`tests/support/integration.ts`): every
  test starts from an empty (or freshly seeded) database, so tests never depend on each other's
  rows.
- Files run **one at a time** (they share the database). `DATABASE_URL` is forced to the test
  database, so a stray `import '#/db'` can't reach dev data.
- Queries take `database` as a parameter (conventions.md), which is what lets these tests pass the
  test database in.

## E2E (Playwright, `playwright.config.ts`)

- **Server:** `webServer` starts `scripts/e2e/server.ts`, which re-seeds `noskip_e2e`, writes one
  signed-in storage state per fixture user to `tests/e2e/.auth/<user>.json` and runs `vite dev` on
  :3210. Locally it reuses a server that is already up.
- **Projects:** every spec runs twice, `desktop` (Desktop Chrome) and `mobile` (Pixel 7).
- **Import `test`/`expect` from `tests/e2e/fixtures.ts`**, never from `@playwright/test`. It adds
  to every test:
  - `goto`/`reload` wait for `<html data-hydrated="true">`
    ([decisions.md #9](decisions.md#9-tests-and-agents-wait-for-the-hydration-marker));
  - the database's mutable state (ratings, reviews, top 10s, follows, profiles, usernames) is reset
    before the test (`resetMutableState` in `tests/fixtures/seed.ts`);
  - any `console.error` or uncaught page error **fails the test**. A test that expects one declares
    it: `test.use({ allowedBrowserErrors: [/status of 404/] })`.
- **Signing in:** `test.use(signedInAs('alice'))` on a describe block reuses the prepared storage
  state. A test that signs out or deletes the account uses `signInWithNewSession` so it doesn't
  invalidate the shared session. How the sessions are made without OAuth:
  [decisions.md #8](decisions.md#8-test-sign-in-lives-only-in-tests-never-in-the-app).
- One worker, no parallelism: tests share the database.
- Guards that cover every page: `layout.spec.ts` (overflow on each viewport) and
  `accessibility.spec.ts` (axe-core, fails on serious/critical violations). A new page goes into
  their lists and into `SCREENS` in `tests/screens/screens.spec.ts`.
- Failures leave traces and screenshots in `tests/e2e/.artifacts/results/`; `bun run e2e:report`
  opens the HTML report.

## Fixtures (`tests/fixtures/`)

- `catalog.ts` — a few **fictional** anime in AnimeThemes' upstream shape, loaded through the real
  importer upsert, so the catalog tables are filled the same way production fills them.
  `ANIME_SLUG` / `THEME` name them for tests.
- `users.ts` — fixture users and their ratings, reviews, top 10s, follows and profiles: `alice`
  (main, has content), `bob`, `carol` (private profile), `newbie` (no username → onboarding),
  `leaver` (deletes their account).
- `seed.ts` — `seedAll` for a full seed, `resetMutableState` between E2E tests.

A schema change usually needs these updated: see the `schema-change` skill.

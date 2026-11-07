# TODO

Open work only. When an item closes, **delete it** (git keeps the text) and add a line to "Closed
so far".

## Closed so far

- 2026-11-07 — Production basics: CI (lint, types, migration drift, unit, integration, E2E,
  build), JSON request logs with request ids, not-found and error pages, `/health`, write rate
  limit in Postgres, ownership guard over write server functions, AnimeThemes contract test and
  page validation, scheduled sync workflow (off), Claude Code settings with a Biome hook.
- 2026-11-07 — Screens in the "Stage" theme (light + dark): home, rankings (all-time/year/season),
  season, anime, theme, artist, search, profile, follows, settings, login, onboarding. Reviews,
  top 10, follows, private profiles, spoiler/NSFW blur, account deletion.
- 2026-11-07 — Project skeleton: schema, AnimeThemes importer, auth config, rankings, anime/season/
  profile/search pages, docs.
- 2026-11-07 — Test setup: Vitest unit + integration (real Postgres), Playwright E2E (desktop +
  mobile, accessibility, layout), fixture server for agents, screenshot sweep.

## v0 — first usable version

Scope: sign in (Discord/Google) → rate OP/ED 1–10 → review, top 10, follow → profile with your
ratings and stats → all-time, year and season rankings (bayesian) → "Watch on AnimeThemes" link.

- **Logo**: design the NoSkip logo (the user decides it). Today the wordmark is text: "no" + "skip"
  in the accent color, in `AppShell.tsx` and `login.tsx`.
- **Review the screens live** and adjust; nothing UI-related is committed before approval.
- **Create the OAuth apps** (Discord, Google) and test the full sign-in → onboarding → rate flow.
  Not exercised yet: the skeleton was only tested with seeded users.
- **Ask AnimeThemes (#api on Discord)** the three open questions in
  [data-sources.md](agents/data-sources.md#open-questions--ask-in-the-api-channel-of-their-discord).
- **Import the full catalog** (`--all`) and check the import time and row counts.
- **Turn on the scheduled sync** once production exists: `.github/workflows/sync-catalog.yml` is
  written (daily current season, weekly `--all`) but skipped until the repository has the
  `CATALOG_DATABASE_URL` secret and the `CATALOG_SYNC_ENABLED=true` variable. Run the full import
  by hand first (item above). A failed run only shows in the Actions tab: turn on GitHub's email
  notification for failed workflows.
- **Serve covers from our own cache.** Covers load ~270 ms each from AnimeThemes' `*.r2.dev`
  bucket (rate-limited dev URL, ~220 ms to first byte, no `Cache-Control`). Options: an image proxy
  with long cache headers behind a CDN, or copying covers at import time to our storage; either
  way, resized variants for list (small) and grid (large). Storage goes through the S3 API
  ([decisions.md #13](agents/decisions.md#13-the-app-runs-on-any-node-host-jobs-run-outside-it)).
  Wait until AnimeThemes answers the cover question in
  [data-sources.md](agents/data-sources.md#open-questions--ask-in-the-api-channel-of-their-discord).
  Quick wins already in (`priority` covers, `preconnect`, neutral placeholder).
- **Choose the host** (any Node host: Vercel / Netlify / Fly / Railway / VPS) and a managed
  Postgres. Not blocking: the app is host-agnostic
  ([decisions.md #13](agents/decisions.md#13-the-app-runs-on-any-node-host-jobs-run-outside-it)),
  so CI, error tracking, logs and jobs can be built before this. The choice only sets the build
  preset in `vite.config.ts`. Cloudflare Workers would need Hyperdrive or an HTTP driver, so it
  would reopen #13.
- **Decide how a theme gets its season — before the first deploy.** Today the season ranking uses
  the *anime's* season (`anime.year`/`anime.season`, its premiere). A theme that starts airing later
  lands in the wrong season and never shows up where it aired: a long-running show's new OP (One
  Piece's 2026 OP counts as Fall 1999), a second cour, a sequel catalogued as the same anime.
  AnimeThemes gives each theme entry its `episodes` range but no air date. Options: accept the
  limitation (current choice, 2026-11-07), derive the season from the episode range and the
  anime's start date, or fetch air dates from AniList per anime. Changes the schema (a season on
  `theme`) and the importer.
- **Error tracking (needs: create the account).** Sentry (free tier) or GlitchTip (self-hosted).
  Catches browser and SSR errors the request log doesn't show (a component that throws in the
  browser never reaches the server). Plan: the SDK reads its DSN from an env var and stays off
  without it, so dev and tests send nothing; tag events with the `x-request-id` the server already
  returns, so an event and its log line can be matched.
- **Privacy policy and terms (needs: the owner's decisions on the content).** Required before real users:
  OAuth collects name, email and avatar, and Google's consent screen asks for a privacy policy URL
  in production. Decide: who is the controller and the contact email, what is stored (account,
  ratings, reviews, follows, request logs) and for how long, that account deletion already erases
  everything, and the rules for reviews (what gets removed after a report). Pages `/privacy` and
  `/terms`, linked from the footer and `/login`. Blocks "Create the OAuth apps" for production.
- **Database backups (needs: where to store them).** The catalog can be re-imported; ratings,
  reviews, top 10s and follows can't. Either the managed Postgres's own backups (check retention
  and point-in-time restore when picking it) or a scheduled `pg_dump` from GitHub Actions to an
  S3-compatible bucket
  ([decisions.md #13](agents/decisions.md#13-the-app-runs-on-any-node-host-jobs-run-outside-it)).
  Whichever: restore once, on purpose, to prove it works.
- **Decide whether the UI gets Portuguese (pt-BR).** The UI is English only; the first users are
  likely Brazilian. Cheaper the earlier it's decided: today every string is inline in components.
  If yes: typed message objects per language (no library), locale from `Accept-Language` plus a
  setting, and the screenshot sweep in both languages (pt-BR labels are longer).
- **Decide whether new accounts' votes count immediately.** Today they do (2026-11-07). The risk is
  a burst of fresh accounts pushing a theme up the rankings; the write rate limit
  ([decisions.md #14](agents/decisions.md#14-write-rate-limits-are-counted-in-postgres-one-budget-per-user))
  only slows one account. Options: count votes only after the account is N days old or has N
  ratings, or keep counting them and rely on the bayesian prior plus manual cleanup.

## After v0

- Tier lists (built from the themes the user already rated).
- Connect AniList / MAL → import the user's list → "rate the themes of what you watched".
- Video: embedded AnimeThemes player (if allowed) or YouTube fallback.
- "Best songs" view (group themes by song).
- Filters on a user's rating list (beyond OP/ED and sort): by season/year, by score range, by
  anime, reviewed only…
- Custom lists, like AniList's: user-created named lists of themes (e.g. "Gym", "Best 2010s EDs"),
  public or private.
- Taste comparison between users ("you agree 78%").
- Insert songs (imported, not shown or rated in v0).
- Moderation UI for reported reviews (reports are stored in `review_report`).

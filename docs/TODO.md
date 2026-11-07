# TODO

Open work only. When an item closes, **delete it** (git keeps the text) and add a line to "Closed
so far".

## Closed so far

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
- **Scheduled sync**: re-import the current season daily, the rest weekly. Where it runs depends on
  the deploy choice (cron on a VPS, Vercel Cron, GitHub Actions…).
- **Serve covers from our own cache.** Covers load ~270 ms each from AnimeThemes' `*.r2.dev`
  bucket (rate-limited dev URL, ~220 ms to first byte, no `Cache-Control`). Options: an image proxy
  with long cache headers behind a CDN, or copying covers at import time to our storage; either
  way, resized variants for list (small) and grid (large). Decide with the deploy target, and only
  after AnimeThemes answers the cover question in
  [data-sources.md](agents/data-sources.md#open-questions--ask-in-the-api-channel-of-their-discord).
  Quick wins already in (`priority` covers, `preconnect`, neutral placeholder).
- **Choose the deploy target** (Vercel / Netlify / Cloudflare / VPS) and a managed Postgres.
- **Decide how a theme gets its season — before the first deploy.** Today the season ranking uses
  the *anime's* season (`anime.year`/`anime.season`, its premiere). A theme that starts airing later
  lands in the wrong season and never shows up where it aired: a long-running show's new OP (One
  Piece's 2026 OP counts as Fall 1999), a second cour, a sequel catalogued as the same anime.
  AnimeThemes gives each theme entry its `episodes` range but no air date. Options: accept the
  limitation (current choice, 2026-11-07), derive the season from the episode range and the
  anime's start date, or fetch air dates from AniList per anime. Changes the schema (a season on
  `theme`) and the importer.
- **Abuse basics**: rate-limit the rating endpoint; decide whether new accounts' votes count
  immediately.

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

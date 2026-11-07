# Decisions

Patterns that look wrong (or arbitrary) but are intentional. Read before "fixing" one of them.

## Index

Entries are **self-contained**: read only the one you were pointed at. Cite by **anchor**, never by
line number. A new entry takes the **next number** (highest today is **#13**) plus one line here;
never renumber.

- [**#1** — The catalog is a local copy of AnimeThemes, upserted, never deleted](#1-the-catalog-is-a-local-copy-of-animethemes-upserted-never-deleted)
- [**#2** — Users rate a theme, not a song](#2-users-rate-a-theme-not-a-song)
- [**#3** — Social login only; username picked on onboarding](#3-social-login-only-username-picked-on-onboarding)
- [**#4** — Rankings use a bayesian average, computed per request](#4-rankings-use-a-bayesian-average-computed-per-request)
- [**#5** — No video player in v0: themes link out to AnimeThemes](#5-no-video-player-in-v0-themes-link-out-to-animethemes)
- [**#6** — AnimeThemes is the only data source; AniList is not used yet](#6-animethemes-is-the-only-data-source-anilist-is-not-used-yet)
- [**#7** — Server-only helpers are createServerOnlyFn, not plain functions](#7-server-only-helpers-are-createserveronlyfn-not-plain-functions)
- [**#8** — Test sign-in lives only in tests, never in the app](#8-test-sign-in-lives-only-in-tests-never-in-the-app)
- [**#9** — Tests and agents wait for the hydration marker](#9-tests-and-agents-wait-for-the-hydration-marker)
- [**#10** — Theme "Stage": tokens per theme, choice saved in the browser](#10-theme-stage-tokens-per-theme-choice-saved-in-the-browser)
- [**#11** — Spoiler and NSFW themes are blurred by default](#11-spoiler-and-nsfw-themes-are-blurred-by-default)
- [**#12** — List/grid is saved per screen and applied by CSS](#12-listgrid-is-saved-per-screen-and-applied-by-css)
- [**#13** — The app runs on any Node host; jobs run outside it](#13-the-app-runs-on-any-node-host-jobs-run-outside-it)

---

### 1. The catalog is a local copy of AnimeThemes, upserted, never deleted

The app reads anime/themes/songs/artists from its own Postgres; only `scripts/import/` writes them,
keyed by `animethemes_id`. Calling AnimeThemes per request would be slow, would hit their 90 req/min
limit, and would make the site depend on their uptime (their REST API was returning 503 the day the
project started).

The importer does not delete rows that vanished upstream: ratings reference `theme.id`, and losing a
user's ratings because AnimeThemes merged or renamed a theme is worse than a stale row.

**Don't "fix" by:** fetching from AnimeThemes in a loader, or adding a "delete missing" step to the
importer without a plan for the ratings attached to those themes.

### 2. Users rate a theme, not a song

`rating.theme_id`, not `song_id`. A theme is "OP2 of anime X": the same song can be the opening of
two anime (sequels, movies) and users judge the opening — animation included — not only the track.
Each use is ranked separately.

**Don't "fix" by:** moving ratings to `song`. A "best songs" view can be derived later by grouping
themes by `song_id`.

### 3. Social login only; username picked on onboarding

Discord and Google, no email/password. Passwords bring verification email, reset flow, an email
service and brute-force protection; and in a site whose output is a public ranking, throwaway
email accounts are a vote-stuffing vector. Social login is a natural barrier. If a non-social option
is ever needed, prefer magic link over passwords.

Provider display names are not unique or URL-safe, so after the first sign-in the root route forces
`/onboarding` to pick a `username` (Better Auth `username` plugin), which is the public profile URL.

**Don't "fix" by:** enabling `emailAndPassword`, or using the provider name as the profile URL.

### 4. Rankings use a bayesian average, computed per request

`weighted = (votes × avg + m × C) / (votes + m)`, where `C` is the mean score of the same scope
(global, or that season) and `m` is `MIN_VOTES_GLOBAL` / `MIN_VOTES_SEASON` in
`features/rankings/server.ts`. A theme with one 10/10 does not beat one with fifty 9s.

It is computed in SQL on every request: with a small user base this is cheap and always correct.
When it stops being cheap, move to a materialized view refreshed periodically — not to counters
updated on each rating.

**Don't "fix" by:** ordering by plain `avg(score)`, or by setting `m` to 0.

### 5. No video player in v0: themes link out to AnimeThemes

Videos are hosted by AnimeThemes (`v.animethemes.moe/*.webm`). Playing them inside our site
(hotlinking) spends their donated bandwidth and their ToS forbids using the site "as part of any
effort to compete with us". Until they explicitly allow embedding, each theme has a "Watch ↗" link
to its AnimeThemes page (`animeThemesWatchUrl`). YouTube embeds are the fallback if they say no.

**Don't "fix" by:** adding `<video src="https://v.animethemes.moe/...">` before permission is on
record in [data-sources.md](data-sources.md).

### 6. AnimeThemes is the only data source; AniList is not used yet

AnimeThemes already has everything the v0 needs (titles, season, covers, synopsis, themes, songs,
artists) plus the AniList/MAL ids. AniList's API terms forbid mass collection and use inside
"competing list or tracker services", so it is reserved for the per-user, opt-in list import
(planned), queried one id at a time.

**Don't "fix" by:** backfilling metadata from AniList in bulk.

### 7. Server-only helpers are createServerOnlyFn, not plain functions

`features/*/server.ts` files are imported by routes, so they end up in the client bundle; the Start
compiler strips `createServerFn` handlers, but a plain exported `async function` that calls
`getRequestHeaders()` stays, and the build fails with `[import-protection] Import denied in client
environment`. `getSessionUser` and `requireUserId` are wrapped in `createServerOnlyFn` for that.

**Don't "fix" by:** unwrapping them into plain functions, or moving them to a file routes import
without the wrapper.

### 8. Test sign-in lives only in tests, never in the app

E2E tests and agents need signed-in sessions without OAuth. `tests/support/test-auth.ts` builds a
second Better Auth instance from the same `createAuthOptions` plus the `testUtils` plugin and writes
real session cookies (storage states) into the E2E database. The app itself has no "sign in as"
route or flag.

**Don't "fix" by:** adding a dev-only login route or enabling `testUtils` in `src/lib/auth.ts` —
one misconfigured env var would ship a login bypass.

### 9. Tests and agents wait for the hydration marker

`HydrationMarker` sets `<html data-hydrated="true">` once React hydrates. Before that, the SSR HTML
is visible but inert: clicks do nothing and tests flake. `tests/e2e/fixtures.ts` waits for it after
every `goto`/`reload`; agents browsing the fixture server should do the same.

**Don't "fix" by:** replacing the wait with timeouts or `networkidle`.

### 10. Theme "Stage": tokens per theme, choice saved in the browser

The visual identity is "Stage" (dark music-app look: near-black, pink accent, Space Grotesk +
Inter), chosen from mocks on 2026-11-07. Every color is a CSS variable in `src/styles.css`, used via
Tailwind names (`bg-surface`, `text-accent-text`…); light and dark are two blocks of the same
variables, and more themes may come later as more blocks. The choice (system/dark/light) lives in
`localStorage`; an inline script in `<head>` (`THEME_INIT_SCRIPT`) applies it before first paint,
so `<html>` gets `suppressHydrationWarning`. The toggle icon is switched by CSS (`.when-dark` /
`.when-light`) so server and client render the same markup.

**Don't "fix" by:** using raw hex in components, reading the theme in React state during render
(hydration mismatch), or moving the choice to the database (the anonymous visitor needs it too).

### 11. Spoiler and NSFW themes are blurred by default

AnimeThemes flags versions as spoiler/NSFW. A flagged theme shows a blurred cover and title with a
"show" button (`useSensitiveTheme`). Signed-in users can turn each kind off in Settings
(`profile.show_spoilers` / `show_nsfw`, delivered with `CurrentUser.settings`); anonymous visitors
always get the blur. The blurred cover renders no initials, so the axe contrast scan stays clean.

**Don't "fix" by:** hiding flagged themes from lists (they must still be rankable) or storing the
reveal per theme.

### 12. List/grid is saved per screen and applied by CSS

The user asked for the list/grid choice to persist per screen (rankings, season, artist, profile).
The server can't read `localStorage`, so collections render **both** forms (`view="saved"`) and CSS
picks one: `VIEW_INIT_SCRIPT` (in `<head>`, like the theme script) copies each saved choice to
`<html data-view-<scope>>` before first paint; rules in `styles.css` hide `.view-list-only` /
`.view-grid-only` inside the page's `[data-view-scope]`. With nothing saved: list on phones, grid
from `lg`. The toggle is rendered twice (one per state) for the same reason, and clicking just
updates the attribute and storage — no React state, no re-render.

**Don't "fix" by:** reading `localStorage` during render (hydration mismatch), choosing the view in
a `useEffect` (visible flash), or putting the view back in the URL. A new screen with a toggle needs
its scope in `VIEW_SCOPES` and its block of rules in `styles.css`.

### 13. The app runs on any Node host; jobs run outside it

Decided on 2026-11-07, before choosing a host. The portability contract is **a Node runtime +
Postgres (`DATABASE_URL`) + S3-compatible storage**. The only host-specific code is the build
preset (TanStack Start: Nitro preset or the Cloudflare Vite plugin in `vite.config.ts`). The rest
follows standards every host already understands:

- **Logs** are JSON on stdout. Every host collects stdout, so there is no log shipper in the app.
- **Error tracking** uses an SDK that runs anywhere (Sentry/GlitchTip), configured by env vars.
- **Jobs** (catalog sync, backups) are CLIs (`bun run import:animethemes`, `pg_dump`) run by an
  outside scheduler (GitHub Actions cron, VPS cron, the host's cron). A full import takes longer
  than a serverless function may run, and keeping it out of the app also keeps the app read-only
  for the catalog ([#1](#1-the-catalog-is-a-local-copy-of-animethemes-upserted-never-deleted)).
- **Covers**, once we cache them, go through a small storage interface over the S3 API (R2, S3,
  Backblaze and MinIO all speak it). Write that interface only when the cover work starts.

Why not an adapter layer per host: the hosts already differ only in these few places, and each one
has a standard that removes the difference. Adapters written for hosts we haven't chosen would be
guesses. The one real fork is the runtime: the app uses `drizzle-orm/node-postgres`, which needs
TCP sockets, so Cloudflare Workers only works with `nodejs_compat` + Hyperdrive or a switch to an
HTTP driver (Neon). If Workers is ever chosen, revisit this entry.

**Don't "fix" by:** adding an HTTP endpoint that runs the import from inside the app, writing logs
to files or a host-specific logging API, calling a host's storage SDK directly instead of the S3
API, or adding per-host adapter interfaces before a second host actually exists.

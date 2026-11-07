# Features index

Maps each feature: files, server functions, routes. **Update it when adding/removing a route,
server function or component.**

Each feature has `queries.ts` (pure Drizzle functions taking `database` — what integration tests
call), `server.ts` (thin `createServerFn` wrappers over them) and `components/`.

## Screens (routes)

| Route | Screen |
|---|---|
| `/` | home: current-season top 5, all-time top 5, sign-in pitch for visitors |
| `/rankings?year&season&type=OP\|ED` | one ranking page: all-time by default, year and season selectors (season needs a year), type chips, list/grid |
| `/season/$year/$season` | anime of a season (lowercase season in the URL), prev/next, link to its ranking |
| `/anime/$slug/` | anime: OP and ED lists with quick rating |
| `/anime/$slug/$theme` | theme: score, mean, distribution, your score, review, top-10 heart, followed users' scores, reviews |
| `/artist/$slug` | artist's themes |
| `/search?q&kind` | anime, songs and artists |
| `/u/$username/?type&sort` | profile: name, bio, follow, top 10, stats, ratings list |
| `/u/$username/$kind` | followers / following |
| `/settings` | username, bio, theme, spoiler/NSFW/private toggles, sign out, delete account |
| `/login`, `/onboarding` | provider buttons; pick a username (forced by `__root.tsx`) |
| `/health` | not a screen: server route, 200 `{"status":"ok"}` when Postgres answers, 503 otherwise |

Unknown URLs and `notFound()` render `NotFoundPage`; a thrown error renders `ErrorPage` (both in
`RouteFallbacks.tsx`, set as router defaults in `src/router.tsx`).

Shell: `src/components/AppShell.tsx` (top bar, bottom tab bar on phones, footer attribution).

List/grid is remembered per screen in `localStorage` and applied by CSS
([decisions.md #12](decisions.md#12-listgrid-is-saved-per-screen-and-applied-by-css)); default: list
on phones, grid from `lg`.
From `lg`, the theme page and the profile are two columns.

## Shared components — `src/components/`

| File | Contents |
|---|---|
| `AppShell.tsx` | `TopBar`, `BottomNav`, `Footer` |
| `Cover.tsx` | anime cover, or a colored block with initials |
| `ThemeToggle.tsx` | light/dark toggle, `THEME_INIT_SCRIPT`, `applyThemePreference` ([decisions.md #10](decisions.md#10-theme-stage-tokens-per-theme-choice-saved-in-the-browser)) |
| `view-preference.ts` | `VIEW_SCOPES`, `VIEW_INIT_SCRIPT`, `saveViewPreference` |
| `RouteFallbacks.tsx` | `NotFoundPage`, `ErrorPage` (retry + home; the message only in dev) |
| `ViewToggle.tsx`, `Avatar.tsx`, `EmptyState.tsx`, `HydrationMarker.tsx` | small pieces |
| `ui.ts` | class recipes: segments, chips, buttons, inputs |

## auth — `src/features/auth/`

| File | Contents |
|---|---|
| `server.ts` | `getCurrentUser` (server fn, includes the user's settings), `getSessionUser`, `authorizeWrite` (server-only), `CurrentUser` |

Components: `ProviderIcons.tsx` (Discord/Google marks for `/login`).

Config: `src/lib/auth-options.ts` (shared with tests), `src/lib/auth.ts`, `src/lib/auth-client.ts`.
HTTP handler: `routes/api/auth/$.ts`. Account deletion: Better Auth `deleteUser` (enabled in options).

## abuse — `src/features/abuse/`

| File | Contents |
|---|---|
| `queries.ts` | `enforceRateLimit`, `countRateLimitHit`, `USER_WRITE_LIMIT`, `RateLimitError` ([decisions.md #14](decisions.md#14-write-rate-limits-are-counted-in-postgres-one-budget-per-user)) |

Used by `authorizeWrite` (auth). Ownership guard over all write server functions:
`src/features/write-authorization.test.ts`. User-caused errors extend `UserFacingError`
(`src/lib/errors.ts`).

## catalog — `src/features/catalog/`

| File | Contents |
|---|---|
| `queries.ts` | `searchCatalog`, `listSeasonAnime`, `findAnimeDetail`, `findThemeDetail`, `findArtistDetail` |
| `server.ts` | `search`, `getSeasonAnime`, `getAnimeDetail`, `getThemeDetail`, `getArtistDetail` |
| `theme-summary.ts` | `themeSummaryColumns`, `ThemeSummary`, `isRatedThemeType` (OP/ED only) |
| `constants.ts` | seasons, `RATED_THEME_TYPES`, labels, `SCORES`, `currentSeason()`, `animeThemesWatchUrl()` |
| `components/ThemeItems.tsx` | `ThemeRow`, `ThemeCard`, `ThemeCollection`, `ScoreAside` |
| `components/AnimeCollection.tsx` | anime list/grid |
| `components/useSensitiveTheme.ts` | spoiler/NSFW blur state ([decisions.md #11](decisions.md#11-spoiler-and-nsfw-themes-are-blurred-by-default)) |

Importer (writes this feature's tables): `scripts/import/`.

## ratings — `src/features/ratings/`

| File | Contents |
|---|---|
| `queries.ts` | ratings, reviews (`upsertReview`, `reportReview`…), top 10 (`addFavorite`, `moveFavorite`, `removeFavorite`), `RatingError` |
| `server.ts` | `rateTheme`, `removeRating`, `saveReview`, `removeReview`, `reportThemeReview`, `favoriteTheme`, `unfavoriteTheme`, `moveFavoriteTheme` |
| `limits.ts` | `MAX_FAVORITES`, `REVIEW_MAX_LENGTH` (client-safe; mirrored by DB CHECKs) |
| `components/` | `ScorePicker`, `ReviewForm`, `ReportButton`, `FavoriteButton`, `FavoriteControls` |

## rankings — `src/features/rankings/`

| File | Contents |
|---|---|
| `queries.ts` | `queryRanking({ type?, year?, season?, limit })` — bayesian average; `listCatalogYears` |
| `bayesian.ts` | `bayesianAverage`, `MIN_VOTES_*` |
| `server.ts` | `getRanking`, `getRankingYears` |

## users — `src/features/users/`

| File | Contents |
|---|---|
| `queries.ts` | `findUserProfile`, `listFollows`, `followUser`, `unfollowUser`, `findSettings`, `updateSettings` |
| `server.ts` | `getUserProfile`, `getFollowList`, `followUserFn`, `unfollowUserFn`, `saveSettings` |
| `limits.ts` | `BIO_MAX_LENGTH` |
| `components/FollowButton.tsx` | follow / following toggle |

# Data sources

What each external source provides, its limits, and what its terms allow. Checked 2026-11-07 —
re-check the terms before anything that changes how we use a source (monetization, video embeds,
bulk downloads).

## AnimeThemes — the catalog

- **Endpoint:** `https://graphql.animethemes.moe/` (POST, `Content-Type: application/json`). The
  JSON:API (`api.animethemes.moe`) is **deprecated** upstream and was returning 503; don't use it.
- **Docs:** <https://api-docs.animethemes.moe/graphql/intro/> · schema via introspection.
- **Limits:** 90 requests/minute (`X-RateLimit-*` headers; 429 + `Retry-After` when exceeded),
  query depth 13, complexity 10 000. Depth/complexity errors come back as **200 with `errors`** —
  the client does not retry those. The importer spaces requests 750 ms apart.
- **Pagination:** `*Pagination(first ≤ 100, page)`; nested lists inside a page are not paginated.
- **What we take:** anime (titles, format, year, season, synopsis, cover URLs, AniList/MAL ids),
  themes (type `OP|ED|IN`, sequence, slug), songs, artists (+ credited name).
- **Full import size:** a whole season is ~3 requests; the whole catalog is a few hundred.
- **Scheduled sync** (`.github/workflows/sync-catalog.yml`, off until production): current season
  daily (~3 requests), whole catalog weekly. One run at a time.
- **Contract:** `scripts/import/fixtures/anime-page.sample.json` is a recorded page (Spring 2024,
  five anime, recorded 2026-11-07); `animethemes-contract.test.ts` checks it against the schema the
  client validates every page with.

### Terms (animethemes.moe/about/terms-of-service, /about/faq)

- **Non-commercial only:** "The Site may not be used in connection with any commercial endeavors
  except those that are specifically endorsed or approved by us." No ads/subscriptions without
  their approval.
- **No competing:** prohibited to "use the Site as part of any effort to compete with us or
  otherwise use the Site and/or the Content for any revenue-generating endeavor". Rating/ranking is
  not what they do, but **playing their videos in our site** could read as competing → [decisions.md #5](decisions.md#5-no-video-player-in-v0-themes-link-out-to-animethemes).
- **Bulk:** their FAQ asks "non-commercial, non-competing" projects that need a copy of the
  **videos** to use the quarterly Full Backup torrent (via their Discord) instead of the site, and
  warns of "punitive action" otherwise. That is about video files; metadata through the API at the
  documented rate limit is normal API use.
- **Database dump:** the API documents a `Dump` resource (DB dump of selected tables). Not yet
  confirmed whether third parties may use it.
- **Code** is MIT; **no explicit license on the data**.
- Attribution: footer credits AnimeThemes (`routes/__root.tsx`). Keep it.

### Open questions — ask in the `#api` channel of their Discord

1. May we embed/hotlink their videos (or audio only, `a.animethemes.moe/*.ogg`) in our player?
2. May we use the DB dump to seed the catalog instead of paging the API?
3. Is hotlinking cover images from their R2 bucket fine, or should we copy/proxy them?

Record the answers here (date + who answered) and update [decisions.md #5](decisions.md#5-no-video-player-in-v0-themes-link-out-to-animethemes) if video becomes allowed.

## AniList — not used yet (planned: opt-in list import)

- **Terms:** <https://docs.anilist.co/guide/terms-of-use>
  - Free for non-commercial use; commercial is free under US$150/month revenue, licence above.
  - "Using the AniList API as a backup or data storage service is strictly prohibited."
  - "Hoarding or mass collection of data from the AniList API is strictly prohibited."
  - "Use of the AniList API within competing, non-complementary services of the same nature is
    prohibited … anime and manga list or tracker services." A theme-rating site is complementary,
    but keep the AniList use clearly complementary (importing a user's list on their request).
  - Apps with "AniList" in the name must be marked unofficial.
- **Plan:** "Connect AniList" in settings → OAuth → read the user's completed/watching list → match
  by `anime.anilist_id` (already in our DB) → show those themes to rate. One user, on request; no
  bulk crawling ([decisions.md #6](decisions.md#6-animethemes-is-the-only-data-source-anilist-is-not-used-yet)).

## YouTube — not used yet (fallback player)

- Embed player only. API Services policy: don't store API data beyond ~30 days **except video ids**.
  Search quota is low (~100 searches/day on the free quota), so ids would come from user
  suggestions + moderation rather than automatic search.

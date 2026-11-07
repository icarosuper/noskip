# Development setup

Requirements: bun, Docker.

```bash
bun install
cp .env.example .env.local        # then fill it in (below)
bun run db:up                     # Postgres 18 on localhost:5432 (user/pass/db: noskip/noskip/noskip)
bun run db:migrate
bun run import:animethemes --year 2025 --season FALL   # a season is enough to develop
bun run dev                       # http://localhost:3000
```

## `.env.local`

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql://noskip:noskip@localhost:5432/noskip` (matches docker-compose) |
| `BETTER_AUTH_URL` | `http://localhost:3000` |
| `BETTER_AUTH_SECRET` | `openssl rand -hex 32` |
| `DISCORD_CLIENT_ID` / `_SECRET` | see below |
| `GOOGLE_CLIENT_ID` / `_SECRET` | see below |
| `LOG_LEVEL` | optional: `debug`, `info` (default), `warn`, `error` |

The server logs one JSON line per request. To read them while developing:
`bun run dev | bunx pino-pretty`. `GET /health` answers 200 when the app reaches Postgres.

Without the OAuth variables the site runs (browsing, rankings), but sign-in fails; Better Auth logs
a warning per missing provider at startup.

## OAuth apps

**Discord** — <https://discord.com/developers/applications> → New Application → OAuth2:
copy Client ID / Client Secret; add redirect `http://localhost:3000/api/auth/callback/discord`.

**Google** — <https://console.cloud.google.com/apis/credentials> → Create credentials → OAuth
client ID → Web application; authorized redirect URI
`http://localhost:3000/api/auth/callback/google`. The consent screen must be configured first
(External, testing mode is fine; add yourself as a test user).

In production, add the same callback paths on the production domain.

## Importer

```bash
bun run import:animethemes --year 2025 --season FALL   # one season
bun run import:animethemes --year 2025                 # one year
bun run import:animethemes --all                       # whole catalog (a few minutes)
```

Re-running is safe (upsert by `animethemes_id`). Respect the API limits in
[data-sources.md](../agents/data-sources.md) — don't run several imports in parallel.

## Schema changes

1. Edit `src/db/schema/*.ts` (never `auth.ts` by hand — change `src/lib/auth.ts` and regenerate it
   with the command in its header).
2. `bun run db:generate --name <change>` → review the SQL in `drizzle/`.
3. `bun run db:migrate`.

`bun run db:studio` opens Drizzle Studio to browse the data.

## Reviewing the UI by hand

`bun run e2e:server` runs the app on http://localhost:3210 against the seeded fixture database
(fictional anime, users alice/bob/carol/newbie). To browse signed in without OAuth, run
`bun run e2e:cookie alice` and paste the printed line in the browser console on that page.
`bun run ui:screens` saves screenshots of every screen (phone/desktop × light/dark) to
`tests/e2e/.artifacts/screens/`.

To review with **real covers**, import a season into the dev database and run
`bun run db:seed-demo`: it creates 40 made-up users (ids `demo-*`) with ratings, reviews, top 10s,
follows and bios over that catalog, and prints a console line to sign in as one of them on
http://localhost:3000. Re-running replaces the demo users; nothing else is touched.

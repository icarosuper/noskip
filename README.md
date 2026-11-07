# NoSkip

Rate anime openings, endings and insert songs, and see what everyone else likes: all-time and
per-season rankings built from user scores.

Theme data comes from [AnimeThemes](https://animethemes.moe). Not affiliated with AnimeThemes or
AniList.

## Stack

TanStack Start (React) · Drizzle ORM + PostgreSQL · Better Auth (Discord, Google) · Tailwind CSS ·
bun

## Running locally

```bash
bun install
cp .env.example .env.local
bun run db:up && bun run db:migrate
bun run import:animethemes --year 2025 --season FALL
bun run dev
```

Details (OAuth apps, importer, schema changes): [docs/guides/development.md](docs/guides/development.md).

// Imports the AnimeThemes catalog into the local database (upsert by upstream id).
//
//   bun run import:animethemes --year 2025 --season FALL   # one season
//   bun run import:animethemes --year 2025                 # one year
//   bun run import:animethemes --current-season            # the season airing now (daily sync)
//   bun run import:animethemes --all                       # everything (a few hundred requests)
//
// Safe to re-run: every row is keyed by `animethemes_id`. Rows that disappear upstream are NOT
// deleted — ratings point at themes and must survive upstream churn (decisions.md #1).

import { db } from '#/db'
import { createAnimeThemesClient } from './animethemes-client'
import { parseImportArgs } from './cli-args'
import { upsertAnime } from './upsert'

async function main() {
  const filter = parseImportArgs(Bun.argv.slice(2))
  console.log('Importing AnimeThemes catalog with filter', filter)

  const client = createAnimeThemesClient()
  let importedAnimeCount = 0
  let importedThemeCount = 0

  for await (const page of client.fetchAnimePages(filter)) {
    for (const upstream of page.data) {
      await upsertAnime(db, upstream)
      importedAnimeCount++
      importedThemeCount += upstream.animethemes.length
    }
    const { currentPage, lastPage } = page.paginatorInfo
    console.log(`page ${currentPage}/${lastPage} — ${importedAnimeCount} anime, ${importedThemeCount} themes`)
  }

  console.log(`Done: ${importedAnimeCount} anime, ${importedThemeCount} themes`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

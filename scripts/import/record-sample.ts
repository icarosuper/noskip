// Re-records fixtures/anime-page.sample.json from the live API: one request (Spring 2024, page 1),
// trimmed to the anime below, picked to cover a missing English title, several performers, spoiler
// entries and a theme with more than one version. Run it when AnimeThemes changes its schema on
// purpose, then fix the importer until animethemes-contract.test.ts passes again.
//
//   bun scripts/import/record-sample.ts

import { createAnimeThemesClient } from './animethemes-client'

const SAMPLE_FILTER = { year: 2024, season: 'SPRING' } as const
const SAMPLE_ANIME_IDS = new Set([4256, 4259, 4262, 4271, 4274])
const SAMPLE_PATH = `${import.meta.dir}/fixtures/anime-page.sample.json`

const client = createAnimeThemesClient()
const firstPage = await client.fetchAnimePages(SAMPLE_FILTER).next()
if (firstPage.done) throw new Error('AnimeThemes returned no page')

const sampledAnime = firstPage.value.data.filter((upstreamAnime) => SAMPLE_ANIME_IDS.has(upstreamAnime.id))
const isSampleIncomplete = sampledAnime.length !== SAMPLE_ANIME_IDS.size
if (isSampleIncomplete) console.warn('Some sample anime are gone upstream; pick new ids in SAMPLE_ANIME_IDS')

await Bun.write(SAMPLE_PATH, `${JSON.stringify({ ...firstPage.value, data: sampledAnime }, null, 2)}\n`)
console.log(`Recorded ${sampledAnime.length} anime to ${SAMPLE_PATH}`)

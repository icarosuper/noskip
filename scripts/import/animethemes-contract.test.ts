import { describe, expect, it } from 'vitest'
import { parseAnimePage } from './animethemes-client'
import recordedPage from './fixtures/anime-page.sample.json'

// The contract with AnimeThemes: fixtures/anime-page.sample.json is a real animePagination page
// (Spring 2024, trimmed to five anime), recorded with the importer's own query. If the importer's
// expectations drift from what the API sends, these fail here instead of in the scheduled sync.
// Refresh the sample: bun scripts/import/record-sample.ts

function recordedPageCopy() {
  return structuredClone(recordedPage) as Record<string, unknown> & typeof recordedPage
}

describe('AnimeThemes animePagination contract', () => {
  it('accepts the recorded page', () => {
    const animePage = parseAnimePage(recordedPageCopy())

    expect(animePage.data.length).toBeGreaterThan(0)
    expect(animePage.data.every((upstreamAnime) => upstreamAnime.animethemes.length > 0)).toBe(true)
  })

  it('names the field when a required one disappears', () => {
    const changedPage = recordedPageCopy()
    // biome-ignore lint/suspicious/noExplicitAny: deliberately breaking the recorded shape
    delete (changedPage.data[0].animethemes[0] as any).type

    expect(() => parseAnimePage(changedPage)).toThrow('at data[0].animethemes[0].type')
  })

  it('refuses a theme type it does not know', () => {
    const changedPage = recordedPageCopy()
    changedPage.data[0].animethemes[0].type = 'CM'

    expect(() => parseAnimePage(changedPage)).toThrow(/animethemes/)
  })
})

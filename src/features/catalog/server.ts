import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '#/db'
import { getSessionUser } from '#/features/auth/server'
import { SEASONS } from './constants'
import { findAnimeDetail, findArtistDetail, findThemeDetail, listSeasonAnime, searchCatalog } from './queries'

export const search = createServerFn({ method: 'GET' })
  .validator(z.object({ query: z.string().trim().min(2).max(100) }))
  .handler(({ data }) => searchCatalog(db, data.query))

export const getSeasonAnime = createServerFn({ method: 'GET' })
  .validator(z.object({ year: z.number().int(), season: z.enum(SEASONS) }))
  .handler(({ data }) => listSeasonAnime(db, data.year, data.season))

export const getAnimeDetail = createServerFn({ method: 'GET' })
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const currentUser = await getSessionUser()
    const animeDetail = await findAnimeDetail(db, data.slug, currentUser?.id ?? null)
    if (!animeDetail) throw notFound()
    return animeDetail
  })

export const getThemeDetail = createServerFn({ method: 'GET' })
  .validator(z.object({ animeSlug: z.string(), themeSlug: z.string() }))
  .handler(async ({ data }) => {
    const currentUser = await getSessionUser()
    const themeDetail = await findThemeDetail(db, data.animeSlug, data.themeSlug, currentUser?.id ?? null)
    if (!themeDetail) throw notFound()
    return themeDetail
  })

export const getArtistDetail = createServerFn({ method: 'GET' })
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const artistDetail = await findArtistDetail(db, data.slug)
    if (!artistDetail) throw notFound()
    return artistDetail
  })

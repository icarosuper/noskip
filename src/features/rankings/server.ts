import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '#/db'
import { RATED_THEME_TYPES, SEASONS } from '#/features/catalog/constants'
import { listCatalogYears, queryRanking } from './queries'

export type { RankedTheme } from './queries'

export const getRanking = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      type: z.enum(RATED_THEME_TYPES).optional(),
      year: z.number().int().optional(),
      season: z.enum(SEASONS).optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }),
  )
  .handler(({ data }) => queryRanking(db, data))

export const getRankingYears = createServerFn({ method: 'GET' }).handler(() => listCatalogYears(db))

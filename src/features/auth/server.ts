import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { db } from '#/db'
import { enforceRateLimit, USER_WRITE_LIMIT } from '#/features/abuse/queries'
import { findSettings, type UserSettings } from '#/features/users/queries'
import { auth } from '#/lib/auth'

export interface CurrentUser {
  id: string
  name: string
  image: string | null
  username: string | null
  settings: UserSettings
}

// For use inside other server functions. Must be createServerOnlyFn, not a plain exported
// function: this file is imported by routes, and a plain function would leak into the client
// bundle (the build fails with "import-protection").
export const getSessionUser = createServerOnlyFn(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session) return null
  const { id, name, image, username } = session.user
  const settings = await findSettings(db, id)
  return { id, name, image: image ?? null, username: username ?? null, settings }
})

// Loaded once per navigation by the root route; components read it from route context.
export const getCurrentUser = createServerFn({ method: 'GET' }).handler(() => getSessionUser())

// The first line of every server function that writes: throws when nobody is signed in or the
// user went over the write limit (decisions.md #14), and returns the id to write as. Never take
// the user id from the client.
export const authorizeWrite = createServerOnlyFn(async (): Promise<string> => {
  const currentUser = await getSessionUser()
  if (!currentUser) throw new Error('Not signed in')
  await enforceRateLimit(db, `writes:${currentUser.id}`, USER_WRITE_LIMIT)
  return currentUser.id
})

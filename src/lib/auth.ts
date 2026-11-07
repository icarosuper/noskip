import { betterAuth } from 'better-auth'
import { db } from '#/db'
import { createAuthOptions } from './auth-options'

export const auth = betterAuth(createAuthOptions(db))

export type Session = typeof auth.$Infer.Session

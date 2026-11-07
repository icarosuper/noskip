import { isNotFound, isRedirect } from '@tanstack/react-router'
import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start'
import { UserFacingError } from '#/lib/errors'
import { logger } from '#/lib/logger'

export const REQUEST_ID_HEADER = 'x-request-id'

// Without a start instance TanStack Start adds this CSRF check on its own; defining one replaces
// the default, so it has to be listed here explicitly.
const csrfMiddleware = createCsrfMiddleware({
  filter: (context) => context.handlerType === 'serverFn',
})

// One JSON line per request, with an id that is also sent back in the response header. A proxy's
// id is reused so its logs and ours can be joined.
const requestLogMiddleware = createMiddleware({ type: 'request' }).server(
  async ({ request, pathname, next }) => {
    const requestId = request.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID()
    const startedAt = performance.now()
    const requestLogger = logger.child({ requestId, method: request.method, path: pathname })

    try {
      const result = await next()
      const durationMs = Math.round(performance.now() - startedAt)
      const status = result.response.status
      const isServerError = status >= 500
      if (isServerError) requestLogger.error({ status, durationMs }, 'request failed')
      else requestLogger.info({ status, durationMs }, 'request')
      result.response.headers.set(REQUEST_ID_HEADER, requestId)
      return result
    } catch (error) {
      const durationMs = Math.round(performance.now() - startedAt)
      requestLogger.error({ err: error, durationMs }, 'request threw')
      throw error
    }
  },
)

// A server function that throws ends up as a serialized error in a 200/500 response, so its stack
// would never reach the request log. notFound() and redirect() are control flow, not failures, and a
// UserFacingError (top 10 full, rate limit) is the user's doing, so it is only a warning.
const serverFunctionErrorMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next, serverFnMeta }) => {
    try {
      return await next()
    } catch (error) {
      const serverFunction = serverFnMeta?.name
      const isControlFlow = isNotFound(error) || isRedirect(error)
      const isUserFacing = error instanceof UserFacingError
      if (isUserFacing) logger.warn({ serverFunction, reason: error.message }, 'server function refused')
      else if (!isControlFlow) logger.error({ err: error, serverFunction }, 'server function threw')
      throw error
    }
  },
)

export const startInstance = createStart(() => ({
  // Logging first, so requests the CSRF check rejects are logged too.
  requestMiddleware: [requestLogMiddleware, csrfMiddleware],
  functionMiddleware: [serverFunctionErrorMiddleware],
}))

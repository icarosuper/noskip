import pino from 'pino'

// JSON lines on stdout: every host collects stdout, so the app ships no log transport
// (decisions.md #13). Locally, pipe through `bunx pino-pretty` to read them.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // Never let a session or OAuth secret reach the logs, even if a whole request object is logged.
  redact: {
    paths: ['*.cookie', '*.authorization', '*.headers.cookie', '*.headers.authorization', '*.token'],
    censor: '[redacted]',
  },
})

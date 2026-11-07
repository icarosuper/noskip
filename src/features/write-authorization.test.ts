import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Ownership guard: every write server function must get the acting user from the session through
// authorizeWrite() (which also applies the write rate limit), and must never accept a user id from
// the client. A text check over features/*/server.ts: it can't follow helpers, so the call has to
// be in the server function's own body. Reads (GET) are not checked.

const FEATURES_DIRECTORY = join(import.meta.dirname)

interface ServerFunctionSource {
  file: string
  name: string
  source: string
}

function listWriteServerFunctions(): ServerFunctionSource[] {
  const featureNames = readdirSync(FEATURES_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  return featureNames.flatMap((featureName) => {
    const file = join(featureName, 'server.ts')
    const fileSource = readServerFile(file)
    if (fileSource === null) return []
    // Each `export const` starts a new declaration; a declaration runs until the next one.
    const declarations = fileSource.split(/\n(?=export const )/)
    return declarations
      .filter((declaration) => declaration.includes("createServerFn({ method: 'POST' })"))
      .map((declaration) => ({
        file,
        name: declaration.match(/^export const (\w+)/)?.[1] ?? '(unnamed)',
        source: declaration,
      }))
  })
}

function readServerFile(file: string) {
  try {
    return readFileSync(join(FEATURES_DIRECTORY, file), 'utf8')
  } catch {
    return null
  }
}

const writeServerFunctions = listWriteServerFunctions()

describe('write server functions', () => {
  it('are found (the guard is not checking nothing)', () => {
    expect(writeServerFunctions.length).toBeGreaterThan(5)
  })

  it.each(writeServerFunctions)('$file $name calls authorizeWrite()', ({ source }) => {
    expect(source).toContain('await authorizeWrite()')
  })

  it.each(writeServerFunctions)('$file $name does not take a user id from the client', ({ source }) => {
    expect(source).not.toMatch(/userId\s*:/i)
  })
})

// PostToolUse hook (.claude/settings.json): after Claude edits or writes a file, run Biome on that
// one file with --write, so formatting and import order never need a separate pass. Files Biome
// doesn't handle (Markdown, generated files excluded in biome.json) are skipped silently.
// Lint errors Biome can't fix are sent back to Claude (exit code 2), which then fixes them.

interface HookInput {
  tool_input?: { file_path?: string }
}

const BIOME_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.jsonc', '.css']

const hookInput: HookInput = JSON.parse(await Bun.stdin.text())
const editedFile = hookInput.tool_input?.file_path ?? ''
const isBiomeFile = BIOME_EXTENSIONS.some((extension) => editedFile.endsWith(extension))
if (!isBiomeFile) process.exit(0)

const biome = Bun.spawnSync(
  ['bunx', 'biome', 'check', '--write', '--no-errors-on-unmatched', '--files-ignore-unknown=true', editedFile],
  { cwd: `${import.meta.dir}/../..`, stdout: 'pipe', stderr: 'pipe' },
)
const hasUnfixableProblems = biome.exitCode !== 0
if (hasUnfixableProblems) {
  process.stderr.write(`Biome found problems it can't fix in ${editedFile}:\n`)
  process.stderr.write(biome.stdout.toString() + biome.stderr.toString())
  process.exit(2)
}

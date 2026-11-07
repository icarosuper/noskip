---
name: review-ui
description: Run NoSkip's real app on the fixture server and look at it in a headless browser to catch visual bugs, broken layouts and interaction bugs — screenshot sweep plus hands-on browsing with agent-browser, signed in as fixture users, phone and desktop, light and dark. Use when asked to see, open, click through, screenshot, review, QA or dogfood the UI, to "confirm it works" in the running app, or after a frontend change that tests alone don't show. Never use the dev server or dev database for this.
---

# Review the UI on the fixture server

`bun run e2e:server` (`scripts/e2e/server.ts`) re-seeds the `noskip_e2e` database with the fixture
catalog and users, writes one signed-in storage state per user to `tests/e2e/.auth/<user>.json`,
and runs `vite dev` on **http://localhost:3210**. It never touches the dev database.

**Don't** browse `bun run dev` (:3000) for this: it is the user's dev database and possibly their
own running server. Only when the user asks to review with real covers, use the demo seed on :3000
as described in [development.md](../../../docs/guides/development.md#reviewing-the-ui-by-hand).

`$SCRATCH` below is your session's scratchpad directory — write its absolute path, it is not an env
var.

## 1. Start the server (background)

Postgres must be up (`bun run db:up`). Then:

```bash
bun run e2e:server > "$SCRATCH/server.out" 2>&1          # run_in_background: true
```

Wait for it in one call — success or failure, never just one:

```bash
for i in $(seq 1 120); do grep -q -E 'ready in|is in use|error|Error' "$SCRATCH/server.out" && break; sleep 0.5; done; tail -8 "$SCRATCH/server.out"
```

`Port 3210 is in use` → a fixture server is already up (yours from earlier, or a Playwright run):
stop it (step 5) and start again, so the database is freshly seeded. A Postgres connection error →
`bun run db:up`.

Vite serves with HMR: **code edits show up on reload**, no restart needed. Restarting re-seeds the
database, wiping whatever you did in the browser.

## 2. Quick pass: the screenshot sweep

```bash
bun run ui:screens
```

Reuses the running server and saves every main page × {desktop, mobile} × {light, dark} to
`tests/e2e/.artifacts/screens/<project>-<scheme>/<screen>.png` (list in
`tests/screens/screens.spec.ts`). Read the PNGs that matter for the change — or all of them for a
full review. It fails only if a page doesn't load or logs errors, never on looks: judging the
looks is your job. A **new screen** belongs in `SCREENS` there.

## 3. Hands-on: agent-browser

The sweep only sees first paint. Use the browser for what it can't: clicking, forms, menus,
dialogs, rating, top 10 reorder, follow, theme/view toggles, spoiler reveal, hover and focus
states, errors in the console. Load the usage guide first (`agent-browser skills get core`; for a
bug hunt, also `skills get dogfood`). Always a named session — the default one is shared with every
agent and the user:

```bash
export AGENT_BROWSER_SESSION=noskip-review
agent-browser --state tests/e2e/.auth/alice.json open http://localhost:3210/
agent-browser wait --fn "document.documentElement.dataset.hydrated === 'true'"
agent-browser snapshot -i                         # refs for clicking
agent-browser screenshot "$SCRATCH/home.png"      # your own look: Read it. Evidence goes in step 6
agent-browser errors; agent-browser console       # JS errors and hydration warnings are findings
```

- **Wait for hydration after every `open`/`reload`**, as above: before it the SSR page is visible
  but clicks do nothing
  ([decisions.md #9](../../../docs/agents/decisions.md#9-tests-and-agents-wait-for-the-hydration-marker)).
  Not `networkidle`, not a fixed wait.
- **Who you are:** `--state tests/e2e/.auth/<user>.json` on `open`. To switch user,
  `agent-browser close` and open again with the other state; anonymous → `agent-browser cookies
  clear`. Users (`tests/fixtures/users.ts`): `alice` (main, has ratings/reviews/top 10), `bob`,
  `carol` (private profile), `newbie` (no username → lands on `/onboarding`), `leaver` (for account
  deletion).
- **Widths:** `agent-browser set viewport 375 812` (phone, the narrowest we support) and
  `set viewport 1280 800` (desktop); check in between (768, 1024) when the layout changes at a
  breakpoint. **Theme:** `agent-browser set media dark|light`, then reload. Check both: colors are
  tokens per theme ([decisions.md #10](../../../docs/agents/decisions.md#10-theme-stage-tokens-per-theme-choice-saved-in-the-browser)).
- **Routes** (`src/routes/`): `/`, `/rankings` (`?year=2024&season=SPRING`), `/season/2024/spring`,
  `/search?q=ro`, `/anime/<slug>`, `/anime/<slug>/OP1`, `/artist/<slug>`, `/u/<username>`,
  `/u/<username>/followers|following`, `/settings`, `/login`, `/onboarding`. Anime slugs:
  `ANIME_SLUG` in `tests/fixtures/catalog.ts`.

What to look for: text overflowing or cut, elements overlapping, horizontal scroll on the phone,
the bottom nav covering content, low contrast in one theme only, layout shift or a flash on load
(list/grid and theme are applied before paint —
[decisions.md #12](../../../docs/agents/decisions.md#12-listgrid-is-saved-per-screen-and-applied-by-css)),
blur missing on spoiler/NSFW themes, a button that does nothing, a state that doesn't update after
a mutation, focus lost or invisible, console errors.

**Not bugs:** the round floating button at the bottom right is the TanStack devtools (dev only).
The React DevTools and `[vite]` lines in the console are noise.

## 4. Know what the data can't show

The fixture catalog is a handful of **fictional** anime with no real cover images, a few users and
ratings. Good for layout, flows, permissions (private profile, signed out), spoiler/NSFW, empty and
filled states. **Not** good for: real cover art and image loading, long real titles in many
languages, rankings with many votes, pagination at scale. Say so in the report instead of claiming
it was checked; for those, offer a review on the demo seed (:3000).

## 5. Stop — always, also after a failure

```bash
agent-browser close
pkill -TERM -f 'scripts/e2e/[s]erver.ts'
sleep 2; (exec 3<>/dev/tcp/127.0.0.1/3210) 2>/dev/null && echo "3210 still open"
```

SIGTERM makes `server.ts` stop vite too. The `[s]` keeps `pkill` from matching its own shell.
Still open → `pgrep -af 'vite dev --port 3210'` and kill that.

## 6. Report — with evidence the developer can open

The terminal shows no images, so every problem gets a file the developer can click. One folder per
run, under the gitignored artifacts dir:

```bash
REPORT="$PWD/tests/e2e/.artifacts/reviews/$(date +%Y-%m-%d_%H%M)"; mkdir -p "$REPORT"
agent-browser screenshot '<selector of the broken element>' "$REPORT/theme-375-dark-title-cut-before.png"
agent-browser screenshot --full "$REPORT/theme-375-dark-page.png"     # when the context matters
```

- **One screenshot per problem**, named `<screen>-<width>-<scheme>-<what>-before.png`. Prefer the
  element (`screenshot <selector>`); add the full page only when the problem is where it sits.
- **Video only for behavior** a still can't show (a click that does nothing, a menu that closes, a
  flash): `agent-browser record start "$REPORT/<screen>-<what>.webm"`, the steps, `record stop`.
  Keep it to the repro.
- **Fixed it? Add the after shot** — same route, user, width, theme and selector, named as a pair
  (`...-before.png` / `...-after.png`). HMR applies the fix; reload and wait for hydration first.
- Exploratory screenshots stay in the scratchpad; only evidence of a problem goes in the report.

Per the project rules, UI changes need the user's approval before any commit; finding a problem is
not a license to redesign — fix what is clearly broken, ask about anything that is a matter of
taste.

Then tell the user what was checked (screens, widths, themes, users), what was not (step 4), and
for each problem: route, user, width and theme, what is wrong, the steps, whether it was fixed, and
the **full absolute path** of each file (before and after) — a relative path isn't clickable in the
terminal.

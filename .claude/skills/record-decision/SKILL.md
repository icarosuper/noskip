---
name: record-decision
description: Add an entry to NoSkip's docs/agents/decisions.md — next free number, the Index line, the entry in the house format, the anchor to cite it with, and the pointer in the code. Use whenever a change introduces a non-obvious or unusual pattern (something a later reader would "fix"), when the user asks to record/registrar a decision, or when amending or reversing an existing entry.
---

# Record a decision

`docs/agents/decisions.md` holds patterns that look wrong (or arbitrary) but are intentional. The
Index at the top is how entries are found, so numbers and anchors come from the helper, never by
hand:

```bash
S=.claude/skills/record-decision/decision.sh
$S next                     # next free number
$S anchor 7                 # anchor of an existing entry
$S anchor "13. <title>"     # anchor a new heading will get
$S check                    # Index consistent, numbers unique, "highest today" current
```

## Is it a decision?

Yes when a later reader would ask "why this, when the obvious way is the other one?" and the answer
isn't in the code itself. No for a plain description of how something works (that is
`architecture.md`, and only if the code can't answer it) or for a bug fix with nothing surprising
left behind. Changing an existing decision → amend or reverse **that** entry (below), don't add a
competing one. Search first: `grep -n "<symbol>" docs/agents/decisions.md`.

## 1. Write the entry

Append it at the **end of the file** (one blank line before), heading `### N. <title>`. The title
states the rule, not the topic — `Users rate a theme, not a song`, not `Rating target`. Body, in
the house format (look at #1–#4):

```markdown
### N. <the rule, as a sentence>

What was chosen and where it lives (`file`, function, column), in a short paragraph. Then why: the
real case that produced it, what was measured, the trade-off accepted, and what to do when the
trade-off stops holding.

**Don't "fix" by:** each tempting change, and why it breaks.
```

Plain English, short sentences, wrapped near 100 columns. Cite other entries by anchor:
`[#7](#7-...)` inside decisions.md, `[decisions.md #7](decisions.md#7-...)` from another doc under
`docs/agents/`, with the right relative path from elsewhere (`docs/agents/decisions.md#7-...` from
CLAUDE.md). Get every anchor from `$S anchor`.

## 2. Index

- Add, in numeric order at the end of `## Index`:
  `- [**#N** — <title exactly as in the heading>](<$S anchor N>)`
- Bump the intro sentence: `(highest today is **#N**)`.

## 3. Pointer in the code

Next to the code that looks wrong, a comment that says the why in a few words and names the entry
in the house format — `(decisions.md #N)`, which is what `grep` finds:

```ts
// Social login only — no email/password (decisions.md #3).
```

A test that pins the rule can name it too: `it('keeps a theme ... (decisions.md #1)')`.

## 4. Check

```bash
$S check
```

## Amending or reversing

- **Amending** (a later decision refines this one): add `**Amendment (see #M):**` to the old entry,
  saying what still holds and what no longer does; update its `Don't "fix" by`.
- **Reversing:** the entry stays (its number is cited in code and docs); rewrite the heading and
  body to the new rule, say what it reverses and why, then run `$S check` — a changed heading
  changes the anchor, so find and update every reference:
  `grep -rn "decisions.md#N-\|(#N-" --include=*.md --include=*.ts --include=*.tsx .`

Tell the user the number and the one-line rule you recorded.

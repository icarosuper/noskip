#!/usr/bin/env bash
# Helpers for docs/agents/decisions.md.
#
#   decision.sh next                     next free number (highest "### N." + 1)
#   decision.sh anchor "<N>. <title>"    GitHub anchor for an entry heading (without the "### ")
#   decision.sh anchor <N>               anchor of an existing entry
#   decision.sh check                    one Index line per entry, every Index link resolves, no
#                                        duplicate numbers, "highest today is **#N**" is current
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
FILE="$ROOT/docs/agents/decisions.md"

# GitHub's slug: lowercase, drop everything but [a-z0-9 _-], spaces become '-'. "—" leaves two
# spaces, hence the "--" in some anchors.
slug() { printf '%s' "$1" | tr 'A-Z' 'a-z' | sed -E 's/[^a-z0-9 _-]//g; s/ /-/g'; }

headings() { grep -E '^### [0-9]+\. ' "$FILE" | sed -E 's/^### //'; }

highest() { headings | sed -E 's/^([0-9]+)\..*/\1/' | sort -n | tail -1; }

case "${1:-}" in
next)
	echo $(($(highest) + 1))
	;;
anchor)
	arg="${2:?usage: decision.sh anchor <N> | \"<N>. <title>\"}"
	if [[ "$arg" =~ ^[0-9]+$ ]]; then
		arg="$(headings | grep -E "^$arg\. " || true)"
		[ -n "$arg" ] || { echo "no entry #$2" >&2; exit 1; }
	fi
	echo "#$(slug "$arg")"
	;;
check)
	bad=0
	index="$(sed -n '/^## Index/,/^---$/p' "$FILE")"
	while IFS= read -r heading; do
		number="${heading%%.*}"
		anchor="#$(slug "$heading")"
		count="$(grep -cF "](${anchor})" <<<"$index" || true)"
		[ "$count" = 1 ] || { echo "#$number: $count Index lines link to $anchor" >&2; bad=1; }
	done < <(headings)
	heading_anchors="$(headings | while IFS= read -r heading; do echo "#$(slug "$heading")"; done)"
	while IFS= read -r link; do
		grep -qxF "$link" <<<"$heading_anchors" || { echo "Index link $link matches no heading" >&2; bad=1; }
	done < <(grep -oE '\]\(#[^)]+\)' <<<"$index" | sed -E 's/^\]\((.*)\)$/\1/')
	duplicates="$(headings | sed -E 's/^([0-9]+)\..*/\1/' | sort -n | uniq -d)"
	[ -z "$duplicates" ] || { echo "duplicate numbers: $duplicates" >&2; bad=1; }
	grep -qF "highest today is **#$(highest)**" "$FILE" ||
		{ echo "Index intro does not say \"highest today is **#$(highest)**\"" >&2; bad=1; }
	[ "$bad" = 0 ] && echo "ok: $(headings | wc -l) entries, Index consistent"
	exit "$bad"
	;;
*)
	sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'
	exit 2
	;;
esac

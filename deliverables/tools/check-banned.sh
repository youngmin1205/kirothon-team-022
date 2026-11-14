#!/usr/bin/env bash
# Fails if any banned word appears in deliverable text sources.
# The word list lives OUTSIDE the repo (it contains company/customer names): ~/.kirothon-banned.txt, one per line.
LIST="${BANNED_LIST:-$HOME/.kirothon-banned.txt}"
[ -f "$LIST" ] || { echo "no banned list at $LIST (skip)"; exit 0; }
hits=$(grep -rniF -f <(grep -v '^\s*$' "$LIST") story.md ppt/slides.md video/src diagrams/*.mmd 2>/dev/null)
[ -z "$hits" ] && { echo "banned-word check: clean"; exit 0; }
echo "$hits"; exit 1

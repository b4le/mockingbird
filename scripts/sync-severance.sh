#!/usr/bin/env bash
# Sync data/local/ → data/severance/ for publication.
#
# data/local/ is gitignored — it's the working copy written by the
# atticus-finch export pipeline and it can change on every export.
# data/severance/ is the tracked, publishable copy that ships to
# GitHub Pages. This separation makes every publish a deliberate act
# rather than an automatic side-effect of running the exporter.
#
# Usage:
#   scripts/sync-severance.sh           # show diff, prompt before copy
#   scripts/sync-severance.sh --apply   # copy without prompting
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/data/local"
DST="$ROOT/data/severance"

if [[ ! -d "$SRC" ]]; then
  echo "error: $SRC does not exist — run the atticus-finch export first." >&2
  exit 1
fi

if [[ ! -d "$DST" ]]; then
  echo "error: $DST does not exist — bootstrap it once with 'cp -r data/local data/severance'." >&2
  exit 1
fi

echo "Diff between data/local/ (source) and data/severance/ (tracked):"
echo
diff -rq "$SRC" "$DST" || true
echo

if [[ "${1:-}" != "--apply" ]]; then
  read -r -p "Apply this diff to data/severance/? [y/N] " reply
  case "$reply" in
    y|Y|yes|YES) ;;
    *) echo "aborted."; exit 0 ;;
  esac
fi

rsync -a --delete "$SRC/" "$DST/"
echo "raw copy applied; running schema normalisation..."
node "$ROOT/scripts/normalise-severance.mjs"
echo "synced. review with 'git diff data/severance' before committing."

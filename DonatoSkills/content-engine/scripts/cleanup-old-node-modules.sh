#!/usr/bin/env bash
# Remove node_modules from Remotion calendar/video runs older than KEEP_DAYS (default: 3).
# Safe to run at any time — only touches already-rendered/uploaded projects.
#
# Usage:
#   ./cleanup-old-node-modules.sh           # remove dirs older than 3 days
#   ./cleanup-old-node-modules.sh 5         # remove dirs older than 5 days
#   DRY_RUN=true ./cleanup-old-node-modules.sh   # preview without deleting

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../../" && pwd)"
CALENDARS_DIR="$(cd "$(dirname "$0")/../calendars" && pwd)"
LEGACY_VIDEOS_DIR="$REPO_ROOT/videos"   # pre-calendar-system renders (Apr 2026 and earlier)

KEEP_DAYS="${1:-3}"
DRY_RUN="${DRY_RUN:-false}"

# Compute the cutoff date (YYYY-MM-DD) by subtracting KEEP_DAYS from today.
# date -v is macOS; date -d is GNU/Linux.
CUTOFF=$(date -v "-${KEEP_DAYS}d" '+%Y-%m-%d' 2>/dev/null \
  || date -d "-${KEEP_DAYS} days" '+%Y-%m-%d')

removed=0
skipped=0

_process_nm_dir() {
  local nm_dir="$1"

  # Walk up the path looking for a directory name that contains a YYYY-MM-DD date.
  # The date is in the calendar dir name (e.g. facts-2026-04-22, daily-2026-03-25).
  local check_dir
  check_dir="$(dirname "$nm_dir")"
  local cal_date=""

  for _ in 1 2 3 4 5; do
    local candidate
    candidate=$(basename "$check_dir" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' || true)
    if [ -n "$candidate" ]; then
      cal_date="$candidate"
      break
    fi
    check_dir="$(dirname "$check_dir")"
    # Stop at repo root
    [[ "$check_dir" == "/" || "$check_dir" == "$REPO_ROOT" ]] && break
  done

  if [ -z "$cal_date" ]; then
    skipped=$((skipped + 1))
    return
  fi

  if [[ "$cal_date" < "$CUTOFF" ]]; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  [dry-run] would remove: $nm_dir  ($cal_date)"
    else
      rm -rf "$nm_dir"
      echo "  removed: $nm_dir  ($cal_date)"
    fi
    removed=$((removed + 1))
  else
    skipped=$((skipped + 1))
  fi
}

_scan_dir() {
  local base_dir="$1"
  [ -d "$base_dir" ] || return 0

  # Use process substitution to avoid subshell variable scoping (removed/skipped must be writable)
  while IFS= read -r nm_dir; do
    _process_nm_dir "$nm_dir"
  done < <(find "$base_dir" -maxdepth 6 -name "node_modules" -type d -prune 2>/dev/null)
}

echo "cleanup-old-node-modules: cutoff=$CUTOFF keep_days=$KEEP_DAYS dry_run=$DRY_RUN"
echo ""

echo "→ Scanning calendars: $CALENDARS_DIR"
_scan_dir "$CALENDARS_DIR"

echo "→ Scanning legacy videos: $LEGACY_VIDEOS_DIR"
_scan_dir "$LEGACY_VIDEOS_DIR"

echo ""
echo "Done. removed=$removed skipped=$skipped"
df -h / | tail -1

#!/usr/bin/env bash
# Remove node_modules from calendar runs older than KEEP_DAYS (default: 3).
# Safe to run at any time — only touches rendered/uploaded projects.

set -euo pipefail

CALENDARS_DIR="$(cd "$(dirname "$0")/../calendars" && pwd)"
KEEP_DAYS="${1:-3}"

# Compute the cutoff date (YYYY-MM-DD) by subtracting KEEP_DAYS from today.
CUTOFF=$(date -v "-${KEEP_DAYS}d" '+%Y-%m-%d' 2>/dev/null \
  || date -d "-${KEEP_DAYS} days" '+%Y-%m-%d')  # GNU fallback

removed=0
skipped=0

for nm_dir in "$CALENDARS_DIR"/*/videos/*/node_modules; do
  [ -d "$nm_dir" ] || continue

  # Extract YYYY-MM-DD from the calendar dir name (e.g. facts-2026-04-22 → 2026-04-22)
  cal_dir=$(basename "$(dirname "$(dirname "$nm_dir")")")
  cal_date=$(echo "$cal_dir" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' || true)

  if [ -z "$cal_date" ]; then
    skipped=$((skipped + 1))
    continue
  fi

  if [[ "$cal_date" < "$CUTOFF" ]]; then
    rm -rf "$nm_dir"
    removed=$((removed + 1))
  else
    skipped=$((skipped + 1))
  fi
done

echo "cleanup-old-node-modules: removed=$removed skipped=$skipped cutoff=$CUTOFF"
df -h / | tail -1

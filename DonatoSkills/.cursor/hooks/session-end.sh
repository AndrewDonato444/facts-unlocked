#!/bin/bash
# session-end.sh
# Cursor hook: Runs when agent session ends
# Logs session info and optionally reminds about /compound

# Read hook input
input=$(cat)

# Extract status from input
status=$(echo "$input" | jq -r '.status // "unknown"' 2>/dev/null)

# Log to session history (optional)
LOG_DIR=".cursor/hooks/logs"
mkdir -p "$LOG_DIR" 2>/dev/null

timestamp=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$timestamp] Session ended with status: $status" >> "$LOG_DIR/sessions.log" 2>/dev/null

# Return empty response (fire and forget hook)
echo '{}'

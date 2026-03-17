#!/bin/bash
# run-analytics-loop.sh
# Shell wrapper for the analytics-loop skill phases.
# Runs all 5 phases sequentially: pull-analytics, score-posts,
# check-suppressions, decompose-variables, generate-briefs.
#
# Usage:
#   ./scripts/run-analytics-loop.sh <project_id>
#   ./scripts/run-analytics-loop.sh example-project
#
# CONFIGURATION (set in .env.local):
#   PROJECT_DIR  - Project directory (default: parent of scripts/)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${NC} $1"; }
error() { echo -e "${RED}[$(date '+%H:%M:%S')] ✗${NC} $1"; }

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(dirname "$SCRIPT_DIR")}"

if [ -f "$PROJECT_DIR/.env.local" ]; then
    source "$PROJECT_DIR/.env.local"
fi

# ─────────────────────────────────────────────
# Validate arguments
# ─────────────────────────────────────────────

if [ -z "$1" ]; then
    error "Missing required argument: project_id"
    echo ""
    echo "Usage: $0 <project_id>"
    echo "Example: $0 example-project"
    exit 1
fi

PROJECT_ID="$1"
TODAY="$(date '+%Y-%m-%d')"
ANALYTICS_DIR="$PROJECT_DIR/analytics-loop"
SCRIPTS_DIR="$ANALYTICS_DIR/scripts"
DATA_DIR="$ANALYTICS_DIR/data/$PROJECT_ID/$TODAY"

# ─────────────────────────────────────────────
# Verify Node.js and scripts exist
# ─────────────────────────────────────────────

if ! command -v node &> /dev/null; then
    error "Node.js is required but not found."
    exit 1
fi

if [ ! -d "$SCRIPTS_DIR" ]; then
    error "Analytics loop scripts not found at: $SCRIPTS_DIR"
    exit 1
fi

# Create output directory
mkdir -p "$DATA_DIR/briefs"

echo ""
echo "═══════════════════════════════════════════════════════════"
log "Analytics Loop — $PROJECT_ID — $TODAY"
echo "═══════════════════════════════════════════════════════════"
echo ""

FAILED=0

# ─────────────────────────────────────────────
# Phase 1: Pull Analytics
# ─────────────────────────────────────────────

log "Phase 1/5: Pull analytics from Zernio..."
if node "$SCRIPTS_DIR/pull-analytics.js" "$PROJECT_ID"; then
    success "Phase 1 complete — raw analytics collected"
else
    error "Phase 1 failed — pull-analytics"
    FAILED=1
fi

# ─────────────────────────────────────────────
# Phase 2: Score Posts
# ─────────────────────────────────────────────

if [ "$FAILED" -eq 0 ]; then
    log "Phase 2/5: Score posts with engagement density formula..."
    if node "$SCRIPTS_DIR/score-posts.js" "$PROJECT_ID"; then
        success "Phase 2 complete — posts scored"
    else
        error "Phase 2 failed — score-posts"
        FAILED=1
    fi
fi

# ─────────────────────────────────────────────
# Phase 3: Check Suppressions
# ─────────────────────────────────────────────

if [ "$FAILED" -eq 0 ]; then
    log "Phase 3/5: Check suppressions..."
    if node "$SCRIPTS_DIR/check-suppressions.js" "$PROJECT_ID"; then
        success "Phase 3 complete — suppressions checked"
    else
        error "Phase 3 failed — check-suppressions"
        FAILED=1
    fi
fi

# ─────────────────────────────────────────────
# Phase 4: Decompose Variables
# ─────────────────────────────────────────────

if [ "$FAILED" -eq 0 ]; then
    log "Phase 4/5: Decompose variables and identify winning template..."
    if node "$SCRIPTS_DIR/decompose-variables.js" "$PROJECT_ID"; then
        success "Phase 4 complete — variables decomposed"
    else
        error "Phase 4 failed — decompose-variables"
        FAILED=1
    fi
fi

# ─────────────────────────────────────────────
# Phase 5: Generate Briefs
# ─────────────────────────────────────────────

if [ "$FAILED" -eq 0 ]; then
    log "Phase 5/5: Generate exploit/explore briefs..."
    if node "$SCRIPTS_DIR/generate-briefs.js" "$PROJECT_ID"; then
        success "Phase 5 complete — briefs generated"
    else
        error "Phase 5 failed — generate-briefs"
        FAILED=1
    fi
fi

# ─────────────────────────────────────────────
# Report
# ─────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════════"
if [ "$FAILED" -eq 0 ]; then
    success "Analytics loop complete for $PROJECT_ID"
    echo "  Data written to: $DATA_DIR"
else
    error "Analytics loop failed — see errors above"
    exit 1
fi
echo "═══════════════════════════════════════════════════════════"

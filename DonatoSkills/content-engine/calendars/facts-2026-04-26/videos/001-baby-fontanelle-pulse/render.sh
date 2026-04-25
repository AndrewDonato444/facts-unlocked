#!/bin/bash
set -euo pipefail

VIDEO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$VIDEO_DIR/../../../../../.." && pwd)"

load_env() {
  local envfile="$1"
  if [ -f "$envfile" ]; then
    set -a; source "$envfile"; set +a
    echo "Loaded env: $envfile"
  fi
}
load_env "$REPO_ROOT/.env.local"

cd "$VIDEO_DIR"

echo "=== Generating TTS voiceover ==="
npx tsx --no-cache scripts/generate-voiceover.ts

echo "=== Rendering video ==="
mkdir -p out
npx remotion render src/index.ts BabyFontanellePulse out/video.mp4 --log=verbose

echo ""
echo "VIDEO_COMPLETE"
echo "asset_path: $VIDEO_DIR/out/video.mp4"
echo "duration: ~29s"
echo "dimensions: 1080x1920"

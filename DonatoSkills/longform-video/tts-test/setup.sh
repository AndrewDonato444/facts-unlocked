#!/bin/bash
# Kokoro TTS Voice Test — Setup Script
# Installs Python 3.12 + Kokoro + espeak-ng, creates a venv, and runs the test

set -e

echo "=== Kokoro TTS Voice Test Setup ==="

# Step 1: Install Python 3.12 if not available
if ! command -v python3.12 &>/dev/null; then
  echo "Installing Python 3.12 via Homebrew..."
  brew install python@3.12
fi

PYTHON=$(command -v python3.12)
echo "Using Python: $PYTHON ($($PYTHON --version))"

# Step 2: Install espeak-ng (required for phoneme conversion)
if ! command -v espeak-ng &>/dev/null; then
  echo "Installing espeak-ng..."
  brew install espeak-ng
fi

# Step 3: Create virtual environment
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"

if [ ! -d "$VENV_DIR" ]; then
  echo "Creating virtual environment..."
  $PYTHON -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

# Step 4: Install dependencies
echo "Installing Kokoro and dependencies..."
pip install --upgrade pip -q
pip install "kokoro>=0.9.2" soundfile -q

echo ""
echo "=== Setup complete ==="
echo "To run the voice test:"
echo "  cd $SCRIPT_DIR"
echo "  source .venv/bin/activate"
echo "  PYTORCH_ENABLE_MPS_FALLBACK=1 python test_voices.py"

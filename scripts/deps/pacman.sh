#!/usr/bin/env bash
# system dependencies (Arch / Manjaro)
set -euo pipefail
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"

$SUDO pacman -Sy --noconfirm git ffmpeg python python-node curl ca-certificates

# ollama (64-bit only; on i686 see the 32-bit notes in the README)
curl -fsSL https://ollama.com/install.sh | $SUDO sh
# (or: $SUDO pacman -S ollama  if your repo mirrors it)

echo
echo "✓ System dependencies installed."
echo "  Next: ollama pull llama3 && ollama pull nomic-embed-text"
echo "  Then: cd <this repo> && ./setup.sh && ./start.sh"

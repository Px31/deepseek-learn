#!/usr/bin/env bash
# system dependencies (Debian / Ubuntu)
set -euo pipefail
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"

$SUDO apt-get update
$SUDO apt-get install -y ca-certificates curl gnupg git ffmpeg python3 python3-venv python3-pip

# Node.js 20 LTS from NodeSource (distro nodejs is usually too old for Vite)
curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
$SUDO apt-get install -y nodejs

# ollama (64-bit only; on i686 see the 32-bit notes in the README)
curl -fsSL https://ollama.com/install.sh | $SUDO sh

echo
echo "✓ System dependencies installed."
echo "  Next: ollama pull llama3 && ollama pull nomic-embed-text"
echo "  Then: cd <this repo> && ./setup.sh && ./start.sh"

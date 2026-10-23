#!/usr/bin/env bash
# system dependencies (openSUSE)
set -euo pipefail
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"

$SUDO zypper --non-interactive install git ffmpeg python3 python3-pip curl ca-certificates
# Node.js 20 (openSUSE base repos are often stale; NodeSource is the reliable path):
curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
$SUDO zypper --non-interactive refresh
$SUDO zypper --non-interactive install nodejs

# ollama (64-bit only; on i686 see the 32-bit notes in the README)
curl -fsSL https://ollama.com/install.sh | $SUDO sh

echo
echo "✓ System dependencies installed."
echo "  Next: ollama pull llama3 && ollama pull nomic-embed-text"
echo "  Then: cd <this repo> && ./setup.sh && ./start.sh"

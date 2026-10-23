#!/usr/bin/env bash
# system dependencies (Fedora / RHEL / Rocky / Alma)
set -euo pipefail
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"

$SUDO dnf install -y git ffmpeg python3 python3-pip curl ca-certificates
# Fedora ships a recent Node.js + npm in the default repos:
$SUDO dnf install -y nodejs npm
# On RHEL-family without Node in the base repos, use NodeSource instead:
#   curl -fsSL https://rpm.nodesource.com/setup_20.x | $SUDO bash - && $SUDO dnf install -y nodejs

# ollama (64-bit only; on i686 see the 32-bit notes in the README)
curl -fsSL https://ollama.com/install.sh | $SUDO sh

echo
echo "✓ System dependencies installed."
echo "  Next: ollama pull llama3 && ollama pull nomic-embed-text"
echo "  Then: cd <this repo> && ./setup.sh && ./start.sh"

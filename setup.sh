#!/bin/bash
set -e

echo "🚀 Starting DeepSeek Learn Setup..."

# Check Prerequisites
command -v python3 >/dev/null 2>&1 || { echo >&2 "Python 3 is required. Aborting."; exit 1; }
command -v node >/dev/null 2>&1 || { echo >&2 "Node.js is required. Aborting."; exit 1; }
command -v ollama >/dev/null 2>&1 || { echo >&2 "Ollama is required. Please install from https://ollama.com. Aborting."; exit 1; }

# 1. Backend Setup
echo "📦 Setting up Python Backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# 2. Frontend Setup
echo "🎨 Setting up React Frontend..."
cd frontend
npm install
cd ..

# 3. Pull Ollama Models
echo "🧠 Pulling AI Models (Llama3 & Nomic)..."
ollama pull llama3
ollama pull nomic-embed-text

echo "✅ Setup Complete! Run ./start.sh to launch."

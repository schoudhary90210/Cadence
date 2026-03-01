#!/usr/bin/env bash
# FluencyLens — one-command setup for backend + frontend
# Usage: bash scripts/setup.sh
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo "=================================================="
echo " FluencyLens Setup"
echo "=================================================="

# ---------------------------------------------------------------------------
# Backend
# ---------------------------------------------------------------------------
echo ""
echo "→ Setting up backend..."
cd "$BACKEND"

if [ ! -d "venv" ]; then
  echo "  Creating Python venv..."
  python3 -m venv venv
fi
source venv/bin/activate

echo "  Installing Python dependencies..."
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

# Download CMUDict for syllable counting
echo "  Downloading NLTK CMUDict..."
python3 -m nltk.downloader -q cmudict

# Create directories
mkdir -p demo_samples/cached_results ml_cache

# Create .env if not present
if [ ! -f ".env" ]; then
  grep -v "^# ---" "$ROOT/.env.example" | grep -v "^# frontend" | grep -v "NEXT_PUBLIC" > .env
  echo "  Created backend/.env from .env.example"
fi

echo "  Backend ready."
echo "    cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000"
echo "    API docs: http://localhost:8000/docs"

deactivate

# ---------------------------------------------------------------------------
# Frontend
# ---------------------------------------------------------------------------
echo ""
echo "→ Setting up frontend..."
cd "$FRONTEND"

if command -v bun &>/dev/null; then
  PM="bun"; INSTALL="bun install"; DEV="bun dev"
elif command -v pnpm &>/dev/null; then
  PM="pnpm"; INSTALL="pnpm install"; DEV="pnpm dev"
else
  PM="npm"; INSTALL="npm install"; DEV="npm run dev"
fi

echo "  Using: $PM"
$INSTALL

if [ ! -f ".env.local" ]; then
  grep "NEXT_PUBLIC" "$ROOT/.env.example" > .env.local
  echo "  Created frontend/.env.local"
fi

echo "  Frontend ready."
echo "    cd frontend && $DEV"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "=================================================="
echo " Setup complete! Next steps:"
echo ""
echo "  1. Copy demo audio files to backend/demo_samples/"
echo "     (fluent_sample.wav, stuttered_sample.wav, mixed_sample.wav)"
echo ""
echo "  2. Start backend:"
echo "     cd backend && source venv/bin/activate"
echo "     uvicorn main:app --reload --port 8000"
echo ""
echo "  3. Start frontend (new terminal):"
echo "     cd frontend && $DEV"
echo ""
echo "  4. Open: http://localhost:3000"
echo "     Docs: http://localhost:8000/docs"
echo "  5. Verify: curl http://localhost:8000/health"
echo "=================================================="

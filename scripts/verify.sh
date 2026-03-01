#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/../backend"
source venv/bin/activate

uvicorn main:app --port 8000 &
UVICORN_PID=$!
sleep 4

echo ""
echo "=== GET /health ==="
curl -s http://localhost:8000/health | python3 -m json.tool

echo ""
echo "=== GET /demo-samples ==="
curl -s http://localhost:8000/demo-samples | python3 -m json.tool

kill $UVICORN_PID 2>/dev/null
wait $UVICORN_PID 2>/dev/null
echo ""
echo "Server stopped."

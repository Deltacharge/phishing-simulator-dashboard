#!/bin/bash

# ═══════════════════════════════════════════════════
#  🛑 Phishing Simulation — Stop Script
#  Stops both the Node.js server and ngrok tunnel
# ═══════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=3000

echo ""
echo "🛑 Phishing Simulation — Stopping..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

STOPPED=0

# ─── Kill server by saved PID ────────────────────
if [ -f "$SCRIPT_DIR/.server.pid" ]; then
  SERVER_PID=$(cat "$SCRIPT_DIR/.server.pid")
  if kill -0 $SERVER_PID 2>/dev/null; then
    kill $SERVER_PID 2>/dev/null
    echo "   ✓ Server stopped (PID: $SERVER_PID)"
    STOPPED=1
  fi
  rm -f "$SCRIPT_DIR/.server.pid"
fi

# ─── Kill anything on the port (fallback) ────────
if fuser $PORT/tcp > /dev/null 2>&1; then
  fuser -k $PORT/tcp > /dev/null 2>&1
  echo "   ✓ Killed process on port $PORT"
  STOPPED=1
fi

# ─── Kill ngrok by saved PID ────────────────────
if [ -f "$SCRIPT_DIR/.ngrok.pid" ]; then
  NGROK_PID=$(cat "$SCRIPT_DIR/.ngrok.pid")
  if kill -0 $NGROK_PID 2>/dev/null; then
    kill $NGROK_PID 2>/dev/null
    echo "   ✓ Ngrok stopped (PID: $NGROK_PID)"
    STOPPED=1
  fi
  rm -f "$SCRIPT_DIR/.ngrok.pid"
fi

# ─── Kill all ngrok processes (fallback) ─────────
if pgrep -x ngrok > /dev/null 2>&1; then
  pkill -x ngrok
  echo "   ✓ Killed all ngrok processes"
  STOPPED=1
fi

# ─── Clean up ────────────────────────────────────
rm -f "$SCRIPT_DIR/.ngrok.log"

if [ $STOPPED -eq 0 ]; then
  echo "   ℹ️  No running processes found."
fi

echo ""
echo "✅ All stopped."
echo ""

#!/bin/bash

# ═══════════════════════════════════════════════════
#  🎣 Phishing Simulation — Start Script
#  Kills existing processes, starts ngrok + server
# ═══════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=3000

echo ""
echo "🎣 Phishing Simulation — Starting..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─── Step 1: Kill existing processes ─────────────
echo ""
echo "🔄 Stopping existing processes..."

# Kill any process on port 3000
if fuser $PORT/tcp > /dev/null 2>&1; then
  fuser -k $PORT/tcp > /dev/null 2>&1
  echo "   ✓ Killed existing server on port $PORT"
  sleep 1
else
  echo "   ✓ Port $PORT is free"
fi

# Kill any existing ngrok
if pgrep -x ngrok > /dev/null 2>&1; then
  pkill -x ngrok
  echo "   ✓ Killed existing ngrok process"
  sleep 1
else
  echo "   ✓ No existing ngrok process"
fi

# ─── Step 2: Start ngrok in background ───────────
echo ""
echo "🌐 Starting ngrok tunnel..."
ngrok http $PORT --log=stdout --log-format=logfmt > "$SCRIPT_DIR/.ngrok.log" 2>&1 &
NGROK_PID=$!
echo "   PID: $NGROK_PID"

# Wait for ngrok to establish tunnel
NGROK_URL=""
for i in $(seq 1 15); do
  sleep 1
  NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -oP '"public_url":"https://[^"]+' | head -1 | cut -d'"' -f4)
  if [ -n "$NGROK_URL" ]; then
    break
  fi
  echo "   Waiting for ngrok... ($i/15)"
done

if [ -z "$NGROK_URL" ]; then
  echo "   ❌ Failed to start ngrok. Check your authtoken."
  echo "   Run: ngrok config add-authtoken YOUR_TOKEN"
  kill $NGROK_PID 2>/dev/null
  exit 1
fi

echo "   ✓ Tunnel: $NGROK_URL"

# ─── Step 3: Update .env with ngrok URL ──────────
echo ""
echo "📝 Updating .env with ngrok URL..."
if [ -f "$SCRIPT_DIR/.env" ]; then
  sed -i "s|^SERVER_URL=.*|SERVER_URL=$NGROK_URL|" "$SCRIPT_DIR/.env"
  echo "   ✓ SERVER_URL=$NGROK_URL"
else
  echo "   ❌ .env file not found!"
  exit 1
fi

# ─── Step 4: Start Node.js server ────────────────
echo ""
echo "🚀 Starting server..."
cd "$SCRIPT_DIR"
node server.js &
SERVER_PID=$!
sleep 2

# Check if server started successfully
if kill -0 $SERVER_PID 2>/dev/null; then
  echo "   ✓ Server running (PID: $SERVER_PID)"
else
  echo "   ❌ Server failed to start. Check your .env configuration."
  kill $NGROK_PID 2>/dev/null
  exit 1
fi

# ─── Save PIDs for stop script ───────────────────
echo "$NGROK_PID" > "$SCRIPT_DIR/.ngrok.pid"
echo "$SERVER_PID" > "$SCRIPT_DIR/.server.pid"

# ─── Done ────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   🎣 Phishing Simulation — RUNNING               ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                  ║"
echo "║   🌐 Public URL:  $NGROK_URL"
echo "║   📊 Dashboard:   $NGROK_URL/dashboard"
echo "║   🚀 Send:        $NGROK_URL/send-campaign"
echo "║   🖥️  Local:       http://localhost:$PORT/dashboard"
echo "║                                                  ║"
echo "║   To stop:  ./stop.sh                            ║"
echo "║                                                  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Keep script alive — show server logs
wait $SERVER_PID

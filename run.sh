#!/usr/bin/env bash
# ================================================================
# Banana Brain Quest & Banana Surfers – Unified Startup Script
# ================================================================

set -e

PORT="${PORT:-3000}"

echo "🍌 Preparing Banana Brain Quest & Surfers Runner..."

# Kill any process already using the port
echo "🔍 Checking for existing processes on port $PORT..."

# 1. Try fuser (Linux / WSL)
if command -v fuser >/dev/null 2>&1; then
  fuser -k -n tcp "$PORT" >/dev/null 2>&1 || true
fi

# 2. Try lsof (macOS / Linux / Unix)
if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "🛑 Terminating process(es) on port $PORT (PIDs: $PIDS)..."
    kill -9 $PIDS 2>/dev/null || true
    sleep 1
  fi
fi

# 3. Windows PowerShell / Taskkill fallback (Git Bash on Windows)
if command -v powershell.exe >/dev/null 2>&1; then
  powershell.exe -NoProfile -Command "
    \$conn = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue
    if (\$conn) {
      \$pids = \$conn | Select-Object -ExpandProperty OwningProcess -Unique
      foreach (\$procId in \$pids) {
        if (\$procId -gt 0) {
          Write-Host '🛑 Terminating process PID' \$procId 'on port $PORT...'
          Stop-Process -Id \$procId -Force -ErrorAction SilentlyContinue
        }
      }
    }
  " 2>/dev/null || true
elif command -v netstat >/dev/null 2>&1; then
  WIN_PIDS=$(netstat -ano 2>/dev/null | grep ":$PORT " | awk '{print $NF}' | sort -u || true)
  for wpid in $WIN_PIDS; do
    if [ "$wpid" != "0" ] && [ -n "$wpid" ]; then
      taskkill //F //PID "$wpid" 2>/dev/null || true
    fi
  done
fi

sleep 1

# Navigate to app directory if executed from project root
if [ -d "banana-brain-ques" ]; then
  cd "banana-brain-ques"
fi

# Verify dependencies
if [ ! -d "node_modules" ]; then
  echo "📦 Installing project dependencies..."
  npm install
fi

echo "=========================================================="
echo "🚀 Banana Brain Quest & 3D Surfers Server Starting..."
echo "=========================================================="
echo "   ▶ 3D Banana Surfers:   http://localhost:$PORT/runner"
echo "   ▶ Brain Quest Arena:   http://localhost:$PORT/"
echo "   ▶ Player Dashboard:    http://localhost:$PORT/dashboard"
echo "   ▶ Leaderboard:         http://localhost:$PORT/leaderboard"
echo "=========================================================="
echo ""

exec npm start

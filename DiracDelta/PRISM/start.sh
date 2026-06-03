#!/usr/bin/env bash
set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ── Load .env.local BEFORE setting port defaults ──────────────────────────────
# Splits only on the first '=' so values containing '=' (API keys, URLs) are safe.
load_env_file() {
  local file="${1:-.env.local}"
  [ -f "$file" ] || return 0
  echo -e "${BLUE}Loading ${file}${NC}"
  while IFS= read -r line; do
    # skip blank lines
    [[ -z "${line// }" ]] && continue
    # skip comment lines (strip leading whitespace before checking)
    local stripped="${line#"${line%%[! ]*}"}"
    [[ "$stripped" == \#* ]] && continue
    local key="${line%%=*}"
    local value="${line#*=}"
    # strip surrounding single or double quotes from value
    if [[ "$value" == \'*\' ]]; then value="${value:1:${#value}-2}"; fi
    if [[ "$value" == \"*\" ]]; then value="${value:1:${#value}-2}"; fi
    # only export valid shell identifiers
    [[ "$key" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]] || continue
    export "$key=$value"
  done < "$file"
}

load_env_file .env.local

# ── Port config — read from env or fall back to defaults ─────────────────────
FRONTEND_PORT="${FRONTEND_PORT:-3009}"
BACKEND_PORT="${BACKEND_PORT:-8009}"
FRONTEND_URL="http://localhost:${FRONTEND_PORT}"
BACKEND_URL="http://localhost:${BACKEND_PORT}"
BACKEND_PID=""
FRONTEND_PID=""

# ── Help ──────────────────────────────────────────────────────────────────────
show_help() {
  cat <<EOF
${BLUE}PRISM Services Manager${NC}

${BLUE}Usage:${NC}
  ./start.sh [COMMAND]

${BLUE}Commands:${NC}
  start       Start PRISM services (default, kills existing processes first)
  stop        Stop PRISM services
  restart     Restart PRISM services
  status      Show status of PRISM services
  kill-all    Force kill all processes on ports ${BACKEND_PORT} and ${FRONTEND_PORT}
  help        Show this help message

${BLUE}Ports (from .env.local):${NC}
  Frontend    ${FRONTEND_PORT}  →  ${FRONTEND_URL}
  Backend     ${BACKEND_PORT}  →  ${BACKEND_URL}

${BLUE}Examples:${NC}
  ./start.sh           # Start services
  ./start.sh start     # Start services
  ./start.sh restart   # Restart services
  ./start.sh status    # Check service status
  ./start.sh stop      # Stop services
  ./start.sh kill-all  # Force kill all processes

EOF
}

# ── Kill processes on a specific port ─────────────────────────────────────────
kill_port() {
  local port=$1
  local max_retries=5
  local retry=0

  while [ $retry -lt $max_retries ]; do
    if command -v ss &>/dev/null; then
      local pids
      pids=$(ss -tlnp 2>/dev/null | grep ":$port " | grep -oE 'pid=[0-9]+' | cut -d= -f2) || true
      if [ -n "$pids" ]; then
        echo "$pids" | while read -r pid; do
          kill -9 "$pid" 2>/dev/null || true
        done
      fi
    fi

    if command -v fuser &>/dev/null; then
      fuser -k "$port"/tcp 2>/dev/null || true
    fi

    if ! timeout 1 bash -c "echo > /dev/tcp/localhost/$port" 2>/dev/null; then
      return 0
    fi

    retry=$((retry + 1))
    [ $retry -lt $max_retries ] && sleep 1
  done

  sleep 1
}

# ── Wait for a port to become free ───────────────────────────────────────────
wait_port_available() {
  local port=$1
  local timeout=10
  local elapsed=0

  while [ $elapsed -lt $timeout ]; do
    if ! timeout 1 bash -c "echo > /dev/tcp/localhost/$port" 2>/dev/null; then
      return 0
    fi
    sleep 0.5
    elapsed=$((elapsed + 1))
  done

  return 1
}

# ── Kill both ports ───────────────────────────────────────────────────────────
kill_all() {
  echo -e "${YELLOW}Killing existing processes on ports ${BACKEND_PORT} and ${FRONTEND_PORT}...${NC}"
  kill_port "$BACKEND_PORT"
  kill_port "$FRONTEND_PORT"

  wait_port_available "$BACKEND_PORT"  || echo -e "${YELLOW}⚠ Port ${BACKEND_PORT} still in use${NC}"
  wait_port_available "$FRONTEND_PORT" || echo -e "${YELLOW}⚠ Port ${FRONTEND_PORT} still in use${NC}"

  echo -e "${GREEN}✓ Ports cleared${NC}"
}

# ── Status check ──────────────────────────────────────────────────────────────
check_status() {
  local backend_running=false
  local frontend_running=false

  timeout 2 bash -c "echo > /dev/tcp/localhost/${BACKEND_PORT}"  2>/dev/null && backend_running=true  || true
  timeout 2 bash -c "echo > /dev/tcp/localhost/${FRONTEND_PORT}" 2>/dev/null && frontend_running=true || true

  echo -e "${BLUE}PRISM Services Status:${NC}"
  if [ "$backend_running" = true ]; then
    echo -e "  ${GREEN}✓ Backend${NC}   running  →  ${BACKEND_URL}/health"
  else
    echo -e "  ${RED}✗ Backend${NC}   not running (port ${BACKEND_PORT})"
  fi
  if [ "$frontend_running" = true ]; then
    echo -e "  ${GREEN}✓ Frontend${NC}  running  →  ${FRONTEND_URL}"
  else
    echo -e "  ${RED}✗ Frontend${NC}  not running (port ${FRONTEND_PORT})"
  fi
}

# ── Stop ──────────────────────────────────────────────────────────────────────
stop_services() {
  echo -e "${YELLOW}Shutting down services...${NC}"
  kill_all
  echo -e "${GREEN}Services stopped${NC}"
}

# ── Cleanup on Ctrl-C / TERM ──────────────────────────────────────────────────
cleanup() {
  echo -e "\n${YELLOW}Shutting down services...${NC}"
  if [ -n "$BACKEND_PID" ]  && kill -0 "$BACKEND_PID"  2>/dev/null; then kill "$BACKEND_PID"  2>/dev/null || true; fi
  if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then kill "$FRONTEND_PID" 2>/dev/null || true; fi
  echo -e "${GREEN}Services stopped${NC}"
  exit 0
}

# ── Start ─────────────────────────────────────────────────────────────────────
start_services() {
  kill_all
  trap cleanup INT TERM

  # Verify repo layout
  if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}Error: backend or frontend directory not found${NC}"
    exit 1
  fi

  # Install dependencies if missing
  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
  fi

  # Fix CRLF on the next binary (common on Linux clones from Windows)
  if [ -f "node_modules/.bin/next" ]; then
    sed -i 's/\r$//' node_modules/.bin/next 2>/dev/null || true
  fi

  # ── Backend ────────────────────────────────────────────────────────────────
  echo -e "${BLUE}Starting backend on ${BACKEND_URL}${NC}"
  export BACKEND_PORT
  node backend/server.js > /tmp/prism-backend-${BACKEND_PORT}.log 2>&1 &
  BACKEND_PID=$!
  echo -e "${GREEN}Backend started (PID: $BACKEND_PID)${NC}"

  sleep 2

  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo -e "${RED}Backend failed to start. Log:${NC}"
    cat /tmp/prism-backend-${BACKEND_PORT}.log
    exit 1
  fi

  if timeout 3 bash -c "echo > /dev/tcp/localhost/${BACKEND_PORT}" 2>/dev/null; then
    echo -e "${GREEN}✓ Backend listening on port ${BACKEND_PORT}${NC}"
  else
    echo -e "${RED}Backend failed to bind to port ${BACKEND_PORT}. Log:${NC}"
    cat /tmp/prism-backend-${BACKEND_PORT}.log
    kill "$BACKEND_PID" 2>/dev/null || true
    exit 1
  fi

  # ── Frontend ───────────────────────────────────────────────────────────────
  echo -e "${BLUE}Starting frontend on ${FRONTEND_URL}${NC}"
  export PORT=$FRONTEND_PORT

  sleep 2
  if ! wait_port_available "$FRONTEND_PORT"; then
    echo -e "${RED}Port ${FRONTEND_PORT} still in use, forcing cleanup...${NC}"
    kill_port "$FRONTEND_PORT"
    sleep 2
  fi

  bash ./node_modules/.bin/next dev ./frontend -p "$FRONTEND_PORT" \
    > /tmp/prism-frontend-${FRONTEND_PORT}.log 2>&1 &
  FRONTEND_PID=$!
  echo -e "${GREEN}Frontend started (PID: $FRONTEND_PID)${NC}"

  sleep 8

  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo -e "${RED}Frontend failed to start. Log:${NC}"
    cat /tmp/prism-frontend-${FRONTEND_PORT}.log
    kill "$BACKEND_PID" 2>/dev/null || true
    exit 1
  fi

  if timeout 3 bash -c "echo > /dev/tcp/localhost/${FRONTEND_PORT}" 2>/dev/null; then
    echo -e "${GREEN}✓ Frontend listening on port ${FRONTEND_PORT}${NC}"
  else
    echo -e "${YELLOW}⚠ Frontend may still be compiling — check ${FRONTEND_URL} in a moment${NC}"
  fi

  echo ""
  echo -e "${GREEN}════════════════════════════════════════${NC}"
  echo -e "${GREEN}✓ PRISM Services Started Successfully${NC}"
  echo -e "${GREEN}════════════════════════════════════════${NC}"
  echo ""
  echo -e "  ${BLUE}Frontend:${NC}  ${FRONTEND_URL}"
  echo -e "  ${BLUE}Backend:${NC}   ${BACKEND_URL}/health"
  echo ""
  echo -e "  Logs:  /tmp/prism-frontend-${FRONTEND_PORT}.log"
  echo -e "         /tmp/prism-backend-${BACKEND_PORT}.log"
  echo ""
  echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
  echo ""

  wait
}

# ── Main ──────────────────────────────────────────────────────────────────────
COMMAND="${1:-start}"

case "$COMMAND" in
  start)    start_services ;;
  stop)     stop_services ;;
  restart)  stop_services; echo ""; start_services ;;
  status)   check_status ;;
  kill-all) kill_all ;;
  help|--help|-h) show_help ;;
  *)
    echo -e "${RED}Unknown command: $COMMAND${NC}"
    echo ""
    show_help
    exit 1
    ;;
esac

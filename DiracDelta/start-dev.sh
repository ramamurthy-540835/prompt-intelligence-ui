#!/bin/bash
#
# PRISM Prompt Intelligence - Development Startup Script
# Starts the Next.js frontend + provides easy access to the Python backend tools.
#
# Usage:
#   ./start-dev.sh
#

set -e

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
UI_DIR="$ROOT_DIR/prompt-intelligence-ui"
SENTINEL_DIR="$ROOT_DIR/sentinel"

echo "=================================================="
echo "🚀 PRISM Prompt Intelligence - Dev Environment"
echo "=================================================="
echo ""

# Check if Next.js UI exists
if [ ! -d "$UI_DIR" ]; then
    echo "❌ Next.js UI not found at $UI_DIR"
    echo "Please run the setup first."
    exit 1
fi

# ADC (Application Default Credentials) Validation
ADC_FILE="$HOME/.config/gcloud/application_default_credentials.json"
echo ""
echo "🔐 Validating GCP Application Default Credentials (ADC)..."

ADC_STATUS="missing"
if [ -f "$ADC_FILE" ]; then
    echo "   ✅ ADC file found → Dashboard will attempt live BigQuery queries"
    echo "      ($ADC_FILE)"
    ADC_STATUS="present"
else
    echo "   ⚠️  ADC NOT FOUND — Dashboard will run in fallback mode"
    echo ""
    echo "      To unlock live data from BigQuery (prompt_versions, estimations, events):"
    echo ""
    echo "        gcloud auth application-default login --no-launch-browser"
    echo ""
    echo "      After running the command above, restart with:"
    echo "        ./stop-dev.sh && ./start-dev.sh"
    echo ""
fi

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    if [ ! -z "$UI_PID" ]; then
        kill $UI_PID 2>/dev/null || true
    fi
    echo "Done."
}
trap cleanup EXIT

# Start Next.js frontend
echo "🌐 Starting Next.js frontend..."
cd "$UI_DIR"

# Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Prefer explicit port + all interfaces so the UI is reachable on the LAN IP (e.g. 10.100.x.x)
# This makes "share the experience" trivial for the user.
PREFERRED_PORT=3000
echo "   Using preferred port $PREFERRED_PORT (Next.js will auto-increment if busy)"

# Start Next.js in background (explicit flags for predictable port + network visibility)
npx next dev --port $PREFERRED_PORT --hostname 0.0.0.0 > /tmp/prompt-intelligence-ui.log 2>&1 &
UI_PID=$!

echo "   Frontend starting (PID: $UI_PID)"
echo "   Logs: tail -f /tmp/prompt-intelligence-ui.log"
echo ""

# Give Next.js time to bind (or fail)
sleep 4

# Health check: is the process still alive?
if ! kill -0 $UI_PID 2>/dev/null; then
    echo "❌ ERROR: Next.js process died immediately after launch."
    echo "   Last 40 lines of log:"
    tail -40 /tmp/prompt-intelligence-ui.log
    exit 1
fi

# Extract the real URLs that Next.js actually bound to (handles port 3000->3001 fallback etc.)
LOCAL_URL=$(grep -o 'Local:[[:space:]]*http://[^ ]*' /tmp/prompt-intelligence-ui.log | tail -1 | sed 's/Local:[[:space:]]*//')
NETWORK_URL=$(grep -o 'Network:[[:space:]]*http://[^ ]*' /tmp/prompt-intelligence-ui.log | tail -1 | sed 's/Network:[[:space:]]*//')

echo ""
if [ -n "$LOCAL_URL" ]; then
    echo "✅ Frontend is LIVE"
    echo "   Local:   $LOCAL_URL"
    if [ -n "$NETWORK_URL" ]; then
        echo "   Network: $NETWORK_URL   ← share this URL"
    fi
else
    # Fallback if parsing failed for some reason
    echo "✅ Frontend started (PID $UI_PID)"
    echo "   Check log for the exact URL: tail -f /tmp/prompt-intelligence-ui.log"
fi

# ADC status reminder at the end of the banner
if [ "$ADC_STATUS" != "present" ]; then
    echo ""
    echo "⚠️  Note: GCP ADC is missing. The UI will show live data once you authenticate."
fi
echo ""

echo "=================================================="
echo "🧠 Python Backend Tools (Sentinel)"
echo "=================================================="
echo ""
echo "The Python tools live in: $SENTINEL_DIR"
echo ""
echo "Key commands you can run in another terminal:"
echo ""
echo "  # Run full Requirement Scope Extraction (BQML noise filter + clean scope)"
echo "  cd $SENTINEL_DIR"
echo "  ./scripts/run_requirement_scope_extraction.sh 3381323161097207808"
echo ""
echo "  # Run Scientific AI Development Estimator (Gemini 3.5 Flash only)"
echo "  ./scripts/run_ai_development_estimator.sh 3381323161097207808 ../coder"
echo ""
echo "  # Run the full Sentinel audit with prompt linkage (writes to BQ when --write-bq)"
echo "  ./scripts/run_sentinel_all.sh ../coder --prompt-id 3381323161097207808 --write-bq"
echo ""
echo "=================================================="
echo "📍 Useful Locations"
echo "=================================================="
echo "  Frontend UI:           $UI_DIR"
echo "  Python Tools:          $SENTINEL_DIR"
echo "  Reports for this prompt: $SENTINEL_DIR/reports/3381323161097207808"
echo "  Memory / Session docs: ~/.grok/memory/diracdelta-sentinel/sessions/"
echo ""
echo "Press Ctrl+C to stop the frontend server."
echo "=================================================="

# Wait for the frontend process
wait $UI_PID
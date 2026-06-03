#!/bin/bash
#
# Stop the PRISM Prompt Intelligence dev environment
#

echo "🛑 Stopping PRISM development servers..."

# Kill any Next.js dev servers
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true

# Kill listeners on common Next.js ports (3000-3005 range)
for p in 3000 3001 3002 3003 3004 3005; do
  lsof -ti:"$p" 2>/dev/null | xargs -r kill -9 2>/dev/null || true
done

echo "✅ All development servers stopped."
echo ""
echo "Tip: You can also just press Ctrl+C in the terminal where start-dev.sh is running."
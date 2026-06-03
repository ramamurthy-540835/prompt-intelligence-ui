#!/usr/bin/env bash
# Reusable VM coding agent runner script.
# Accepts any Google Agent Platform / Vertex AI Studio saved prompt ID,
# extracts the prompt from GCP, prepares a local prompt package, and launches Aider.

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <prompt_id>"
  exit 1
fi

PROMPT_ID="$1"

# Resolve script directory to run python script correctly
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Starting Prompt ID Coder Agent ==="
echo "Prompt ID: $PROMPT_ID"

python3 "$PARENT_DIR/agents/prompt_id_coder_agent.py" --prompt-id "$PROMPT_ID" --run-aider
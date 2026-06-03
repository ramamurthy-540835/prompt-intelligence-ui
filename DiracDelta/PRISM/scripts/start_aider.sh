#!/usr/bin/env bash

# Clear standard direct API keys to force native GCP Vertex AI authentication (ADC)
unset GEMINI_API_KEY
unset GOOGLE_API_KEY

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE} 🚀 PRISM Aider Launcher (Multi-Provider Router)   ${NC}"
echo -e "${BLUE}==================================================${NC}"

# 1. Resolve Project Root Directory Dynamically
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"
mkdir -p logs

ENV_FILE=".env.local"
LOG_FILE="logs/aider_session_$(date +%Y%m%d_%H%M%S).log"

# Pre-flight dependency checks
check_dep() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}❌ Missing required dependency CLI: $1${NC}" >&2
    exit 1
  fi
}
check_dep gcloud
check_dep jq
check_dep git

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}❌ $ENV_FILE is missing in project root!${NC}" >&2
  exit 1
fi

if [ ! -f "scripts/models.json" ]; then
  echo -e "${RED}❌ scripts/models.json is missing!${NC}" >&2
  exit 1
fi

# Load local environment parameters
set -a
# shellcheck disable=SC1091
source "$ENV_FILE"
set +a

# Export standard GCP parameters for the Vertex SDK/LiteLLM runtime
export GOOGLE_CLOUD_PROJECT="${GCP_PROJECT_ID:-ctoteam}"
export VERTEXAI_PROJECT="${GCP_PROJECT_ID:-ctoteam}"
export VERTEXAI_LOCATION="${VERTEXAI_LOCATION:-us-central1}"
export GOOGLE_CLOUD_LOCATION="${GOOGLE_CLOUD_LOCATION:-us-central1}"
export GOOGLE_REGION="${GOOGLE_REGION:-us-central1}"

# 2. Quiet Authenticated Context Verification (Bypasses verbose environment warnings)
echo -e "${GREEN}☁️  Verifying GCP Authentication...${NC}"
gcloud config set project "${GOOGLE_CLOUD_PROJECT}" --quiet >/dev/null 2>&1 || true

if ! gcloud auth application-default print-access-token >/dev/null 2>&1; then
  echo -e "${RED}❌ ADC (Application Default Credentials) missing!${NC}" >&2
  echo -e "Run: ${BLUE}gcloud auth application-default login${NC}" >&2
  exit 1
fi

# 3. Virtualenv Auto-Activation
if [ -z "${VIRTUAL_ENV:-}" ]; then
  if [ -d ".venv-vllm" ]; then
    echo -e "${GREEN}📦 Activating active virtualenv (.venv-vllm)...${NC}"
    # shellcheck disable=SC1091
    source .venv-vllm/bin/activate
  elif [ -d ".venv" ]; then
    echo -e "${GREEN}📦 Activating active virtualenv (.venv)...${NC}"
    # shellcheck disable=SC1091
    source .venv/bin/activate
  fi
fi

# Verify Aider is installed inside active context
if ! command -v aider &> /dev/null; then
  echo -e "${RED}❌ Aider is not installed in the active Python environment.${NC}" >&2
  echo -e "Run: ${BLUE}pip install aider-chat${NC}" >&2
  exit 1
fi

# 4. Model Selection & Routing
MODEL_KEY="${1:-grok-fast}"
MODEL_NAME=$(jq -r ".models.\"$MODEL_KEY\".api_model_id" scripts/models.json)
IS_SUPPORTED=$(jq -r ".models.\"$MODEL_KEY\".aider_supported" scripts/models.json)

if [ "$MODEL_NAME" = "null" ] || [ -z "$MODEL_NAME" ]; then
  echo -e "${RED}❌ Unknown model key: $MODEL_KEY${NC}" >&2
  echo -e "Available keys: $(jq -r '.models | keys | join(", ")' scripts/models.json)" >&2
  exit 1
fi

if [ "$IS_SUPPORTED" != "true" ]; then
  echo -e "${RED}❌ Model $MODEL_KEY is not supported directly with Aider.${NC}" >&2
  echo -e "Use a supported model (e.g. grok-fast, claude-sonnet, gemini-flash)" >&2
  exit 1
fi

DISPLAY_NAME=$(jq -r ".models.\"$MODEL_KEY\".display_name" scripts/models.json)
COST_PER_MTOK=$(jq -r ".models.\"$MODEL_KEY\".cost_per_mtok" scripts/models.json)
echo -e "${GREEN}💎 Starting Aider | Model: $DISPLAY_NAME ($MODEL_NAME)${NC}"
echo -e "${GREEN}💰 Cost: \$$COST_PER_MTOK per 1M tokens${NC}"

# 5. Handle Prompt File or Phase Execution Routing
AIDER_EXTRA_ARGS=()
PROMPT_ARG="${2:-}"

if [ -n "$PROMPT_ARG" ]; then
  if [[ "$PROMPT_ARG" =~ ^phase-[0-9]+$ || "$PROMPT_ARG" =~ ^[0-9]+$ ]]; then
    # Route directly through python prompt execution wrapper
    echo -e "${GREEN}Routing phase execution through python prompt manager...${NC}"
    python3 scripts/run_prompt.py "$PROMPT_ARG"
    exit 0
  elif [ -f "$PROMPT_ARG" ]; then
    echo -e "${GREEN}Using prompt instructions file: $PROMPT_ARG${NC}"
    AIDER_EXTRA_ARGS+=("--message-file" "$PROMPT_ARG")
  else
    echo -e "${RED}Warning: Prompt file or phase '$PROMPT_ARG' not found. Launching standard chat...${NC}"
  fi
fi

# Ensure workspace is git-clean and .aiderignore exists
if [ ! -f ".aiderignore" ]; then
  cat > .aiderignore << EOF
.venv*
.terraform*
.git
__pycache__
*.pyc
logs/
.backend_start.log
node_modules/
.next/
EOF
fi

echo -e "Session Log: $LOG_FILE"
echo -e "${BLUE}--------------------------------------------------${NC}"

# Launch Aider
aider \
  --model "$MODEL_NAME" \
  --edit-format diff \
  --map-tokens 1024 \
  --no-auto-lint \
  --no-auto-test \
  --no-show-model-warnings \
  --no-check-model-accepts-settings \
  --stream \
  --yes \
  "${AIDER_EXTRA_ARGS[@]}" \
  2>&1 | tee "$LOG_FILE"

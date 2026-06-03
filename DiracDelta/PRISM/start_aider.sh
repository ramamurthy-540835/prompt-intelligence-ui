#!/bin/bash
unset GEMINI_API_KEY
unset GOOGLE_API_KEY

export GOOGLE_CLOUD_PROJECT="${GCP_PROJECT_ID:-ctoteam}"
export VERTEXAI_PROJECT="${GCP_PROJECT_ID:-ctoteam}"
export VERTEXAI_LOCATION="${VERTEXAI_LOCATION:-global}"
export GOOGLE_CLOUD_LOCATION="${GOOGLE_CLOUD_LOCATION:-global}"
export GOOGLE_REGION="${GOOGLE_REGION:-global}"

set -euo pipefail

# =============================================
# PRISM Aider Launcher - Dynamic Model Router
# =============================================
# Usage:
#   ./scripts/start_aider.sh [model_key] [prompt_file_or_phase]
#
# Examples:
#   ./scripts/start_aider.sh gemini-flash
#   ./scripts/start_aider.sh gemini-flash phase-6
#   ./scripts/start_aider.sh gemini-flash prompts/cicd.py

ENV_FILE=".env.local"
PROJECT_DIR="/home/appadmin/projects/Ram_Projects/DiracDelta/ekf"
LOG_FILE="logs/aider_session_$(date +%Y%m%d_%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE} 🚀 PRISM AIDER LAUNCHER (Dynamic Router)${NC}"
echo -e "${BLUE}=========================================${NC}"

cd "$PROJECT_DIR"
mkdir -p logs

# Pre-flight checks
check_dep() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}❌ Missing dependency: $1${NC}"
    exit 1
  fi
}
check_dep gcloud
check_dep bq
check_dep git
check_dep jq

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}❌ $ENV_FILE missing!${NC}"
  exit 1
fi

if [ ! -f "models.json" ]; then
  echo -e "${RED}❌ models.json missing!${NC}"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

# Authentication
echo -e "${GREEN}☁️  Authenticating...${NC}"
gcloud config set project "${GCP_PROJECT_ID:-ctoteam}" >/dev/null
if ! gcloud auth application-default print-access-token >/dev/null 2>&1; then
  echo -e "${RED}❌ ADC missing. Run: gcloud auth application-default login${NC}"
  exit 1
fi

# Workspace checks
if [ ! -d ".git" ]; then
  echo -e "${RED}❌ Not a git repository.${NC}"
  exit 1
fi

if [ ! -f ".aiderignore" ]; then
  echo -e "Creating .aiderignore..."
  cat > .aiderignore << EOF
.venv*
.terraform*
.git
__pycache__
*.pyc
logs/
EOF
fi

# Model selection
MODEL_KEY="${1:-gemini-flash}"
MODEL_NAME=$(jq -r ".models.\"$MODEL_KEY\".api_model_id" models.json)
IS_SUPPORTED=$(jq -r ".models.\"$MODEL_KEY\".aider_supported" models.json)

if [ "$MODEL_NAME" = "null" ] || [ -z "$MODEL_NAME" ]; then
  echo -e "${RED}❌ Unknown model key: $MODEL_KEY${NC}"
  echo -e "Available: $(jq -r '.models | keys | join(", ")' models.json)"
  exit 1
fi

if [ "$IS_SUPPORTED" != "true" ]; then
  echo -e "${RED}❌ Model $MODEL_KEY is not supported with Aider.${NC}"
  echo -e "Use a model with aider_supported=true (e.g. gemini-flash)"
  exit 1
fi

DISPLAY_NAME=$(jq -r ".models.\"$MODEL_KEY\".display_name" models.json)
echo -e "${GREEN}💎 Starting Aider | Model: $DISPLAY_NAME ($MODEL_NAME)${NC}"

# Handle prompt file or phase argument
AIDER_EXTRA_ARGS=()
PROMPT_ARG="${2:-}"

if [ -n "$PROMPT_ARG" ]; then
  if [[ "$PROMPT_ARG" =~ ^phase-[0-9]+$ || "$PROMPT_ARG" =~ ^[0-9]+$ ]]; then
    # Resolve phase path or python run_prompt handler
    echo -e "${GREEN}Phase detected: $PROMPT_ARG. Routing through python prompt execution wrapper...${NC}"
    python3 scripts/run_prompt.py "$PROMPT_ARG"
    exit 0
  elif [ -f "$PROMPT_ARG" ]; then
    echo -e "${GREEN}Using prompt file: $PROMPT_ARG${NC}"
    AIDER_EXTRA_ARGS+=("--message-file" "$PROMPT_ARG")
  else
    echo -e "${RED}Warning: Prompt file or phase '$PROMPT_ARG' not found. Launching standard chat...${NC}"
  fi
fi

echo -e "Logging to: $LOG_FILE"

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

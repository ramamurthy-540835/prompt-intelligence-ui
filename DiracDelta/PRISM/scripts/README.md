# PRISM Scripts Folder

## Purpose

This folder contains utility scripts, configuration files, and tooling for the **PRISM Unified AI Agent Engineering Framework**. Scripts support three key workflows:

1. **AI-Assisted Development** — Using Aider with dynamic model routing
2. **Governance Operations** — Cost tracking, token budgeting, OSSA policy enforcement
3. **Deployment & Testing** — Validation, health checks, CI/CD hooks

---

## Current Structure

```
scripts/
├── README.md          # This file
├── models.json        # Model registry for multi-provider routing
└── (future scripts to be added in Phase 1+)
```

---

## `models.json` — Model Registry

**Purpose**: PRISM's primary model configuration file. Defines all supported LLM models, their providers, costs, and capabilities.

**Used by**:
- `start_aider.sh` — reads this file to determine which model to launch
- `/api/prism/options` — exposes available models to the frontend
- `/api/prism/router` — selects model based on use case, persona, and budget
- Cost estimation pipeline — calculates token spend and warns when approaching limits

**Structure**:

```json
{
  "default_model": "grok-fast",
  "models": {
    "model-key": {
      "display_name": "Human-readable name",
      "api_model_id": "provider/model-name",
      "provider": "xai|vertex|anthropic|openai",
      "region": "global|us-central1|...",
      "use_case": "scenario description",
      "aider_supported": true|false,
      "cost_per_mtok": 2.0,
      "tokens_per_min": 100000,
      "cache_friendly": true|false
    }
  }
}
```

**Key fields**:
- `api_model_id` — The actual model identifier sent to the provider's API
- `provider` — One of: `xai` (X.AI Grok), `vertex` (Google Vertex AI), `anthropic` (Claude), `openai` (GPT)
- `aider_supported` — Whether Aider CLI tool can use this model (true only for reasoning models)
- `cost_per_mtok` — USD per million tokens (used for cost estimation)
- `cache_friendly` — Whether the provider supports prompt caching (reduces effective cost 90% with EKF context reuse)

---

## Scripts in This Folder

### Phase 1 (Developer Foundation) — ✅ NOW AVAILABLE

| Script | Purpose | Status |
|---|---|---|
| **`start_aider.sh`** | ✅ **IMPLEMENTED** — Dynamic project root resolution. Reads `models.json`, routes to selected model, validates GCP auth, handles phases/prompts. Modern, robust implementation. | READY |
| `run_prompt.py` | Execute prompt templates from a phase number or file path. Called by `start_aider.sh` when `phase-N` argument is provided. | TODO (Phase 1b) |
| `check_models.sh` | Validate `models.json` syntax and test connectivity to each provider. | TODO (Phase 1a) |

### Phase 2 (Governance Gateway)

| Script | Purpose |
|---|---|
| `audit_export.py` | Export audit logs from SQLite/BigQuery to CSV for compliance review. |
| `cost_report.sh` | Generate monthly cost report by model, persona, and team. |
| `rotate_credentials.sh` | Safely rotate API keys and service account credentials. |

### Phase 3 (Vendor-Neutral Scale)

| Script | Purpose |
|---|---|
| `compile_context_cache.py` | Pre-compute and cache large prompt contexts for EKF semantic layer + repo trees. |
| `profile_routing.py` | A/B test model routing decisions and measure cost/performance trade-offs. |

---

## ✅ Implementation Status: `start_aider.sh`

**Good news**: `/PRISM/scripts/start_aider.sh` is now **fully implemented** with modern, production-ready code:

### Key Features Included

1. **Dynamic Project Root** (Line 18-19)
   ```bash
   PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
   ```
   Automatically resolves to PRISM root, works from any directory.

2. **reads `scripts/models.json`** (Line 40)
   - Checks for file in correct location: `scripts/models.json`
   - Reads 7 supported models with routing metadata

3. **GCP ADC Authentication** (Line 65-71)
   - Validates `gcloud auth application-default login` is set up
   - Exports correct `GOOGLE_CLOUD_PROJECT`, `VERTEXAI_*` env vars
   - Silent gcloud config (no verbose output)

4. **Virtualenv Auto-Activation** (Line 73-84)
   - Auto-activates `.venv-vllm` or `.venv` if available
   - Verifies Aider is installed before launching

5. **Cost Display** (Line 98-99)
   - Shows cost per 1M tokens for selected model
   - Helps developers choose cost-effectively

6. **Phase & Prompt Support** (Line 113-124)
   - Routes `phase-N` arguments through `scripts/run_prompt.py`
   - Supports prompt files: `./start_aider.sh grok-fast prompts/refactor.md`

### Migration Note

**Old version** at `/PRISM/start_aider.sh` (root) still points to EKF — **deprecated**. Use the new one:

```bash
# ✓ CORRECT (new implementation)
./scripts/start_aider.sh grok-fast

# ✗ DEPRECATED (old root version, points to EKF)
./start_aider.sh grok-fast
```

After Phase 1 is complete, the root version can be replaced with a symlink:
```bash
ln -sf scripts/start_aider.sh ./start_aider.sh
```

Or just documented to developers as using the scripts/ version.

---

## Usage: How Developers Will Use These Scripts

### Scenario 1: AI-Assisted Coding with Model Choice
```bash
cd /home/appadmin/projects/Ram_Projects/DiracDelta/PRISM

# Start Aider with default model (grok-fast, cheapest)
./scripts/start_aider.sh

# Start Aider with Claude Sonnet for code generation
./scripts/start_aider.sh claude-sonnet

# Start Aider with Gemini Flash for large repo refactor
./scripts/start_aider.sh gemini-flash

# Start Aider with a specific prompt template
./scripts/start_aider.sh grok-fast prompts/refactor-api.md

# Start Aider with a phase number (Phase 1b feature)
./scripts/start_aider.sh claude-sonnet phase-1
```

### Scenario 2: Governance & Cost Tracking
```bash
# Check models connectivity (Phase 1)
./scripts/check_models.sh

# Generate cost report for May 2026 (Phase 2)
./scripts/cost_report.sh --month=2026-05 --output=csv

# Rotate API keys safely (Phase 2)
./scripts/rotate_credentials.sh
```

### Scenario 3: Pre-Cache Large Contexts
```bash
# Prepare cached context for repo refactoring (Phase 3)
./scripts/compile_context_cache.py \
  --include-repo-tree \
  --include-ekf-schema \
  --output-cache=/tmp/prism-context.cache

./scripts/start_aider.sh claude-sonnet --context-cache=/tmp/prism-context.cache
```

---

## Implementation Notes for Phase 1

### Git Workflow
- Once `scripts/start_aider.sh` is fixed, developers can use Aider for collaborative coding on PRISM itself
- Recommended: Add git hooks to validate commits (see `GIT_WORKFLOW.md`)

### Environment Setup
- Ensure `.env.local` has valid API keys for at least one provider (xAI, Vertex, Anthropic, or OpenAI)
- Run `gcloud auth application-default login` if using Vertex AI
- Test with `./scripts/check_models.sh` before running `start_aider.sh`

### Security
- Do not commit API keys to git (all keys should be in `.env.local`)
- Rotate service account keys regularly (Phase 2 script)
- Never commit plaintext credentials to `/secretes/` folder (see `SCOPE.md` Phase 0)

---

## Related Documentation

- **`SCOPE.md`** — Phase-by-phase implementation roadmap
- **`GOVERNANCE.md`** — AI governance architecture for leadership review
- **`GIT_WORKFLOW.md`** — Git branch strategy, GCP ADC auth, git hooks setup
- **`backend/lib/models.ts`** — Runtime model dispatch logic (called by `/api/prism/router`)
- **`ossa/backend/ossa/executor.py`** — OSSA agent execution pipeline

# PRISM Git Workflow & Developer Onboarding

**Audience**: PRISM developers, Aider users, DevOps  
**Status**: Proposal (Phase 1 implementation needed)

---

## Quick Start

### For First-Time Setup

```bash
# 1. Clone PRISM repository
git clone <PRISM_REPO_URL> prism-repo
cd prism-repo

# 2. Load environment (local dev mode)
source .env.local

# 3. Verify GCP authentication
gcloud auth application-default login
gcloud config set project ctoteam
gcloud auth application-default print-access-token

# 4. Verify AI provider connectivity (Phase 1 script)
./scripts/check_models.sh

# 5. Start development
npm install
npm run dev    # frontend on port 3009
npm run backend:start  # backend on port 8009
```

### For AI-Assisted Coding with Aider

```bash
# Start Aider with your preferred model
./start_aider.sh grok-fast         # Fastest, cheapest (default)
./start_aider.sh claude-sonnet     # Best for code generation
./start_aider.sh gemini-flash      # Best for large refactors
./start_aider.sh claude-opus       # Best for architecture decisions

# Run with a specific prompt file
./start_aider.sh claude-sonnet prompts/refactor-api.md

# Run with a phase (Phase 1 feature)
./start_aider.sh grok-fast phase-1
```

---

## Git Branch Strategy

We follow a variant of **trunk-based development** with short-lived feature branches.

### Branch Naming Convention

```
feature/           Feature development (e.g., feature/governance-gateway)
bugfix/            Bug fixes (e.g., bugfix/ossa-local-mode-bypass)
refactor/          Code refactoring (e.g., refactor/routing-engine)
docs/              Documentation only (e.g., docs/governance-arch)
chore/             Dependency updates, tooling (e.g., chore/upgrade-next-14.3)
hotfix/            Production critical fixes (e.g., hotfix/auth-bypass)
```

### Branch Lifecycle

```
Step 1: Create feature branch
  git checkout -b feature/my-feature

Step 2: Make small, focused commits
  git add backend/lib/routing.ts
  git commit -m "feat(routing): add multi-provider fallback logic"
  # NOT: git commit -m "update stuff"

Step 3: Push and open PR (GitHub)
  git push -u origin feature/my-feature
  gh pr create --title "feat(routing): add multi-provider fallback" \
               --body "Fixes #123. Adds fallback routing when primary model is rate-limited."

Step 4: CI/CD runs automatically
  - Linter (eslint, prettier)
  - Tests (jest for backend, vitest for frontend)
  - Security scan (no plaintext secrets)
  - Build check (next build)

Step 5: Code review & merge
  gh pr review --approve    # or request changes
  gh pr merge               # Squash or rebase to main

Step 6: Delete branch
  git branch -d feature/my-feature
  git push origin --delete feature/my-feature
```

### Commit Message Convention

We use **Conventional Commits** (enforced by pre-commit hook in Phase 1).

```
type(scope): subject

body (optional)

footer (optional)
```

**Types**: `feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `chore`

**Scopes**: `routing` | `ossa` | `governance` | `models` | `auth` | `audit` | `cache` | `cli`

**Examples**:
```
feat(routing): add claude-sonnet as preferred code-generation model
fix(ossa): enforce stop decision in local-mode ossaGuard()
docs(scope): add Phase 0–3 implementation roadmap
refactor(models): consolidate provider dispatch into single callModel() function
chore(deps): upgrade @anthropic-ai/sdk from 0.95.1 to 0.96.0
```

---

## Git Hooks (Phase 1 Setup)

Git hooks are NOT currently active. Phase 1 will install them.

### Planned Hooks

#### `pre-commit` — Prevent problematic commits

```bash
#!/bin/bash
# Prevent commits with:
# - Plaintext API keys (X-API-KEY, GEMINI_API_KEY, etc.)
# - Large binary files (>50MB)
# - Unformatted code (fails prettier check)
# - Failing tests

echo "Running pre-commit checks..."
npm run lint --staged    # Run eslint on staged files
npm run format --staged  # Auto-fix with prettier
npm run test --staged    # Run tests for changed files

# Scan for secrets
if git diff --cached | grep -i "api[_-]key\|secret\|password" | grep -v "\.env\.local"; then
  echo "❌ BLOCKED: Commit contains potential secrets"
  exit 1
fi

echo "✓ Pre-commit checks passed"
exit 0
```

#### `commit-msg` — Enforce conventional commits

```bash
#!/bin/bash
# Enforce: type(scope): subject [fixes #123]

MSG=$(cat $1)

if ! echo "$MSG" | grep -qE "^(feat|fix|docs|style|refactor|perf|test|chore)(\(.+\))?: .{1,72}"; then
  echo "❌ BLOCKED: Commit message doesn't follow Conventional Commits"
  echo "Required: type(scope): subject"
  echo "Example:  feat(routing): add claude-sonnet for code generation"
  exit 1
fi

exit 0
```

#### `pre-push` — Validate before push

```bash
#!/bin/bash
# Prevent pushes with:
# - Uncommitted changes
# - Failing tests
# - Not on a feature branch (protect main)

BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$BRANCH" = "main" ]; then
  echo "❌ BLOCKED: Cannot push directly to main"
  echo "Create a feature branch and open a PR instead"
  exit 1
fi

echo "Running pre-push tests..."
npm run test

exit $?
```

### Installation Instructions (Phase 1)

```bash
cd PRISM

# Copy hook scripts
mkdir -p .git/hooks
cp scripts/hooks/pre-commit.sh .git/hooks/pre-commit
cp scripts/hooks/commit-msg.sh .git/hooks/commit-msg
cp scripts/hooks/pre-push.sh .git/hooks/pre-push

# Make executable
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/commit-msg
chmod +x .git/hooks/pre-push

# Test hooks
echo "Testing hooks setup..."
git commit --allow-empty -m "bad message"  # Should fail
git commit --allow-empty -m "feat: good message"  # Should pass
```

---

## GitHub Workflow (CI/CD)

### Automated Checks on Every PR

When you push to a feature branch:

1. **GitHub Actions** trigger automatically (`.github/workflows/test.yml`)
2. Run linter, tests, security scan, build
3. Results appear in PR checks section
4. Cannot merge if any check fails (required status check)

### Example Check Output

```
Checks (Phase 1 implementation):

✓ Lint (eslint + prettier)
  - backend/lib/routing.ts: 2 warnings (unused var)
  - frontend/components/ModelSelector.tsx: 0 issues
  
✓ Unit Tests (jest)
  - backend/lib/routing.test.ts: 12 pass, 0 fail
  - frontend/components/ModelSelector.test.tsx: 8 pass, 0 fail
  
✓ Integration Tests
  - /api/prism/router: OK
  - /api/prism/execute: OK
  
✓ Build Check (next build)
  - Compiled successfully
  
✓ Security Scan (snyk)
  - 0 vulnerabilities
  - 0 secrets detected
```

---

## GCP Authentication Flow

### Local Development (Current Setup)

```
Developer → gcloud auth application-default login
            ↓
            Stores credentials in ~/.config/gcloud/application_default_credentials.json
            ↓
            PRISM backend uses credentials for:
              • BigQuery queries (if DISABLE_BIGQUERY=false)
              • Vertex AI (if DISABLE_VERTEX_AI=false)
              • GCS operations
```

**Setup once per machine**:
```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Authenticate
gcloud auth application-default login

# Set default project
gcloud config set project ctoteam

# Verify
gcloud auth application-default print-access-token
```

### Production Deployment (Future, Phase 2+)

```
PRISM Pod → Service Account Key (Secret Manager)
            ↓
            Workload Identity (GKE)
            ↓
            Scoped IAM permissions:
              • bigquery.tables.get
              • bigquery.tables.update
              • artifactregistry.repositories.get
```

---

## Aider + PRISM Workflow

### What is Aider?

**Aider** is an open-source CLI tool that pairs with Claude (or any API LLM) to edit code files in a git repository. It:
- Reads files from your repo
- Sends them as context to an LLM
- Gets back edit suggestions as diffs
- Applies diffs automatically
- Creates clean git commits

### How PRISM's `start_aider.sh` Integrates Aider

1. **Model Selection** — You choose which model to use
   ```bash
   ./start_aider.sh grok-fast  # Uses xAI Grok
   ```

2. **Cost Estimation** — Before starting, shows estimated cost per 1K tokens
   ```
   Estimated cost per 1K tokens: $0.002 (grok-fast)
   Your team's remaining monthly budget: $8,432.50
   ```

3. **Conversation Loop**
   ```
   You:  "Refactor the routing engine to support cost limits per persona"
   Aider → Claude (via PRISM gateway, costs checked)
   Claude:  "I'll refactor routing.ts to add budget enforcement..."
   [Aider applies diffs to routing.ts]
   
   You:  "Also add unit tests"
   Aider → Claude (via PRISM gateway, costs checked)
   Claude: "Here are comprehensive tests for the routing budget logic..."
   [Aider applies diffs to routing.test.ts]
   
   You:  "/commit"
   [Aider creates git commit with clean message]
   ```

4. **Cost Tracking** — After session, shows total cost and usage
   ```
   Session summary:
   - Tokens used: 12,450
   - Cost: $0.025 (with cache reuse)
   - Your team now at: $8,432.25 remaining
   ```

### Workflow Example: Adding a Feature with Aider

```bash
# Start a feature branch
git checkout -b feature/persona-budgets

# Launch Aider with Claude Sonnet (best for coding)
./start_aider.sh claude-sonnet

# Inside Aider:
Aider: /help                          # See available commands
Aider: /add backend/lib/personas.ts   # Add file to context
Aider: /add backend/lib/routing.ts

# Give instructions (natural language)
You: "Add a monthly_token_budget field to the PERSONAS object. 
      Update the routing logic to enforce these budgets. 
      Add unit tests for budget enforcement."

Claude: [generates code changes]
Aider: [applies diffs automatically]

# Review changes
You: /diff          # Show what changed
You: /commit        # Create git commit with message

# Exit Aider
You: /exit

# Push and open PR
git push origin feature/persona-budgets
gh pr create --title "feat(personas): add monthly token budgets" \
             --body "Enforces per-persona token limits with fallback routing"
```

### Cost Optimization with Aider

**DO:**
- Use grok-fast for simple fixes (typos, test updates)
- Use claude-sonnet for new features (best cost/quality balance)
- Provide good context (attach related files with `/add`)
- Reuse previous sessions' context (cached contexts are free)

**DON'T:**
- Use claude-opus for everything (15x more expensive than grok-fast)
- Start new Aider sessions for every small change (reuse context)
- Leave large files in context if not needed (costs accumulate)

---

## Environment Variables

### Required for Development

```bash
# GCP
export GOOGLE_CLOUD_PROJECT=ctoteam
export GCP_PROJECT_ID=ctoteam
export GCP_REGION=us-central1

# BigQuery (dev: can disable)
export BIGQUERY_DATASET=prism
export DISABLE_BIGQUERY=true  # Use local SQLite for dev

# AI Providers (at least one required)
export AI_PROVIDER=xai                          # Current default
export XAI_API_KEY=<your-xai-key>             # Get from settings
export GOOGLE_API_KEY=<for-gemini-if-needed>   # For Vertex AI fallback
export OPENAI_API_KEY=<optional>               # For fallback routing
export ANTHROPIC_API_KEY=<optional>            # For Claude models

# Ports
export FRONTEND_PORT=3009
export BACKEND_PORT=8009

# Local dev
export LOCAL_DEV_MODE=true
export LOCAL_DB_PATH=backend/data/content_studio.db
```

### Verify Environment

```bash
# Check all required vars are set
./scripts/check_models.sh

# Output should show:
# ✓ GOOGLE_CLOUD_PROJECT=ctoteam
# ✓ XAI_API_KEY=... (masked)
# ✓ Grok model connectivity: OK
# ✓ Gemini model connectivity: OK (via gcloud ADC)
# Ready to start development!
```

---

## Troubleshooting

### `start_aider.sh: line 25: /home/.../ekf: No such file or directory`
**Problem**: start_aider.sh still hardcoded to point to EKF  
**Solution**: Upgrade PRISM to the latest version (Phase 1). Or manually edit line 25 to `/home/appadmin/projects/Ram_Projects/DiracDelta/PRISM`.

### `models.json not found`
**Problem**: PRISM doesn't have models.json yet  
**Solution**: Copy from `scripts/models.json` (provided in Phase 1) or run `./scripts/check_models.sh` which will create a default.

### `gcloud auth application-default login: command not found`
**Problem**: gcloud CLI not installed  
**Solution**:
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud auth application-default login
```

### Aider hangs or times out
**Problem**: PRISM gateway is slow or model API is unresponsive  
**Solution**:
```bash
# Check gateway health
curl http://localhost:8009/health

# Check model connectivity
./scripts/check_models.sh

# Try with a different model
./start_aider.sh grok-fast  # Usually fastest
```

### `npm run test` fails
**Problem**: Dependencies not installed or test suite broken  
**Solution**:
```bash
npm install
npm run test -- --verbose   # See what's failing

# If specific test fails, check git status
git status
git diff                     # See recent changes
```

---

## Code Review Checklist (For PR Reviewers)

Before approving a PRISM PR:

- [ ] **Conventional Commits** — Commit messages follow `type(scope): subject`
- [ ] **No Secrets** — No API keys, passwords, or credentials in diff
- [ ] **Governance Impact** — Does this affect auth, audit, budgets, or compliance?
  - [ ] If YES: Documented in PR description (why, what changed, cost impact)
  - [ ] If YES: Includes audit log entry or tracking code
- [ ] **Tests** — New code has tests; existing tests still pass
- [ ] **Documentation** — Updated docs/README if behavior changed
- [ ] **Security** — No SQL injection, XSS, auth bypass, or credential leaks
- [ ] **Performance** — Large context changes won't blow up token usage?

---

## Release Process

Not yet defined (Phase 2+). Will include:
- Release notes
- Changelog update
- Version bump (semantic versioning)
- Tag in git
- Deployment to staging, then production

---

## Related Documentation

- **`SCOPE.md`** — Phase 0–3 roadmap
- **`GOVERNANCE.md`** — Architecture and security model
- **`scripts/README.md`** — Script inventory
- **Backend Code** — `backend/lib/routing.ts`, `backend/lib/ossa.ts`

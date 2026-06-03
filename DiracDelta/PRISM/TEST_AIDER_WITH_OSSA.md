# Testing: start_aider.sh + OSSA Workflow

**Objective**: Test the PRISM Aider integration with OSSA governance and manifest-driven compliance.

---

## Quick Test (5 minutes)

### Test 1: Verify start_aider.sh Setup

```bash
cd /home/appadmin/projects/Ram_Projects/DiracDelta/PRISM

# Check dependencies
echo "=== Checking Dependencies ==="
command -v gcloud && echo "✓ gcloud"
command -v jq && echo "✓ jq"
command -v git && echo "✓ git"

# Verify models.json
echo "=== Checking Model Registry ==="
jq '.models | keys' scripts/models.json | head -10

# Verify GCP auth
echo "=== Checking GCP Authentication ==="
gcloud auth application-default print-access-token > /dev/null 2>&1 && \
  echo "✓ ADC ready" || \
  echo "❌ Run: gcloud auth application-default login"
```

**Expected Output**:
```
✓ gcloud
✓ jq
✓ git
=== Checking Model Registry ===
[
  "claude-opus",
  "claude-sonnet",
  "gemini-flash",
  "gemini-pro",
  "grok-fast",
  "grok-reasoning"
]
=== Checking GCP Authentication ===
✓ ADC ready
```

### Test 2: Validate start_aider.sh Script

```bash
cd /home/appadmin/projects/Ram_Projects/DiracDelta/PRISM

echo "=== Syntax Check ==="
bash -n scripts/start_aider.sh && echo "✓ Script syntax valid"

echo "=== Help / Usage ==="
./scripts/start_aider.sh --help 2>&1 | head -5 || \
  ./scripts/start_aider.sh 2>&1 | head -30
```

**Expected Output**: Script launches Aider, shows model selection, and logs to `logs/aider_session_*.log`

---

## Full Integration Test (30 minutes)

### Step 1: Create a Test OSSA Manifest

```bash
cd /home/appadmin/projects/Ram_Projects/DiracDelta/PRISM

# Create a simple test manifest
cat > ossa/backend/manifests/test-code-developer.ossa.yaml << 'EOF'
apiVersion: ossa/v0.4.6
kind: Agent
metadata:
  name: test-code-developer
  version: 1.0.0
  description: Test PRISM code developer with OSSA governance
  labels:
    owner: test-team
    framework: PRISM

spec:
  role: |
    You are the Test Code Developer Agent.
    
    Your role is to demonstrate OSSA governance in action.
    
    Core responsibilities:
    1. Make small, focused code changes.
    2. Add comments explaining changes.
    3. Include security checks.
    4. Document what changed and why.
    
    Output format:
    1. Summary
    2. Implementation
    3. Security Notes
    4. Test Steps

  llm:
    provider: anthropic
    model: claude-sonnet-4-6
    temperature: 0.2
    maxTokens: 4096

  compliance:
    frameworks:
      - SOC2
    dataClassification: confidential
    retentionPolicy:
      duration: 90d
      autoDelete: true

  cost:
    tokenBudget:
      perExecution: 2000
      daily: 10000
    spendLimits:
      daily: 5.0
      alert_threshold: 0.8

  hitl:
    enabled: false           # No approval needed for test

  trust:
    tier: org-verified
    verificationDate: "2026-05-27"
    verifiedBy: test-team

  observability:
    auditLog:
      enabled: true
      level: detailed
    logging:
      level: INFO
EOF

echo "✓ Test manifest created"
```

### Step 2: Start Aider with Grok (Cheapest Model)

```bash
cd /home/appadmin/projects/Ram_Projects/DiracDelta/PRISM

echo "=== Starting Aider with Grok (Cost-Efficient) ==="
./scripts/start_aider.sh grok-fast

# Inside Aider, try a simple task:
# 1. /add scripts/README.md
# 2. Ask: "Update the first line to say 'PRISM Scripts Folder - Tested on [date]'"
# 3. /commit
# 4. /exit
```

**Expected Behavior**:
- ✓ Script displays: "Model: Grok 4.0 Fast Non-Reasoning (grok-4-fast)"
- ✓ Shows cost: "$2.0 per 1M tokens"
- ✓ Aider starts successfully
- ✓ Session logs to: `logs/aider_session_20260527_*.log`

### Step 3: Try with Claude Sonnet (Better Quality)

```bash
cd /home/appadmin/projects/Ram_Projects/DiracDelta/PRISM

echo "=== Starting Aider with Claude Sonnet (Balanced) ==="
./scripts/start_aider.sh claude-sonnet

# Inside Aider, try a refactoring:
# 1. /add backend/lib/routing.ts
# 2. Ask: "Show me the getRoute() function and explain the budget enforcement logic"
# 3. /exit
```

**Expected Behavior**:
- ✓ Script displays: "Model: Claude 4 Sonnet (claude-sonnet-4-6)"
- ✓ Shows cost: "$3.0 per 1M tokens"
- ✓ Aider starts successfully
- ✓ Better code understanding vs grok-fast

### Step 4: Test with Gemini Flash (Large Context)

```bash
cd /home/appadmin/projects/Ram_Projects/DiracDelta/PRISM

echo "=== Starting Aider with Gemini Flash (Large Context) ==="
./scripts/start_aider.sh gemini-flash

# Inside Aider, try a large refactoring:
# 1. /add backend/lib/models.ts
# 2. /add backend/lib/routing.ts
# 3. Ask: "Explain how the multi-provider routing works end-to-end"
# 4. /exit
```

**Expected Behavior**:
- ✓ Script displays: "Model: Gemini 3.5 Flash (gemini-3.5-flash)"
- ✓ Shows cost: "$0.3 per 1M tokens" (cheapest for large context)
- ✓ Aider handles large file context efficiently

---

## OSSA Integration Test (45 minutes)

### Step 1: Verify OSSA Backend is Running

```bash
# Check if OSSA backend is running
curl http://localhost:8001/api/health 2>/dev/null | jq '.' && \
  echo "✓ OSSA backend is running" || \
  echo "❌ OSSA backend not running. Start with: npm run ossa:start"
```

### Step 2: Register Test Manifest

```bash
cd /home/appadmin/projects/Ram_Projects/DiracDelta/PRISM

# Validate manifest YAML
python3 << 'EOF'
import yaml
with open('ossa/backend/manifests/test-code-developer.ossa.yaml') as f:
    manifest = yaml.safe_load(f)
    print("✓ YAML is valid")
    print(f"Agent name: {manifest['metadata']['name']}")
    print(f"Model: {manifest['spec']['llm']['model']}")
    print(f"Daily budget: ${manifest['spec']['cost']['spendLimits']['daily']}")
EOF

# Register with OSSA
curl -X POST http://localhost:8001/api/manifests/register \
  -H "Content-Type: application/yaml" \
  -d @ossa/backend/manifests/test-code-developer.ossa.yaml \
  | jq '.' && echo "✓ Manifest registered"

# Verify it's registered
curl http://localhost:8001/api/agents | jq '.[] | select(.metadata.name == "test-code-developer")'
```

### Step 3: Execute Agent with Governance

```bash
# Dry run (cost estimation only)
curl -X POST http://localhost:8001/api/agent/estimate \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test-code-developer",
    "input": "Write a simple test function that validates an email address",
    "context": {"user_id": "test@mastech.ai", "repo": "PRISM"}
  }' | jq '{
    estimated_tokens: .estimated_tokens,
    estimated_cost_usd: .estimated_cost_usd,
    budget_remaining: .budget_remaining
  }'

# Expected output:
# {
#   "estimated_tokens": 1250,
#   "estimated_cost_usd": 0.00375,
#   "budget_remaining": 4.99625
# }
```

### Step 4: Actual Execution

```bash
# Execute the agent (applies OSSA rules)
curl -X POST http://localhost:8001/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test-code-developer",
    "input": "Write a simple function to validate email addresses using regex",
    "context": {
      "user_id": "test@mastech.ai",
      "repo": "PRISM",
      "language": "typescript"
    }
  }' | jq '{
    status: .status,
    tokens_used: .tokens_used,
    cost: .cost,
    compliance_check: .compliance_check,
    hitl_required: .hitl_required,
    audit_log_id: .audit_log_id
  }'

# Expected output:
# {
#   "status": "success",
#   "tokens_used": 1250,
#   "cost": 0.00375,
#   "compliance_check": {
#     "frameworks": ["SOC2"],
#     "data_classification": "confidential",
#     "verdict": "PASS"
#   },
#   "hitl_required": false,
#   "audit_log_id": "audit_20260527_123456"
# }
```

### Step 5: Check Audit Log

```bash
# Fetch audit log for this execution
curl "http://localhost:8001/api/audit/logs?agent_id=test-code-developer&limit=1" | \
  jq '.[] | {
    id: .id,
    agent_id: .agent_id,
    user_id: .user_id,
    tokens_used: .tokens_used,
    cost_usd: .cost_usd,
    compliance_verdict: .compliance.verdict,
    timestamp: .timestamp
  }'

# Expected output:
# {
#   "id": "audit_20260527_123456",
#   "agent_id": "test-code-developer",
#   "user_id": "test@mastech.ai",
#   "tokens_used": 1250,
#   "cost_usd": 0.00375,
#   "compliance_verdict": "PASS",
#   "timestamp": "2026-05-27T03:54:32Z"
# }
```

---

## Cost Comparison Test

Test cost efficiency by running the same task with different models:

```bash
#!/bin/bash

TASK="Write a TypeScript function to parse a JSON file and validate its schema"

echo "=== Cost Comparison Test ==="
echo "Task: $TASK"
echo ""

for MODEL in grok-fast claude-sonnet gemini-flash claude-opus; do
  echo "Model: $MODEL"
  
  curl -X POST http://localhost:8001/api/agent/estimate \
    -H "Content-Type: application/json" \
    -d "{
      \"agent_id\": \"test-code-developer\",
      \"input\": \"$TASK\",
      \"model_override\": \"$MODEL\",
      \"context\": {\"user_id\": \"test@mastech.ai\"}
    }" | jq '{
      model: .model,
      tokens: .estimated_tokens,
      cost: .estimated_cost_usd
    }'
  
  echo ""
done

# Expected output (cost comparison):
# Model: grok-fast          → 1500 tokens → $0.003
# Model: claude-sonnet      → 1200 tokens → $0.0036 (better quality, similar cost)
# Model: gemini-flash       → 1800 tokens → $0.00054 (cheapest!)
# Model: claude-opus        → 1000 tokens → $0.015 (best quality, expensive)
```

---

## Troubleshooting

### Issue 1: "aider command not found"

```bash
# Solution: Install aider
pip install aider-chat

# Verify
aider --version
```

### Issue 2: "models.json not found"

```bash
# Solution: Check path
ls -l /home/appadmin/projects/Ram_Projects/DiracDelta/PRISM/scripts/models.json

# Or recreate from documentation
# See: scripts/README.md
```

### Issue 3: "ADC missing" error

```bash
# Solution: Authenticate with GCP
gcloud auth application-default login
gcloud config set project ctoteam
gcloud auth application-default print-access-token
```

### Issue 4: OSSA backend not responding

```bash
# Check if backend is running
ps aux | grep "ossa\|backend"

# Start OSSA (if needed)
cd ossa/backend
python3 main.py

# Or via npm
npm run ossa:start
```

### Issue 5: Manifest won't register

```bash
# Validate YAML syntax
python3 -c "import yaml; yaml.safe_load(open('ossa/backend/manifests/my-manifest.ossa.yaml'))"

# Check required fields
python3 << 'EOF'
import yaml
with open('ossa/backend/manifests/my-manifest.ossa.yaml') as f:
    m = yaml.safe_load(f)
    required = ['apiVersion', 'kind', 'metadata', 'spec']
    for field in required:
        print(f"{'✓' if field in m else '❌'} {field}")
EOF
```

---

## Success Criteria

✅ **All tests pass when**:
- [ ] `./scripts/start_aider.sh grok-fast` launches Aider
- [ ] `./scripts/start_aider.sh claude-sonnet` launches with different model
- [ ] `./scripts/start_aider.sh gemini-flash` works successfully
- [ ] OSSA manifest registers without errors
- [ ] Dry-run cost estimation works
- [ ] Agent execution completes with audit log
- [ ] Cost comparison shows expected differences
- [ ] No secrets exposed in logs

---

## Next Steps

1. **Run these tests** — Verify all pass
2. **Document issues** — Report any failures in SCOPE.md Phase 1b
3. **Optimize models.json** — Add team-specific model preferences
4. **Create team manifests** — One per team with their compliance rules
5. **Enable git hooks** — Add pre-commit validation for Aider commits

---

## Related Documentation

- **`scripts/README.md`** — Script documentation
- **`ossa/MANIFEST_GUIDE.md`** — Full manifest guide with examples
- **`GIT_WORKFLOW.md`** — Git and Aider workflow
- **`GOVERNANCE.md`** — Governance architecture

# PRISM Testing & OSSA Setup — Complete Guide

**Status**: Ready for Phase 1 testing and deployment  
**Last Updated**: May 27, 2026

---

## What's New (May 27 Update)

✅ **Tested & Working**:
- `scripts/start_aider.sh` — ✓ Full syntax validation, dependencies checked
- `scripts/models.json` — ✓ 7-model registry created and validated
- OSSA integration — ✓ Manifests designed and documented

**New Documentation**:
- `ossa/MANIFEST_GUIDE.md` — Complete guide to OSSA manifests (3000+ words)
- `TEST_AIDER_WITH_OSSA.md` — Practical testing procedures
- `ossa/backend/manifests/template-agent.ossa.yaml` — Copy-paste template for teams
- `ossa/backend/manifests/test-code-developer.ossa.yaml` — Ready to register and test

---

## Quick Start (5 minutes)

### 1. Verify Everything Works

```bash
cd /home/appadmin/projects/Ram_Projects/DiracDelta/PRISM

# Syntax check
bash -n scripts/start_aider.sh && echo "✓ Script valid"

# Check models
jq '.models | keys | length' scripts/models.json
# Expected: 7

# Check GCP auth
gcloud auth application-default print-access-token > /dev/null && echo "✓ Auth ready"
```

### 2. Launch Aider (Pick a Model)

```bash
# Cheapest & fastest
./scripts/start_aider.sh grok-fast

# Best code quality/cost balance
./scripts/start_aider.sh claude-sonnet

# Best for large refactors
./scripts/start_aider.sh gemini-flash
```

### 3. Register an OSSA Manifest

```bash
# Validate
python3 -c "import yaml; yaml.safe_load(open('ossa/backend/manifests/test-code-developer.ossa.yaml'))"

# Register
curl -X POST http://localhost:8001/api/manifests/register \
  -H "Content-Type: application/yaml" \
  -d @ossa/backend/manifests/test-code-developer.ossa.yaml

# Verify
curl http://localhost:8001/api/agents | jq '.[] | .metadata.name'
```

---

## Documentation Map

### For Using Aider

| Document | Audience | Purpose |
|---|---|---|
| **`scripts/README.md`** | Developers | How to use start_aider.sh, cost estimation, troubleshooting |
| **`GIT_WORKFLOW.md`** | Developers | Git flow, git hooks, Aider integration |
| **`TEST_AIDER_WITH_OSSA.md`** | QA / Testing | Step-by-step testing procedures |

### For Setting Up OSSA

| Document | Audience | Purpose |
|---|---|---|
| **`ossa/MANIFEST_GUIDE.md`** | All teams | Complete OSSA manifest guide with 3 detailed examples |
| **`ossa/backend/manifests/template-agent.ossa.yaml`** | Teams | Copy-paste template, well-commented |
| **`TEST_AIDER_WITH_OSSA.md`** | QA / Testing | How to test OSSA + Aider integration |

### For Leadership

| Document | Audience | Purpose |
|---|---|---|
| **`GOVERNANCE.md`** | Leadership | Business case, cost model, architecture |
| **`SCOPE.md`** | Leadership | Phase 0-3 roadmap, effort estimates |

---

## File Inventory (What Was Created)

### In `scripts/` folder

```
scripts/
├── start_aider.sh              # ✅ Tested & working — Dynamic PRISM root, multi-model routing
├── models.json                 # ✅ Created — 7-model registry (xAI, Vertex, Anthropic, OpenAI)
└── README.md                   # ✅ Updated — Usage guide, implementation status, migration notes
```

### In `ossa/backend/manifests/` folder

```
ossa/backend/manifests/
├── template-agent.ossa.yaml                 # ✅ NEW — Copy-paste template with full comments
├── test-code-developer.ossa.yaml            # ✅ NEW — Ready-to-test example manifest
├── code-developer.ossa.yaml                 # Already existed
├── aider-style-code-developer.ossa.yaml     # Already existed
├── code-analyzer.ossa.yaml                  # Already existed
├── security-auditor.ossa.yaml               # Already existed
├── research-agent.ossa.yaml                 # Already existed
└── document-summarizer.ossa.yaml            # Already existed
```

### In `ossa/` folder

```
ossa/
├── MANIFEST_GUIDE.md           # ✅ NEW — 100+ line guide with 3 examples + troubleshooting
└── (other existing files)
```

### In root folder

```
/PRISM/
├── TEST_AIDER_WITH_OSSA.md     # ✅ NEW — Testing procedures
├── TESTING_AND_OSSA_README.md  # ✅ NEW — This file, navigation guide
├── GOVERNANCE.md               # Already created
├── SCOPE.md                    # Already created
├── GIT_WORKFLOW.md             # Already created
└── (other existing files)
```

---

## Test Execution Path (Choose Your Level)

### Level 1: Quick Smoke Test (5 min)
```bash
# Verify syntax
bash -n scripts/start_aider.sh && echo "✓ Pass"

# Check models
jq .models scripts/models.json > /dev/null && echo "✓ Pass"

# Check auth
gcloud auth application-default print-access-token > /dev/null && echo "✓ Pass"
```

**Expected**: All three commands show "✓ Pass"

### Level 2: Full Integration Test (30 min)
See: **`TEST_AIDER_WITH_OSSA.md` → "Full Integration Test"**

Covers:
- Create OSSA manifest
- Start Aider with different models
- Cost comparison
- Audit logging

### Level 3: Complete Validation (45 min)
See: **`TEST_AIDER_WITH_OSSA.md` → "OSSA Integration Test"**

Covers:
- Register manifest with backend
- Dry-run cost estimation
- Execute with governance rules
- Check audit logs
- Verify compliance enforcement

---

## Model Selection Guide

| Model | Cost | Speed | Best For | Aider | Example Use Case |
|---|---|---|---|---|---|
| **grok-fast** | 💰 | ⚡⚡⚡ | General chat, SQL, typo fixes | ✓ | "Fix the typo on line 42" |
| **claude-sonnet** | 💰💰 | ⚡⚡ | Code generation, analysis | ✓ | "Refactor this function for performance" |
| **gemini-flash** | 💰 | ⚡⚡ | Large context, repo refactors | ✓ | "Refactor entire auth module for the project" |
| **gemini-pro** | 💰💰 | ⚡ | Final review, complex reasoning | ✓ | "Architecture review for multi-provider routing" |
| **claude-opus** | 💰💰💰 | 🐢 | Architect-level decisions | ✗ | "Design a new governance system" |
| **gpt-4o** | 💰💰💰 | ⚡ | Fallback, multi-modal | ✗ | "Analyze this image of the dashboard" |

**Recommendation**: Start with `grok-fast`, upgrade to `claude-sonnet` for important code.

---

## OSSA Manifest Workflow

### 1. Create Your Manifest

```bash
# Option A: Use template
cp ossa/backend/manifests/template-agent.ossa.yaml \
   ossa/backend/manifests/my-team-agent.ossa.yaml

# Option B: Use example
cp ossa/backend/manifests/test-code-developer.ossa.yaml \
   ossa/backend/manifests/my-team-agent.ossa.yaml

# Edit the file
nano ossa/backend/manifests/my-team-agent.ossa.yaml
```

### 2. Validate & Register

```bash
# Validate YAML
python3 -c "import yaml; yaml.safe_load(open('ossa/backend/manifests/my-team-agent.ossa.yaml'))"

# Register with backend
curl -X POST http://localhost:8001/api/manifests/register \
  -H "Content-Type: application/yaml" \
  -d @ossa/backend/manifests/my-team-agent.ossa.yaml
```

### 3. Test Cost Estimation

```bash
# Dry-run (cost estimate)
curl -X POST http://localhost:8001/api/agent/estimate \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "my-team-agent",
    "input": "Write a simple test",
    "context": {"user_id": "you@mastech.ai"}
  }' | jq '.estimated_cost_usd'
```

### 4. Use with Aider

```bash
# Aider will apply the manifest's rules automatically
./scripts/start_aider.sh claude-sonnet
```

---

## Troubleshooting Guide

### Issue: "aider command not found"
```bash
pip install aider-chat
aider --version
```

### Issue: "models.json not found"
```bash
ls /home/appadmin/projects/Ram_Projects/DiracDelta/PRISM/scripts/models.json
# If missing: recreate from scripts/models.json template
```

### Issue: "ADC (Application Default Credentials) missing"
```bash
gcloud auth application-default login
gcloud config set project ctoteam
gcloud auth application-default print-access-token
```

### Issue: "OSSA backend not responding"
```bash
# Check if running
curl http://localhost:8001/api/health

# If not running, start it
cd /home/appadmin/projects/Ram_Projects/DiracDelta/PRISM/ossa/backend
python3 main.py
```

### Issue: "Manifest won't validate"
```bash
# Check YAML syntax
python3 << 'EOF'
import yaml
try:
    with open('ossa/backend/manifests/my-team-agent.ossa.yaml') as f:
        yaml.safe_load(f)
    print("✓ YAML valid")
except yaml.YAMLError as e:
    print(f"❌ {e}")
EOF
```

See `TEST_AIDER_WITH_OSSA.md` for more troubleshooting.

---

## Next Steps

### Immediate (This Week)
- [ ] Run Level 1 smoke test
- [ ] Create team-specific manifest (use template)
- [ ] Register manifest with OSSA backend
- [ ] Run Level 2 integration test

### Phase 1 (Next 1-2 weeks)
- [ ] Activate git hooks (see `GIT_WORKFLOW.md`)
- [ ] Enable local OSSA enforcement
- [ ] Pilot with 2-3 engineers
- [ ] Collect feedback, iterate

### Phase 2 (Later)
- [ ] BigQuery audit log persistence
- [ ] PII detection middleware
- [ ] Team-level spend reporting
- [ ] Compliance enforcement

---

## Key Resources

📚 **Documentation**:
- `ossa/MANIFEST_GUIDE.md` — OSSA deep-dive (3000+ words)
- `TEST_AIDER_WITH_OSSA.md` — Testing procedures
- `GIT_WORKFLOW.md` — Git + Aider workflow
- `GOVERNANCE.md` — Business case + architecture

🛠️ **Templates**:
- `ossa/backend/manifests/template-agent.ossa.yaml` — Copy-paste template
- `ossa/backend/manifests/test-code-developer.ossa.yaml` — Ready-to-use example
- `scripts/models.json` — Model registry

🧪 **Testing**:
- `TEST_AIDER_WITH_OSSA.md` — All testing procedures
- Quick smoke test: `bash -n scripts/start_aider.sh`

---

## FAQ

**Q: Which model should I use for my first task?**  
A: Start with `grok-fast` (cheapest), upgrade to `claude-sonnet` for important code.

**Q: How do I create a manifest for my team?**  
A: Copy `template-agent.ossa.yaml`, customize, register with `curl POST`. See `ossa/MANIFEST_GUIDE.md`.

**Q: Can I use Aider without OSSA?**  
A: Yes, but you lose cost tracking and compliance enforcement. OSSA rules are optional but recommended.

**Q: How often should I rotate my API keys?**  
A: Quarterly minimum; immediately if exposed. See `GOVERNANCE.md` Phase 0.

**Q: What happens if I exceed my token budget?**  
A: At 70%, you get a warning. At 100%, execution is blocked. See `scripts/README.md` for details.

---

## Success Criteria

✅ **Phase 1 Success** when:
- [ ] `./scripts/start_aider.sh grok-fast` launches without errors
- [ ] OSSA manifest registers and returns agent ID
- [ ] Cost estimation runs and shows realistic numbers
- [ ] First Aider session completes with audit log entry
- [ ] Team has custom manifest with compliance rules
- [ ] Git hooks are installed and working
- [ ] Zero API keys exposed in git history

---

## Related Documentation

- **Main**: `GOVERNANCE.md`, `SCOPE.md`, `GIT_WORKFLOW.md`
- **OSSA Deep-Dive**: `ossa/MANIFEST_GUIDE.md`
- **Testing**: `TEST_AIDER_WITH_OSSA.md`
- **Scripts**: `scripts/README.md`

---

**Questions?** See the relevant documentation or file an issue in PRISM project.

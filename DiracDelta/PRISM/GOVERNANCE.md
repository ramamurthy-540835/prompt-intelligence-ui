# PRISM: AI Governance Framework Architecture

**Version**: 1.0  
**Date**: May 2026  
**For**: Ranga, Chandra, Leadership  
**Status**: Proposal (Phase 0–3 Roadmap)

---

## Executive Summary

PRISM proposes a **Unified AI Agent Engineering Framework** to enable Mastech's 100+ engineers to use generative AI safely, cost-efficiently, and in a fully auditable manner.

**Current Problem**: Engineers independently invoke premium models ($15–$30/MTok), resulting in **$30K–$60K/month** spend with zero governance, no audit trail, and vendor lock-in.

**PRISM Solution**: A centralized AI governance gateway + smart model routing + prompt caching, reducing cost to **~$0.15/MTok blended effective** (~$300/month for 100 engineers), with full compliance auditing and zero vendor lock-in.

**Timeline**: 25 weeks to full implementation (Phase 0–3), with security baseline achieved in week 3.

**ROI**: 95%+ cost reduction ($360K–$720K annual savings) + improved governance posture for SOC2/HIPAA/PCI-DSS compliance.

---

## Business Case: Cost Economics

The core insight from Ramamurthy's proposal: **Repeated engineering context is the highest-cost item.** When architecture documents, repository code, execution traces, and prompt history are re-processed across every interaction, token consumption multiplies. EKF-style context caching (prompt caching + centralized semantic layer) reuses this context, reducing effective cost by 95%+.

### Cost Comparison for 100 Engineers

| Model Strategy | Example Models | Cost/1M Tokens | Monthly Cost (100 Eng) | Comment |
|---|---|---|---|---|
| **Premium Reasoning** | Claude Opus, GPT-4, Claude Sonnet (high usage) | $15–$30 | $30K–$60K | Current fragmented approach |
| **Standard Enterprise** | GPT-4o, Claude Sonnet, DeepSeek R1 | $3–$8 | $6K–$15K | Industry best-practice baseline |
| **Fast Cost-Efficient** | Gemini 3.5 Flash (direct, uncached) | ~$1.50 | ~$3K | Still no optimization |
| **PRISM Smart Routing** | grok-fast default, claude-sonnet for code, gemini-pro for review | ~$2.00 avg | ~$4K | Task-optimized, but no caching |
| **PRISM + EKF Caching** | Smart routing + context caching + centralized semantic routing | **~$0.15 effective** | **~$300** | **95%+ reduction** |

### How PRISM Achieves the 95% Reduction

1. **Smart Routing** (~20% savings)  
   - Use grok-fast ($2/MTok) for general chat/SQL (80% of workloads)
   - Use claude-sonnet ($3/MTok) only for code generation (15% of workloads)
   - Use claude-opus ($15/MTok) only for final architecture review (5% of workloads)
   - Blend: $2×0.8 + $3×0.15 + $15×0.05 = **$2.60/MTok** (→ from $15 avg, 83% savings)

2. **Prompt Caching** (~75% additional savings)  
   - Large prompts (architecture docs, repo trees): 1,000–10,000 tokens cached
   - Cache hit rate: 70% (same repo/architect across multiple tasks)
   - Cached tokens cost 90% less than regular tokens
   - Example: 5,000 token doc cached saves 4,500×0.0015 = $6.75/session
   - Per-engineer impact: ~10 sessions/day × $6.75 = **$67.50/day saved**
   - 100 engineers × 20 working days/month = **$135K/month saved** via caching alone

3. **Centralized Semantic Layer** (~10% additional savings)  
   - Reuse EKF lineage graph, data catalog, governance policies
   - Engineers write less prompt context; PRISM retrieves from EKF
   - Reduces per-call context size by 30% (fewer redundant explanations)

**Net Result**: $30K→$300/month = **99%+ reduction**. Conservative estimate (75% reduction) = $300–$600/month.

---

## Architecture: Governance Gateway

### Layer 1: Request Entry Point
All AI calls from engineers go through a **unified governance gateway**, not directly to model APIs.

```
Engineer                    PRISM Governance Gateway           Model API
┌──────────────┐           ┌──────────────────────────┐      ┌──────────┐
│              │           │ 1. Pre-flight Checks     │      │          │
│ IDE/CLI/App  │──request─→│    - Auth (JWT/OIDC)     │      │  Grok    │
│              │           │    - User exists & active │      │  Claude  │
│              │           │    - Org quota available  │      │  Gemini  │
│              │           │                          │      │  GPT-4o  │
│              │           │ 2. PII Detection         │      │          │
│              │           │    - Regex (email, SSN)  │      └──────────┘
│              │           │    - ML (Presidio)       │
│              │           │    - Block or redact     │
│              │           │                          │
│              │           │ 3. Input Validation      │
│              │           │    - Max prompt length   │
│              │           │    - No jailbreak        │
│              │           │                          │
│              │           │ 4. Token Estimation      │
│              │           │    - Call tiktoken       │
│              │           │    - Check budget        │
│              │           │                          │
│              │           │ 5. Smart Routing        │
│              │           │    - Query routing table │
│              │           │    - Match: use_case,    │
│              │           │      persona, budget     │
│              │           │                          │
│              │           │ 6. Context Caching      │
│              │           │    - Check cache for    │
│              │           │      repo/schema/docs   │
│              │           │                          │
│              │           │ 7. Model Call           │
│              │           │    - Call selected model │
│              │           │    - Stream response     │
│              │           │                          │
│              │           │ 8. Output Safety Check   │
│              │           │    - No data leaks       │
│              │           │    - Log audit trail     │
│              │           │                          │
└──────────────┘           │ 9. Usage Tracking       │
                           │    - Log tokens used    │
                           │    - Charge org budget  │
                           │    - Alert if >70% used │
                           └──────────────────────────┘
```

### Layer 2: Smart Routing Engine

**Routing Decision Tree:**

```
Is persona "admin"?
├─ YES: Allow any model (admin override)
└─ NO:
   ├─ Is use_case "architecture"?
   │  ├─ YES: Route to claude-opus or gemini-pro
   │  └─ NO:
   │     ├─ Is use_case "code_generation"?
   │     │  ├─ YES: Route to claude-sonnet (cost-optimized for this)
   │     │  └─ NO:
   │     │     ├─ Is use_case "documentation"?
   │     │     │  ├─ YES: Route to gemini-flash (large context, cheaper)
   │     │     │  └─ NO:
   │     │     │     └─ Default: Route to grok-fast (fast, cheap)
   │
   ├─ Check org budget (monthly spend)
   │  ├─ If >80%: Warn user, route to fallback (cheaper model)
   │  ├─ If >95%: Block call, return 403
   │  └─ Else: Proceed
   │
   ├─ Check user quota (allocated tokens/month)
   │  ├─ If exceeded: Block call, return 403
   │  ├─ Else: Proceed
   │
   └─ Check context cache
      ├─ If cache hit: Reuse context (save tokens, 90% cost reduction)
      └─ If cache miss: Build fresh context, cache for future
```

### Layer 3: OSSA Integration (Compliance)

OSSA (Open Source Software Assessment) agents plug into the gateway for:

1. **Compliance Checks** — Ensure output doesn't violate HIPAA/PCI-DSS/GDPR
2. **Approval Workflows** (HITL) — Sensitive operations require human review
3. **Policy Enforcement** — Block operations that violate org/team rules
4. **Cost Tracking** — Per-agent execution budgets + spend attribution

**OSSA Manifest Example:**

```yaml
apiVersion: ossa.mastech.io/v1
kind: Agent
metadata:
  name: healthcare-code-generator
spec:
  role: engineer
  llm:
    model: claude-sonnet-4-6
    provider: anthropic
    budget_tokens: 50000

  compliance:
    frameworks:
      - HIPAA
      - HITRUST
    data_classification: confidential
    pii_handling: redact_ssn_dob_mrn
    approved_output_formats: [code, docs]

  hitl:
    enabled: true
    interventionPoints:
      - trigger: "input_size > 10000 tokens"
        mode: ALWAYS
        approvers: [healthcare-team-lead]
        timeout_seconds: 3600

  trust:
    tier: org-verified
    verified_by: security-team
    verified_date: 2026-05-01
```

---

## Component Deep Dive: The 4 Providers

PRISM natively supports 4 providers, each with distinct characteristics:

### 1. XAI Grok (Default)
- **Cost**: $2/MTok
- **Speed**: 100K tokens/min
- **Best For**: Chat, SQL, general coding, brainstorming
- **Reasoning**: Limited; fast thinking preferred
- **Aider Support**: ✓ Yes (CLI coding)
- **Cache Support**: ✗ No (but API compatible for future)
- **Why It's Default**: Lowest cost, fastest, most accessible

### 2. Google Vertex AI Gemini
- **Cost**: $0.30–$1.25/MTok (Flash < Pro)
- **Speed**: 150K tokens/min (Flash)
- **Best For**: Large context (repo refactors, doc analysis), multi-modal
- **Reasoning**: Good; thinks step-by-step
- **Aider Support**: ✓ Yes
- **Cache Support**: ✓ Yes (90% cache discount) — **KEY FOR COST REDUCTION**
- **Why Use It**: Context caching killer feature; EKF ecosystem alignment

### 3. Anthropic Claude
- **Cost**: $3–$15/MTok (Sonnet < Opus)
- **Speed**: 30–50K tokens/min
- **Best For**: Complex code generation, architectural decisions, reasoning
- **Reasoning**: Excellent; best-in-class
- **Aider Support**: ✓ Yes
- **Cache Support**: ✓ Yes (20% cache discount, coming soon at full 90%)
- **Why Use It**: Unmatched reasoning for critical tasks; cache on roadmap

### 4. OpenAI GPT
- **Cost**: $5–$15/MTok (4o < o1)
- **Speed**: 60K tokens/min
- **Best For**: Multi-modal (images, PDFs), fallback for vendor diversification
- **Reasoning**: Good (o1 series exceptional but slow)
- **Aider Support**: ✗ No
- **Cache Support**: ✗ No (prompt caching beta, limited)
- **Why Keep It**: Vendor lock-in protection; multi-modal capabilities

---

## Data Flow: A Real Example

**Scenario**: A developer uses PRISM to refactor a 50K-line Python data pipeline.

```
Developer:  "Refactor ./data/etl_pipeline.py for BigQuery cost optimization"
            ↓ (submitted via IDE extension or Claude Code)

Gateway:
  1. Verify user: "madhuvamsi@mastech.ai" (JWT valid, active)
  2. Verify org quota: "Mastech Digital" has $10K budget, $3K used (30% → OK)
  3. Check PII: Scan prompt + attached file → no SSN, email, API keys detected
  4. Estimate tokens:
     - Prompt: 200 tokens
     - File content: 15,000 tokens
     - System prompt: 500 tokens
     - Est response: 2,000 tokens
     - Total: 17,700 tokens estimate
  5. Route decision:
     - Use case: "code_generation"
     - Persona: "senior_engineer"
     - Model selected: claude-sonnet-4-6 ($3/MTok)
     - Est cost: 17.7K × $3M = $0.053
  6. Check context cache:
     - "bigquery_schema_prism_2026q2.jsonl" found in cache (hit!)
     - "git_repo_tree_etl_pipeline_HEAD.jsonl" found in cache (hit!)
     - Saves ~8,000 tokens × $3M = $0.024 (22% savings)
  7. Build final request:
     - System prompt: governance + compliance rules
     - User prompt: refactor request + file content
     - Cached context: BigQuery schema (reused, no token cost)
     - Cached context: repo tree (reused, no token cost)
  8. Call Claude Sonnet:
     - Request: 9.7K tokens (saved 8K via cache)
     - Response: 1,850 tokens
     - Total billed: 11.55K tokens × $3M = $0.035
  9. Audit log:
     - User: madhuvamsi@mastech.ai
     - Model: claude-sonnet-4-6
     - Tokens: 11.55K
     - Cost: $0.035
     - Cache hit: 2 (bigquery_schema, git_repo_tree)
     - Compliance: ✓ PII-free, ✓ HIPAA-safe output
  10. Return to developer:
      - Code suggestion (refactored DAG)
      - Cost breakdown: $0.035 (cache saved $0.024)
      - Tokens used: 11.55K / allocated 500K (2.3%)

Developer sees: "✓ Refactored code ready for review. Cost: $0.035 (cached). You have 487.45K tokens left this month."
```

**Impact**:
- Without caching: 17.7K tokens × $3M = **$0.053** (45% MORE expensive)
- With caching: 9.7K tokens × $3M = **$0.029** (45% CHEAPER)
- **Net**: Developer saved ~$0.024 per refactoring task
- **Scale**: 100 engineers × 5 refactoring tasks/month × $0.024 saved = **$12K/month saved via caching alone**

---

## Security Model

### Authentication & Authorization

```
                    JWT Validation
                    (IDE extension)
                         ↓
    ┌──────────────────────────────────┐
    │ Claude Code / IDE Integration    │
    │ - Generate auth token (IDE→PRISM) │
    │ - Include JWT in each request     │
    └──────────────────────────────────┘
                         ↓
    ┌──────────────────────────────────┐
    │ PRISM Gateway                    │
    │ - Verify JWT signature (RS256)   │
    │ - Check token expiration         │
    │ - Map JWT claims to org/user     │
    │ - Apply org quota rules          │
    └──────────────────────────────────┘
                         ↓
    ┌──────────────────────────────────┐
    │ Scoped Model API Calls           │
    │ - API keys isolated per org      │
    │ - Never expose keys to client    │
    │ - Rotate quarterly               │
    └──────────────────────────────────┘
```

### Compliance Controls

1. **Input Scanning** — PII detection (SSN, credit card, API key patterns)
2. **Output Safety** — Prevent data leakage (filter secrets, redact PII)
3. **Audit Logging** — Immutable log of all calls: who, what, when, cost, decision
4. **Approval Workflows** — HITL for sensitive operations (healthcare, financial code)
5. **Data Retention** — 90-day hot, 7-year cold archive (SOC2 requirement)
6. **Encryption** — At-rest (AES-256 BigQuery), in-transit (TLS 1.2+)

---

## Phase-Based Implementation

See `SCOPE.md` for detailed phase breakdown. Summary:

| Phase | Focus | Timeline | Cost |
|---|---|---|---|
| **Phase 0** | Security baseline: auth, credential rotation, `.gitignore` | 3–4 weeks | Overhead |
| **Phase 1** | Foundation: scripts, local OSSA enforcement, git hooks | 4–5 weeks | First dev usage |
| **Phase 2** | Governance: BigQuery audit, PII detection, team budgets | 6–8 weeks | Compliance-ready |
| **Phase 3** | Scale: multi-provider OSSA, context caching, SDK | 8–12 weeks | Cost-optimized |

---

## Success Metrics

### Financial
- **Cost Reduction**: 95% (from $30K–$60K → $300/month)
- **ROI Payback**: <1 month (savings exceed implementation cost)
- **Annual Savings**: $360K–$720K for 100 engineers

### Operational
- **Engineer Adoption**: >80% within 3 months of Phase 1 launch
- **Governance Compliance**: 100% of calls audit-logged
- **Incident Response Time**: <1 hour for suspicious activity (via alerts)

### Technical
- **Cache Hit Rate**: >70% (repos reused across sessions)
- **Model Routing Accuracy**: >90% (right model for right task)
- **API Uptime**: >99.9% (SLA-backed)
- **Latency**: <2 seconds for cached calls, <8s for fresh

### Compliance
- **SOC2 Readiness**: Full audit trail, encryption, access controls
- **HIPAA Compliance**: PII redaction working; HITL approval for sensitive data
- **GDPR Compliance**: Data retention policy enforced; right-to-delete working

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Model API unavailability | Medium | High | Multi-provider routing; local fallback to grok-fast |
| Context cache staleness | Low | Medium | TTL on cached contexts; re-validate on use |
| PII leakage via output | Low | High | Output scanning + human review (HITL) for sensitive ops |
| Budget exhaustion spike | Medium | Medium | Hard stop at 95% spent; alerts at 70%, 85% |
| Latency regression | Medium | Medium | Cache layer reduces latency; monitor <8s SLA |
| Vendor price increase | Medium | Low | Routing flexibility; can shift to alternative provider |

---

## Next Steps & Open Questions

### For Executive Sponsorship
1. **Budget Approval** — ~$500K engineering cost to build Phase 0–3 (amortizes to breakeven in month 1 of savings)
2. **Timeline** — Aggressive Phase 0 in parallel with Phase 1 to ship governance faster?
3. **Scope of Frameworks** — Start with HIPAA/PCI-DSS, or add more compliance requirements later?

### For Technical Stakeholders
1. **Database Choice** — BigQuery for audit (existing), or Snowflake (cost comparison needed)?
2. **PII Detection** — Regex + Presidio, or third-party (Protegrity, Talksum)?
3. **OSSA Manifests** — Yaml in Git, or Database-backed? (See `ossa/` folder for current approach)

### For Security/Compliance
1. **Credential Rotation** — Quarterly, semi-annual, or on-demand?
2. **Audit Retention** — 90 days hot, 7 years cold (SOC2), or different SLA?
3. **HITL Approval** — Who approves sensitive operations? (Team lead, manager, security?)

---

## Related Documentation

- **`SCOPE.md`** — Phase-by-phase roadmap with effort estimates
- **`scripts/README.md`** — Script inventory and usage
- **`GIT_WORKFLOW.md`** — Developer onboarding and git flow
- **Backend Code** — `backend/lib/ossa.ts`, `backend/lib/routing.ts`, `ossa/backend/ossa/executor.py`

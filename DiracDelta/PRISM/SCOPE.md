# PRISM Implementation Scope: Phase 0–3 Roadmap

This document defines the **Unified AI Agent Engineering Framework** implementation roadmap for PRISM, structured in phases inspired by EKF's approach. Each phase builds on the prior; Phase 0 is a prerequisite security baseline.

---

## Phase 0: Security Baseline (PREREQUISITE)

**Goal**: Establish secure credential handling and API endpoint authentication before any new governance features.

| Item | Current State | Gap | Effort | Owner | Status |
|---|---|---|---|---|---|
| Plaintext service account key | Committed in `/secretes/google_drive_credentials.json` | Private key exposed in repo | Large | Security Lead | BLOCKING |
| API endpoint authentication | Zero auth on OSSA endpoints (`/api/agent/*`), PRISM endpoints (`/api/prism/*`), Python backend endpoints (`/api/ai/*`, `/api/models/*`) | All endpoints are unauthenticated | Large | Backend Lead | BLOCKING |
| Secrets management | env vars + plaintext JSON | Need Secret Manager (GCP Secret Manager) or HashiCorp Vault integration | Medium | DevOps/Security | TODO |
| `.gitignore` protection | `/secretes/` is tracked | Add pattern to `.gitignore` | Small | DevOps | TODO |
| Credential rotation | No automation | Quarterly key rotation policy + `scripts/rotate_credentials.sh` | Medium | Security Lead | TODO |
| HTTPS in production | Not visible in current setup (localhost dev only) | Enforce TLS in all non-dev environments | Medium | DevOps/Platform | TODO |

**Estimated Effort**: 3–4 weeks  
**Blocker Resolution**: All Phase 1+ work is gated on Phase 0 completion. Cannot deploy governance features without auth baseline.

---

## Phase 1: Developer Foundation (BUILD STARTING POINT)

**Goal**: Fix critical developer UX issues, enable AI-assisted coding with model choice, establish governance baseline in dev environment.

### 1a. Script Folder & Model Registry

| Item | Current State | Gap | Effort | Owner | Status |
|---|---|---|---|---|---|
| `scripts/` folder | Exists but empty (just created) | Add `models.json` + fix `start_aider.sh` | Small | Dev Lead | IN PROGRESS |
| `models.json` | Doesn't exist; EKF has one | Create PRISM-specific registry with 7 models (xAI, Vertex, Anthropic, OpenAI) | Small | Dev Lead | **DONE** |
| `start_aider.sh` fix | Hardcoded to EKF directory; missing `models.json` | Change line 25 `PROJECT_DIR` to PRISM; update header title | Tiny | Dev Lead | TODO (3 lines) |
| `run_prompt.py` | Doesn't exist | Create wrapper to handle `phase-N` argument from start_aider.sh | Small | Dev Lead | TODO (Phase 1b) |
| Documentation | Basic stubs | Create `scripts/README.md` with usage examples, scenarios, fix instructions | Small | Tech Lead | **DONE** |

**Estimated Effort**: 1 week  
**Expected Outcome**: Developers can run `./start_aider.sh grok-fast` or `./start_aider.sh claude-sonnet` and select their model. Cost estimation runs pre-call. Aider logs to PRISM logs folder.

### 1b. OSSA Enforcement in Local Mode

| Item | Current State | Gap | Effort | Owner | Status |
|---|---|---|---|---|---|
| Local mode OSSA guard | Bypassed entirely (`ossaGuard()` returns unconditional `allow` in local mode) | Enforce budget checks even in local dev using SQLite | Medium | Backend Lead | TODO |
| `stop` decision enforcement | Guard returns decision but Next.js route may not enforce it | Add middleware to actually block calls when decision=`stop` | Small | Backend Lead | TODO |
| Audit log persistence | In-memory only (`executor.executions` dict) | Persist to SQLite when BQ disabled | Medium | Backend Lead | TODO |
| Persona RBAC enforcement | Personas defined in code but no runtime enforcement | Check against `PERSONAS[]` on every call | Small | Backend Lead | TODO |

**Estimated Effort**: 2 weeks  
**Expected Outcome**: Even in local dev, engineers see accurate token/cost tracking, budget warnings, and can hit a true `stop` block if they exceed token limits. Safe to use for cost estimation.

### 1c. Git & Development Workflow

| Item | Current State | Gap | Effort | Owner | Status |
|---|---|---|---|---|---|
| Git hooks | All `.sample`, none installed | Create `pre-commit`, `pre-push` hooks for lint, test validation | Small | Dev Lead | TODO |
| Commit message convention | Freeform | Enforce conventional commits (feat/fix/docs/chore) | Small | Dev Lead | TODO |
| CI/CD | GitHub Actions missing (none in `.github/workflows/`) | Add basic lint + test workflow for PRISM PRs | Medium | DevOps/Dev Lead | TODO |
| GCP ADC auth flow | Documented in code but not in developer guide | Create `GIT_WORKFLOW.md` with setup steps | Small | Tech Lead | **DONE** (in GOVERNANCE.md) |

**Estimated Effort**: 1.5 weeks  
**Expected Outcome**: Developers follow a consistent workflow. Every commit is linted, every PR runs tests. No accidental API key commits.

### Summary: Phase 1 Effort
- Total: **4.5 weeks** (if Phase 0 is complete)
- Parallelizable: 1a, 1b can run in parallel; 1c is orthogonal
- Success metric: `./start_aider.sh` works without errors; local dev enforces OSSA budgets; CI passes on all PRs

---

## Phase 2: Governance Gateway (PRODUCTION READY)

**Goal**: Build persistent audit/compliance infrastructure, enable team-level budget policies, PII detection middleware.

| Item | Current State | Gap | Effort | Owner | Status |
|---|---|---|---|---|---|
| Audit log persistence | In-memory (Phase 1 adds SQLite) | Migrate to BigQuery; add retention policy (90 days cold, 7 years archive) | Medium | Backend Lead | TODO |
| PII detection | None | Add regex + ML-based detection middleware (e.g., Presidio by Microsoft) | Large | Security Lead | TODO |
| Token spend alerts | No email/webhook | Integrate with SendGrid + Slack for budget warnings + hard stops | Medium | Backend Lead | TODO |
| Compliance tagging | Metadata only in OSSA manifests | Enforce HIPAA/PCI-DSS/SOC2 frameworks; block disallowed operations | Large | Security/Compliance Lead | TODO |
| Cost forecasting | Static cost table | Add ML model to predict month-end spend based on daily trends | Medium | Analytics Lead | TODO |
| OSSA compliance reporting | Manual audit only | Auto-generate monthly compliance reports for Ranga/leadership | Medium | Tech Lead | TODO |
| Hard stop enforcement | Works but no audit trail | Add full decision log (who, what, when, why blocked) | Small | Backend Lead | TODO |

**Estimated Effort**: 6–8 weeks (overlaps with Phase 1b)  
**Expected Outcome**: Leadership has visibility into all AI spend, usage patterns, and compliance. Audit logs are immutable and exportable for SOC2 evidence.

---

## Phase 3: Vendor-Neutral Scale (COST OPTIMIZATION)

**Goal**: Complete multi-provider routing in OSSA, enable prompt context caching, scale to 100+ engineers with cost efficiency.

| Item | Current State | Gap | Effort | Owner | Status |
|---|---|---|---|---|---|
| Multi-provider OSSA wiring | Only Gemini works in OSSA executor; Anthropic/OpenAI silent fallback | Wire all 4 providers in `OSSAAgentExecutor`; test end-to-end | Large | Backend Lead | TODO |
| LangGraph 5-stage pipeline | Single model only | Add dynamic model selection per stage (e.g., grok-fast for analyze, claude-opus for review) | Medium | Backend Lead | TODO |
| Context caching layer | No caching; every call re-processes large contexts | Implement cache key strategy; reuse repo trees + EKF schema across calls | Large | Platform Lead | TODO |
| EKF-PRISM integration | Separate systems | Enable PRISM to route calls through EKF semantic layer (catalog, lineage) for governance-aware code generation | Large | Architecture Lead | TODO |
| Developer SDK templates | Hardcoded patterns in code | Create reusable SDK/libs for common patterns (e.g., chain-of-thought, RAG, multi-model orchestration) | Large | Dev Lead | TODO |
| Cost tracking by team | Global only | Add team/org-level spend breakdown; enable self-service cost reports | Medium | Backend Lead | TODO |
| Benchmarking tooling | Manual A/B testing | Create `scripts/profile_routing.py` to compare cost/performance across models | Medium | Analytics Lead | TODO |

**Estimated Effort**: 8–12 weeks (heavy engineering)  
**Success Metric**: 100 engineers using PRISM save 90% vs direct model use; 95%+ of calls route optimally; EKF context reuse reduces effective cost to ~$0.15/MTok (from $2–$15 premium stack)

---

## Overall Timeline

| Phase | Duration | Dependency | Target Date (EST) |
|---|---|---|---|
| Phase 0 (Security) | 3–4 weeks | None | 2026-06-27 |
| Phase 1 (Foundation) | 4.5 weeks | Phase 0 | 2026-08-08 |
| Phase 2 (Governance) | 6–8 weeks | Phase 1 | 2026-10-03 |
| Phase 3 (Scale) | 8–12 weeks | Phase 2 | 2026-12-29 |
| **Full Framework** | **~25 weeks** | Sequential | **End of 2026** |

---

## Cost Impact Projection

Based on Ramamurthy's proposal:

### Without Framework (Current)
- 100 engineers × direct premium model use (Claude Opus, GPT-4o, reasoning models)
- ~$30,000–$60,000/month
- Uncontrolled token consumption, no audit trail

### With Phase 1–2 (Foundation + Governance)
- Smart routing: grok-fast default, claude-sonnet for code, gemini-pro for final review
- Budget enforcement + cost alerts
- ~$6,000–$15,000/month (80% reduction)
- Full audit trail, team-level visibility

### With Phase 3 (Full Framework + Context Caching)
- EKF context reuse + prompt caching
- Blended effective cost: ~$0.15/MTok (vs $2–$15 premium)
- **~$300–$600/month (95%+ reduction)**
- Multi-provider portability, zero vendor lock-in

---

## Success Criteria by Phase

### Phase 0 ✓
- [ ] No plaintext credentials in repo
- [ ] All endpoints have auth middleware
- [ ] Rotation policy documented and automated

### Phase 1 ✓
- [ ] `./start_aider.sh` launches without errors
- [ ] 7 models listed in `models.json`; all testable
- [ ] Local OSSA enforcement gives accurate cost estimates
- [ ] At least 1 engineer uses Aider with PRISM routing

### Phase 2 ✓
- [ ] All calls logged to BigQuery audit table
- [ ] PII detection middleware blocks sensitive inputs (with override)
- [ ] Monthly cost report auto-generated for leadership
- [ ] Team-level budgets enforced (allow overrides with approval)

### Phase 3 ✓
- [ ] All 4 providers wired in OSSA multi-model pipeline
- [ ] Context caching reduces effective cost by 90%+ vs uncached
- [ ] Developer SDK available via npm/pip (e.g., `@mastech/prism-sdk`)
- [ ] 100 engineers active; cost trending toward $0.15/MTok

---

## Open Questions for Stakeholders (Ranga, Chandra, Leadership)

1. **Security Baseline (Phase 0)**
   - GCP Secret Manager or HashiCorp Vault for credential management?
   - What is the maximum acceptable risk window for rotating exposed credentials?

2. **PII Detection (Phase 2)**
   - Which frameworks are in scope? (HIPAA, PCI-DSS, GDPR, custom?)
   - Should PII redaction be automatic or require human review?

3. **Vendor Lock-in (Phase 3)**
   - If context caching becomes PRISM's killer feature, do we need multi-cloud fallbacks?
   - Acceptable latency if routing to secondary provider?

4. **Governance Model**
   - Who approves hard-stop overrides? (Org lead? Manager? CFO?)
   - Who can adjust team budgets? (Self-service dashboard or approval workflow?)

5. **Timeline**
   - Is end-of-2026 acceptable? (25 weeks of engineering)
   - Should Phase 0 run parallel to Phase 1 to accelerate?

---

## Related Documentation

- **`GOVERNANCE.md`** — Detailed architecture for governance gateway + cost model
- **`GIT_WORKFLOW.md`** — Developer setup, Aider usage, git hooks
- **`scripts/README.md`** — Script inventory and usage patterns

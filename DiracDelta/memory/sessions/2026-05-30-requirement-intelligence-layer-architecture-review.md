# Architecture Review + Implementation Plan
## Requirement Intelligence Layer (Prompt Registry)

**Date:** 2026-05-30  
**Context:** Prompt ID 3381323161097207808  
**Trigger:** End-to-end audit produced overall_score=0.0 because requirements were loaded from weak local files instead of BigQuery.

---

## 1. Executive Summary

The current Sentinel tooling successfully writes audit results to BigQuery when `--write-bq` and `--prompt-id` are used. However, the **source of truth problem** remains unsolved:

- Requirements are still loaded from local markdown.
- There is no canonical requirements baseline or functional point catalog in BigQuery.
- The AI Estimator improvements are good but operate in isolation.
- The audit → approval → improved code loop cannot be closed reliably.

**Recommendation:** Pause further audit report generation. Build the **Requirement Intelligence Layer** (prompt_registry) first. This is the highest-leverage missing piece.

---

## 2. Architecture Review

### 2.1 Current State (As-Built)

```
Saved Prompt 3381323161097207808 (GCS + local)
          ↓
Local requirements/ folder (weak, manually maintained)
          ↓
Sentinel Agents (requirement_mapper, gap_analyzer, etc.)
          ↓
BigQuery (write-only for audits + estimation_results)
```

**Problems:**
- No versioning of requirements.
- No functional point decomposition stored centrally.
- Estimator and Sentinel write to different datasets with limited linkage.
- No approval state machine.
- Zero "read from BigQuery first" behavior in agents.

### 2.2 Proposed Target State

```
Saved Prompt 3381323161097207808
          ↓
ctoteam.prompt_registry (Source of Truth)
    ├── prompt_baselines (SCD2)
    ├── functional_points
    ├── estimation_results_link
    └── approval_workflow
          ↓
AI Estimator (reads baseline + function points)
          ↓
Budget Approval Gate
          ↓
Coder Execution
          ↓
Sentinel Audit (reads baselines + function points + prior estimations)
          ↓
delivery_coverage + audit findings (written back to BigQuery)
```

This creates a closed, auditable, versioned loop.

### 2.3 Assessment of Proposed Design

**Strengths:**
- SCD Type 2 on `prompt_baselines` is the right choice for requirements evolution.
- Separation of `functional_points` from baselines is clean.
- `approval_workflow` table enables the budget → coding trigger the user wants.
- Linking everything via `prompt_id` + `audit_run_id` is correct.

**Risks / Gaps in the Proposal:**

1. **No `prompt_content` or `raw_prompt` storage**  
   The original prompt text (system + user) should be stored or referenced. Currently the design only stores decomposed requirements. This loses fidelity for re-estimation or re-auditing.

2. **estimation_results_link table is under-specified**  
   The proposal mentions it but gives no schema. We already have `agent_telemetry.estimation_results` with the full markdown. We need a clean linkage table instead of duplicating data.

3. **delivery_coverage table design is too narrow**  
   It only links to `requirement_id`. It should also support functional point level coverage and estimation vs actual variance.

4. **Missing "source" and "provenance" fields**  
   Every baseline and functional point should record where it came from (GCS run ID, manual entry, AI-generated, etc.) for auditability.

5. **No integration strategy for the existing AI Estimator**  
   The estimator in `coder/agents/agent_ai_estimator.py` currently writes to `agent_telemetry.estimation_results`. The new layer must either:
   - Adopt that table, or
   - Create a clean handoff.

6. **SCD2 implementation complexity**  
   The `prompt_baseline_loader.py` must correctly handle `valid_from` / `valid_to` / `is_current`. This is non-trivial and error-prone if not done carefully.

---

## 3. Recommended Refined Table Schemas

### prompt_baselines (improved)

Add these fields to the user's proposal:

- `source_type` STRING (GCS, MANUAL, AI_GENERATED)
- `source_reference` STRING (GCS path or run_id)
- `raw_prompt_excerpt` STRING (optional, first 10k chars for traceability)
- `parent_baseline_uuid` STRING (for lineage when requirements evolve)

### functional_points (improved)

Add:
- `baseline_uuid` STRING (strong link back to the requirement version)
- `estimation_confidence` FLOAT64
- `model_used_for_estimation` STRING

### estimation_results_link (new recommendation)

Instead of a vague table, create a clean linkage:

```sql
CREATE TABLE ctoteam.prompt_registry.estimation_results_link (
  link_uuid STRING,
  prompt_id STRING,
  baseline_uuid STRING,
  estimation_run_id STRING,           -- from agent_telemetry.estimation_results
  total_tokens INT64,
  complexity_grade STRING,
  created_at TIMESTAMP
)
```

This avoids duplicating the large `estimation_markdown` while still giving full traceability.

### approval_workflow (good as proposed)

Consider adding:
- `linked_audit_run_id` STRING (the Sentinel audit that was reviewed for approval)
- `rejection_reason` STRING

### delivery_coverage (improved)

Expand to support multiple granularity levels:

- `granularity` STRING ('requirement' | 'functional_point')
- `granularity_id` STRING (either requirement_id or fp_uuid)

---

## 4. Phased Implementation Plan (Recommended Order)

### Phase 0 – Foundation (1-2 days)
- Create `ctoteam.prompt_registry` dataset
- Create the four core tables with the refined schemas above
- Add `prompt_id` column to existing `prism_sentinel_audit.audit_runs` (already done)
- Create simple views for "current" baselines and function points

### Phase 1 – Loader Layer (2-3 days)
- `agents/prompt_baseline_loader.py`
  - Accepts `--prompt-id`
  - Queries BigQuery first
  - Falls back to local `requirements/` only if nothing found
  - Returns normalized list of requirements with `baseline_uuid`
- Update `requirement_mapper.py` to use the loader when `--prompt-id` is provided

### Phase 2 – Function Point Layer (2-3 days)
- `agents/function_point_mapper.py`
  - Takes requirements + (optional) AI estimation output
  - Produces structured function points
  - Writes to `functional_points` table
  - Generates the two MD/JSON artifacts the user wants

### Phase 3 – Coverage & Approval Layer (2-3 days)
- `agents/coverage_calculator.py`
- `agents/approval_gate.py`
- Wire them into a new orchestrator:
  `./scripts/run_requirement_intelligence.sh --prompt-id 3381323161097207808`

### Phase 4 – AI Estimator Alignment (1-2 days)
- Review and lightly refactor `coder/agents/agent_ai_estimator.py` to:
  - Read function points from the new registry when available
  - Write linkage records to `estimation_results_link`
- Produce `reports/ai_estimator_validation.md` as requested

### Phase 5 – Migration / Backfill (1 day)
- One-time script to take the existing requirements_baseline.md + functional_point_mapping.md for prompt 3381323161097207808 and load them into the new BigQuery tables as version 1.

---

## 5. Risks & Mitigations

- **Risk:** SCD2 logic is implemented incorrectly → history becomes unreliable.  
  **Mitigation:** Implement a small test harness + clear `is_current` maintenance rules.

- **Risk:** The AI Estimator and new registry diverge on functional point definitions.  
  **Mitigation:** Treat the registry as the definition of truth. Update the estimator to consume it.

- **Risk:** Performance – querying baselines every time becomes slow.  
  **Mitigation:** Add materialized views or a small in-memory cache in the loaders for the "current" version.

---

## 6. Success Criteria (for prompt 3381323161097207808)

After this layer is built, running:

```bash
./scripts/run_requirement_intelligence.sh --prompt-id 3381323161097207808
```

Should produce:

- requirements_baseline.md (sourced from BigQuery)
- functional_point_mapping.md (sourced from BigQuery)
- coverage_report.md
- approval_recommendation.md
- ai_estimator_validation.md

And all artifacts + metadata must be queryable from `ctoteam.prompt_registry.*` and linked to the existing `prism_sentinel_audit` and `agent_telemetry` data.

---

## 7. Recommendation to User

Do **not** ask for more audit agents or reports right now.

Build **Phase 0 + Phase 1** first. Once requirements can be loaded from BigQuery for this specific prompt ID, re-run the existing Sentinel audit. The score will jump from 0.0 to something meaningful, proving the value of the Requirement Intelligence Layer.

Only after that foundation is solid should you expand into full function point mapping, approval gates, and estimator validation.

This is the correct order of operations for long-term governance of Prompt 3381323161097207808 and future prompts.

---

**End of Architecture Review + Implementation Plan**
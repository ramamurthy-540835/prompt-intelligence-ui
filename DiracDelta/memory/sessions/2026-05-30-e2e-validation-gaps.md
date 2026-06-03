# End-to-End Validation + Critical Gaps Analysis
**Date:** 2026-05-30
**Prompt ID:** 3381323161097207808
**Audit Run ID:** 60e0ae9c-6e48-4d7a-bda8-3e4c9a5ac06d
**Target:** ../coder

## Executive Summary

The plumbing now works end-to-end:

- `--prompt-id` + `--write-bq` executed successfully.
- All reports generated, uploaded to GCS, and loaded into `ctoteam.prism_sentinel_audit.*` tables.
- `prompt_id` is correctly stored and queryable.

**However**, the audit produced:
- `overall_score = 0.0`
- `overall_status = CRITICAL_ISSUES`

This is **not** a code quality problem in the traditional sense. It is a **data quality / source of truth problem**.

---

## What the BigQuery Data Actually Shows

### audit_findings (top issues)
- 15+ **Forbidden Model Policy** (critical) — mostly historical data from `saved_prompts/` and backups in the coder project.
- Multiple **Secret Leak Prevention** flags.
- **Missing Implementation** for the few requirements that were loaded (REQ-001).

### requirement_traceability
Only **1 requirement** was loaded: `REQ-001` → status = "Missing".

This happened because the local `requirements/prompt_3381323161097207808.md` only contained 3 very high-level dummy requirements.

---

## Root Cause Analysis

The current Sentinel flow is:

```
Local requirements/ folder
       ↓
Requirement Mapper
       ↓
Gap Analyzer + Traceability
       ↓
BigQuery (write only)
```

**BigQuery is not the source of truth for requirements.**

We have excellent storage and write paths, but almost no read paths from BigQuery for the actual requirement baseline or function points.

This is exactly the gap documented in the earlier architecture document.

---

## Identified Gaps (Ranked by Severity)

| # | Gap | Impact | Location |
|---|-----|--------|----------|
| 1 | No BigQuery-backed requirements loader | Causes 0.0 scores even when real requirements exist in the original prompt | `agents/requirement_mapper.py` |
| 2 | No `prompt_registry` dataset / tables | No place to store canonical requirements + function points per prompt_id | BigQuery |
| 3 | AI Estimator results are in a separate dataset (`agent_telemetry`) | Fragmented data — hard to correlate estimation → audit → approval | BigQuery schema |
| 4 | No approval / budget workflow tables | Cannot close the loop from estimation → approval → improved code | Missing entirely |
| 5 | Local `saved_prompts/` and GCS still treated as primary source for prompt content | Violates "BigQuery as source of truth" principle | Multiple places |
| 6 | No mechanism to hydrate the original prompt 3381323161097207808 into structured BQ tables | We keep re-using weak local markdown files | Missing |

---

## Recommended Next Build (Immediate Priority)

**Phase 0 (Foundation):**

1. Create dataset:
   ```sql
   CREATE SCHEMA IF NOT EXISTS `ctoteam.prompt_registry`
   OPTIONS (description="Canonical requirements and function points for all saved prompts");
   ```

2. Create core tables:
   - `ctoteam.prompt_registry.prompt_baselines`
   - `ctoteam.prompt_registry.function_points`
   - `ctoteam.prompt_registry.estimation_approvals` (optional but recommended)

3. Build:
   - `agents/prompt_baseline_loader.py` — loads structured requirements for a `--prompt-id` from BigQuery (with local fallback).
   - `agents/function_point_loader.py`

4. Update `requirement_mapper.py` (and the orchestrator) to accept `--prompt-id` and prefer BigQuery data.

Once this is done, re-running the same command against prompt 3381323161097207808 should produce a meaningful coverage % instead of 0.0.

---

## Related Memory

- `2026-05-30-bigquery-source-of-truth-workflow.md` — Original architecture vision
- `2026-05-30-ai-estimator-deep-dive-flush.md` — Deep work on the estimator + BigQuery persistence
- `2026-05-30-prompt-id-support.md` — Addition of `--prompt-id` flag

---

**Status:** The audit execution pipeline is now solid. The next bottleneck is feeding it real requirements from BigQuery instead of weak local files.
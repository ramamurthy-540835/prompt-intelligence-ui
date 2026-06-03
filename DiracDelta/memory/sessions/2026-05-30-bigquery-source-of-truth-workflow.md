# BigQuery as Source of Truth — Recommended Workflow for Prompt 3381323161097207808

**Date:** 2026-05-30
**Project:** PRISM Sentinel
**Goal:** Make BigQuery the single authoritative source for requirements, estimations, audits, and approval state for the original Saved Prompt.

---

## 1. Vision

For the specific Saved Prompt **3381323161097207808**, the following should live primarily in BigQuery:

- Original requirements baseline (structured)
- Functional point mapping
- AI Estimator results (full markdown + token usage + complexity grade)
- All Sentinel audit runs (traceability, gaps, quality scores)
- Approval / budget decision state
- Links to generated code artifacts (in `coder`)

Local files and GCS should be treated as **caches / working copies**, not the source of truth.

---

## 2. Current Recommended Command (as of today)

```bash
cd /home/appadmin/projects/Ram_Projects/DiracDelta/sentinel

./scripts/run_sentinel_all.sh \
  ../coder \
  --prompt-id 3381323161097207808 \
  --write-bq
```

This is currently the cleanest way to run a full audit while linking it to the original prompt.

---

## 3. Current Gaps (BigQuery is not yet the Source of Truth)

After analysis of the Sentinel codebase and supporting tools:

| Area | Current Reality | Gap |
|------|------------------|-----|
| **Requirements Loading** | `requirement_mapper.py` only reads from local `requirements/` folder | No code reads structured requirements from BigQuery |
| **Original Prompt Content** | Stored in GCS (`gs://agentproject/saved-prompts/...`) and local `saved_prompts/` | No canonical copy of the full prompt text in BigQuery |
| **AI Estimator Results** | Estimator writes to `agent_telemetry.estimation_results` | Sentinel audit tools do not consume this data |
| **Audit Results** | Writes to `prism_sentinel_audit.*` tables when `--write-bq` | No mechanism to *read* previous audits from BigQuery as input |
| **Approval Workflow** | Nothing exists yet | No tables/fields for "approved", "budget_approved", "approved_by", etc. |
| **Traceability** | Prompt ID is now recorded in `audit_runs` (after recent changes) | Requirements themselves are not versioned or stored in BQ |

**Biggest architectural gap:** Sentinel is currently a **write-mostly** tool to BigQuery. It has almost no **read-from-BigQuery** capability for requirements or prior context.

---

## 4. Target Architecture (Recommended Future State)

```
BigQuery (Source of Truth)
├── prism_sentinel_audit
│   ├── audit_runs                  ← includes prompt_id
│   ├── audit_findings
│   ├── requirement_traceability
│   └── audit_artifacts
├── agent_telemetry
│   ├── estimation_results          ← full markdown + tokens
│   └── token_usage
└── prompt_registry                 ← NEW (recommended)
    └── prompt_baselines            ← structured requirements + functional points for each prompt_id
```

When running an audit:
1. Sentinel first queries BigQuery for the requirements baseline for the given `--prompt-id`.
2. Falls back to local files only if nothing exists in BQ.
3. Writes all results back to BigQuery with the `prompt_id` linkage.
4. AI Estimator results are also queryable from the same system.

---

## 5. Immediate Next Steps (Prioritized)

1. **Create `prompt_baselines` table** in BigQuery to store structured requirements per `prompt_id`.
2. **Enhance `requirement_mapper.py`** to accept `--prompt-id` and first try to load from BigQuery.
3. **Add an "Approval" table** (or columns) to track budget/approval state linked to `audit_run_id` + `prompt_id`.
4. **Update the AI Estimator** (in coder) and Sentinel to share the same `estimation_results` table as the source of truth.
5. **Add a "hydrate" script** that can pull the original prompt content from GCS and store a canonical version in BigQuery.

---

## 6. Related Memory Files

- `2026-05-30-ai-estimator-deep-dive-flush.md` — Deep technical improvements to the AI Estimator
- `2026-05-30-prompt-id-support.md` — Addition of `--prompt-id` flag to Sentinel scripts
- `2026-05-30-coder-audit-flush.md` — Earlier full audit run against the coder project

---

*This document defines the long-term direction: BigQuery must become the authoritative source for everything related to prompt 3381323161097207808 and its derived audits.*
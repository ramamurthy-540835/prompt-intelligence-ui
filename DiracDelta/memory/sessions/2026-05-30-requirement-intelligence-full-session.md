# Requirement Intelligence Layer - Full Session Summary & Next Scope

**Date:** 2026-05-30  
**Prompt ID:** 3381323161097207808  
**Goal:** Make BigQuery the true source of truth for requirements, scope, estimation, and audit for this prompt.

---

## What Was Built in This Session

### 1. BQML Requirement Scope Extraction Layer
- Created dataset: `ctoteam.prism_requirement_intelligence`
- Created 4 tables:
  - `raw_prompt_lines`
  - `requirement_candidates`
  - `functional_scope`
  - `estimation_input_package`
- Built `agents/bqml_requirement_scope.py` (robust Python + BigQuery classification)
- Built `scripts/run_requirement_scope_extraction.sh`

**Result from running it:**
- Dramatically reduced noise
- Produced clean `requirement_scope_clean.md` + `.json`
- 103 high-quality candidate requirements (instead of ~350 noisy items)

### 2. Integration with Scientific Estimator
- Updated `agents/ai_development_estimator.py` to:
  - Prefer `requirement_scope_clean.md` when it exists (the new source of truth)
  - Fall back gracefully with a warning
- Updated `scripts/run_ai_development_estimator.sh` to support `--write-bq`

**Result:**
- When the clean scope is available, the estimator now produces a much more trustworthy (and significantly lower) cost estimate.
- Full end-to-end flow now works:
  ```bash
  ./scripts/run_requirement_scope_extraction.sh 3381323161097207808
  ./scripts/run_ai_development_estimator.sh 3381323161097207808 ../coder --write-bq
  ```

### 3. BigQuery Persistence
- Created dedicated dataset `ctoteam.prism_sentinel_estimation`
- Table `ai_development_estimates` now receives full estimation results (including `raw_json`) when `--write-bq` is used.

---

## Current Recommended End-to-End Flow (for 3381323161097207808)

```bash
# 1. Clean the scope using BigQuery + deterministic rules
./scripts/run_requirement_scope_extraction.sh 3381323161097207808

# 2. Run scientific estimation using the clean scope + persist to BigQuery
./scripts/run_ai_development_estimator.sh 3381323161097207808 ../coder --write-bq
```

This is currently the cleanest, most trustworthy way to get a scientific Gemini 3.5 Flash development estimate for this prompt.

---

## Bigger Picture & Next Scope

The work in this session directly supports the larger vision discussed previously:

### Target Long-Term Architecture
```
Saved Prompt (Vertex AI)
        ↓
Prompt Registry (BigQuery)          ← New foundation
        ├── prompt_baselines (SCD2)
        ├── functional_points
        └── estimation_results_link
        ↓
Requirement Intelligence Layer      ← What we started building
        ↓
AI Estimator (Gemini 3.5 Flash only)
        ↓
Budget / Approval Gate
        ↓
Coder Execution
        ↓
Sentinel Audit + Coverage
        ↓
Back to BigQuery (single source of truth)
```

### Remaining High-Priority Items (from previous architecture review)

1. **Create proper `prompt_registry` dataset + tables** (especially `prompt_baselines` with SCD2 and `functional_points`)
2. Build `agents/prompt_baseline_loader.py` and `function_point_mapper.py`
3. Make Sentinel's `requirement_mapper.py` load from BigQuery first when `--prompt-id` is supplied
4. Create the SQL file `sql/requirement_intelligence/create_tables.sql` (for the registry tables)
5. Add approval workflow tables and logic
6. Full integration so the AI Estimator can consume function points from the registry

---

## Key Principle Reinforced

> Do not ask Gemini to understand the whole noisy prompt.  
> Use BigQuery + classification to clean and structure the scope first.  
> Then use Gemini 3.5 Flash only for the final estimation reasoning.

This is the correct scientific approach.

---

## Related Memory Files

- `2026-05-30-estimator-scientific-validity-analysis.md` — Detailed critique of the old noisy estimation
- `2026-05-30-bigquery-source-of-truth-workflow.md` — Original target architecture
- `2026-05-30-requirement-intelligence-layer-architecture-review.md` — Full architecture review + phased plan

---

*This document captures the current state and the path forward for the Requirement Intelligence Layer as of the end of this session.*
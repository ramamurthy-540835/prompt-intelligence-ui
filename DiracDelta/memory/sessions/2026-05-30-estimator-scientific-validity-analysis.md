# Scientific Validity Analysis of the Current AI Development Estimator
**Prompt ID:** 3381323161097207808
**Date:** 2026-05-30
**Purpose:** Evaluate whether the current estimator produces scientifically valid results

## Executive Summary

The current `ai_development_estimator.py` is **not** producing a scientifically valid estimation for this prompt.

### Core Problem
It is counting **noise, logs, commands, errors, UUIDs, SQL statements, and execution traces** as "requirements."

This leads to massively inflated and meaningless numbers:
- 350 "requirements"
- 1,339 Functional Points
- ~4.47 million estimated tokens
- $1.98 estimated cost

These numbers measure the size of a noisy document, not the actual software scope.

---

## Evidence from the Current Run

The estimator extracted 350 items as requirements. Here are real examples of what it classified as requirements:

### Noise Treated as Requirements (Real Examples)
- `REQ-005`: `*Run ID:** 97836b18-6f39-43ba-b234-c3740a866a8d`
- `REQ-025`: `# 1. Try standard print-access-token`
- `REQ-094`: `--------------------------------------------------------------------`
- `REQ-106`: `Error: TypeError: Object of type datetime is not JSON serializable`
- `REQ-220`: `Chunks registered: 24`
- `REQ-321`: `SUCCESS: Fetched raw prompt dataset`

These are:
- Execution traces
- Log lines
- Error messages
- Markdown formatting / separators
- Shell commands
- Debug output
- UUIDs and Run IDs

They are **not** requirements.

---

## Root Causes Identified

### 1. Wrong Primary Data Source
Current behavior:
```
Local file: ../coder/saved_prompts/3381323161097207808/assembled_requirements.md
```

This is a **stale, processed, noisy extraction** created during earlier development.

Correct source (as defined in the original prompt and your architecture vision):
```
Vertex AI Saved Prompt
  └── runs/ca90a363-b1d1-483e-ac98-64c811384648/
       ├── final_assembled.md   ← Latest authoritative version
       ├── system.md
       ├── raw.json
       └── extraction_report.json
```

### 2. No Noise Filtering / Requirement Hygiene
The extraction logic (`extract_atomic_requirements`) has no meaningful filtering. It treats almost any bullet point or line that looks like a sentence as a requirement.

### 3. No Concept of "True Requirements" vs "Artifacts"
The prompt itself defines clear categories of content (System Instructions, User Instructions, Acceptance Criteria, Architecture, etc.). The current estimator ignores this structure.

### 4. Functional Point Math on Garbage In = Garbage Out
Once you feed it 350 mixed items (real requirements + noise), the downstream FP calculation and token estimation become scientifically invalid, no matter how sophisticated the multipliers are.

---

## Correct Scientific Pipeline (What Should Happen)

```
Vertex Saved Prompt 3381323161097207808
          ↓
Fetch Latest Version (GCS run ca90a363-...)
          ↓
Parse Structured Sections
    - System Instructions
    - User Prompt / Requirements
    - Acceptance Criteria
    - Architecture Guidance
    - Feature Lists
    - Non-Functional Requirements
          ↓
Noise Removal Pass
    - Remove all log lines, commands, errors, UUIDs, separators, SQL/shell examples, execution traces
          ↓
Requirement Classification (Functional / Non-Functional / Security / Data / etc.)
          ↓
Functional Point Analysis (only on real requirements)
          ↓
Gemini 3.5 Flash Token & Cost Estimation (with proper multipliers)
          ↓
Optimization Recommendations
          ↓
Validation against actual delivered scope in coder
```

---

## Recommended Immediate Next Steps

1. **Modify the estimator** to:
   - Prioritize fetching from the latest GCS run (`runs/ca90a363-.../final_assembled.md` and `system.md`).
   - Implement a strong noise-filtering / requirement extraction pass.
   - Only treat properly structured requirement statements as input.

2. **Create a small validation artifact** comparing:
   - Old estimate (350 reqs / 1339 FP / $1.98)
   - New estimate after proper cleaning (expected: dramatically lower and more realistic)

3. **Consider adding** a `requirement_inventory.json` and `feature_map.json` as intermediate clean artifacts (as you outlined).

---

## Conclusion

The current estimator is useful as a **document size estimator**, but it is not yet a **scientific software scope estimator**.

Until we fix the input quality (real requirements only, from the latest authoritative Vertex version, with aggressive noise removal), all downstream numbers remain scientifically questionable.

This is the core issue that needs to be addressed before trusting any cost or effort predictions for Prompt 3381323161097207808.

---
*Document created to capture the scientific validity analysis of the current estimator.*
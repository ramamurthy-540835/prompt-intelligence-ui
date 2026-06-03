# Session Summary: Next.js UI + Validation Strategy for Prompt 3381323161097207808

**Date:** 2026-05-30

## What the User Requested

The user wants to:

1. Build a **Next.js UI** to handle the full workflow around Prompt ID 3381323161097207808 (Requirement Intelligence Layer + Scientific AI Development Estimator).

2. Continue saving session summaries in MD files for easy reading and confirmation.

3. Get concrete suggestions on how to **validate the work against the original source** — specifically the live Vertex AI Studio Saved Prompt page:
   https://console.cloud.google.com/agent-platform/studio/saved-prompts/locations/us-central1/3381323161097207808

## Current State (as of this session)

- We have a working Scientific AI Development Estimator (`ai_development_estimator.py`) that now correctly prefers clean scope from the BQML Requirement Intelligence Layer.
- We have the BQML Requirement Scope Extraction (`bqml_requirement_scope.py`) that dramatically reduces noise.
- BigQuery is being used for persistence (`prism_sentinel_estimation`, `prism_requirement_intelligence`).
- The flow is becoming more scientific and BigQuery-centric.

## Proposed Next.js UI Direction

### Recommended Location
Create a new Next.js app at the same level as the existing projects:

`/home/appadmin/projects/Ram_Projects/DiracDelta/prompt-intelligence-ui` (or `prism-ui`)

This keeps the monorepo-style structure clean:
- `sentinel/` → Core Python agents + CLI tools
- `coder/` → The actual developed agent
- `prompt-intelligence-ui/` → Next.js frontend (new)

### High-Level UI Features Suggested

- **Prompt Explorer**
  - View the latest version of prompt 3381323161097207808 (fetched live from GCS / Vertex)
  - Show clean vs noisy versions side-by-side

- **Requirement Intelligence Dashboard**
  - View `functional_scope` and `requirement_candidates` from BigQuery
  - Filter by category, noise_type, complexity

- **Scientific Estimator Runner**
  - Trigger `./scripts/run_ai_development_estimator.sh` with `--write-bq`
  - Display historical estimations with UUIDs and cost trends

- **Comparison View**
  - Old noisy estimate vs new clean estimate (token savings, FP reduction)
  - Actual code in `../coder` vs estimated scope

- **Validation Tools**
  - Direct link to the Vertex AI Studio page
  - Ability to trigger a fresh pull of the latest prompt version from GCS
  - Show diff between local cached version and latest GCS version

### Tech Suggestions for the Next.js App

- **App Router** + TypeScript
- **Tailwind** + shadcn/ui or Mantine for quick beautiful UI
- **TanStack Query** for data fetching
- **Server Actions** or tRPC for calling the Python scripts securely
- **BigQuery client** (via `@google-cloud/bigquery` on the server)
- Simple auth (for now just project-level or service account)

A minimal first version could be:
- A dashboard showing the latest estimation for 3381323161097207808
- Ability to re-run the scope extraction + estimator
- Tables for requirements and noise classification

---

## How to Validate Against the Real Source (Vertex AI Studio)

The link you shared points to the live Saved Prompt in Vertex AI Agent Studio.

### Recommended Validation Approach

1. **Ground Truth Source**
   - The authoritative version is always the **latest run** in GCS:
     `gs://agentproject/saved-prompts/3381323161097207808/runs/<latest-run-id>/final_assembled.md`

2. **Validation Checklist for the Estimator**

   - Does `requirement_scope_clean.md` contain only real requirements (no logs, commands, errors, UUIDs, separators)?
   - Do the extracted requirements map reasonably to actual files in `../coder/agents/` and `../coder/scripts/`?
   - Is the functional point count in a believable range (probably 30–80 for this prompt, not 1300)?
   - When you re-run the scope extraction after a new version of the prompt is saved in Vertex, does the count and content update correctly?
   - Can you see the `estimation_run_uuid` and `prompt_id` correctly stored in BigQuery?

3. **Practical Validation Steps**

   - Manually open the Vertex Studio link and compare the latest version with what your local `final_assembled.md` or `requirement_scope_clean.md` contains.
   - After any change to the prompt in Vertex AI Studio, re-run the scope extraction and estimator, then compare the new estimation numbers.
   - Use the BigQuery tables (`prism_requirement_intelligence.*` and `prism_sentinel_estimation.*`) as the audit trail.

---

## Easy Startup Scripts (Added This Session)

To quickly run the full frontend + have easy access to the Python backend tools, two scripts were created at the `DiracDelta` root:

### `start-dev.sh`
```bash
cd /home/appadmin/projects/Ram_Projects/DiracDelta
./start-dev.sh
```

This script will:
- Start the Next.js frontend (`prompt-intelligence-ui`) on http://localhost:3000
- Print all the important Python commands you need (scope extraction, estimator, full Sentinel audit, etc.)
- Show useful paths

### `stop-dev.sh`
```bash
./stop-dev.sh
```

Cleanly stops the development servers.

These two scripts make it very easy to spin up the full environment and share the experience with others.

---

## Immediate Recommended Next Actions

1. ✅ **Next.js UI app created** at `/home/appadmin/projects/Ram_Projects/DiracDelta/prompt-intelligence-ui`
2. Build a simple page that shows the latest estimation for 3381323161097207808 + ability to re-run the full pipeline (scope extraction + estimator).
3. Add a "Refresh from Vertex" button that pulls the latest `final_assembled.md` from GCS for validation.
4. Continue saving session summaries in this memory folder.

The Next.js app has been scaffolded with TypeScript, Tailwind, and some useful dependencies (`@google-cloud/bigquery`, `lucide-react`, `sonner` for toasts).

A basic dashboard page was created at `app/page.tsx` with:
- Prompt ID display
- Action buttons (Run Pipeline, Refresh from Vertex)
- Current status overview
- Direct link to the Vertex AI Studio page you shared

---

*This document captures the request to add a Next.js UI layer and the validation strategy against the live Vertex AI Studio prompt.*
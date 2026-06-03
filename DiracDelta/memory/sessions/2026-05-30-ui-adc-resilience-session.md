# Session: UI ADC Resilience & Full Dashboard Hardening
**Date:** 2026-05-30  
**Focus:** Prompt Intelligence UI – Making the entire dashboard resilient to missing GCP credentials

## Problem
The Next.js dashboard would break (NaN values, empty tabs, cryptic errors) when the Next.js server did not have valid GCP Application Default Credentials.

The "Report" and "Audit" tabs were pure placeholders with no useful guidance.

Pipeline action buttons (`run-pipeline`) had no awareness of the auth state.

## Solution Implemented: ADC Auto-Detection + Graceful Degradation

### 1. Fetch API (`app/api/fetch-estimation/route.ts`)
- Explicit ADC path check: `/home/appadmin/.config/gcloud/application_default_credentials.json`
- If the file exists → uses it via `keyFilename`.
- On any BigQuery auth/query failure → sets `authError` and returns safe fallback mock data (realistic numbers for the prompt 3381323161097207808).
- Always returns `authError` field so the UI can react.

### 2. Run-Pipeline API (`app/api/run-pipeline/route.ts`)
- Now also detects the same ADC file.
- Injects `GOOGLE_APPLICATION_CREDENTIALS` into the child process environment when present.
- Returns `authWarning` in both success and error responses so the UI can surface context.
- This makes the "Refresh from Vertex" and "Run AI Estimation" buttons part of the same resilience story.

### 3. Dashboard UI (`app/page.tsx`)
- Prominent amber **GCP Credentials Required** banner (with `ShieldAlert` icon) that appears at the top whenever `authError` is truthy.
- Shows the exact one-command fix:
  ```bash
  gcloud auth application-default login --no-launch-browser
  ```
- **Audit tab**: Now shows a helpful amber message instead of an empty "no events" state when unauthenticated.
- **Report tab**: Improved messaging. Uses fallback estimation data when available and gives clear next-step guidance (especially when auth is missing).
- Safe `sizeDisplay` logic preserved (no NaN).

## Files Changed
- `prompt-intelligence-ui/app/api/fetch-estimation/route.ts`
- `prompt-intelligence-ui/app/api/run-pipeline/route.ts`
- `prompt-intelligence-ui/app/page.tsx`

## Behavior After This Change
- Dashboard is **never broken** — it always renders something useful.
- When the user is not authenticated → clear actionable banner + degraded but usable data.
- Once the user runs the ADC login command and restarts the Next.js server → full live BigQuery data flows through automatically (no code changes needed).

## Commands to Activate Full Power
```bash
# In the VM where the Next.js server runs
gcloud auth application-default login --no-launch-browser

# Then restart the UI
cd /home/appadmin/projects/Ram_Projects/DiracDelta
./stop-dev.sh && ./start-dev.sh
```

## Session Outcome
The Prompt Intelligence UI is now production-resilient for the common case where developers have not yet run `application-default login` on the machine running the dashboard.

This completes the "make the whole experience work even when auth is missing" requirement.

---
*Memory note created 2026-05-30 per user request to document the ADC resilience session.*
# Session: Dynamic Prompt Selection Dashboard - Full UI Overhaul
**Date:** 2026-05-30  
**Focus:** Prompt Intelligence UI (Next.js)  
**Goal:** Eliminate all hardcoded values and make the dashboard fully dynamic across multiple saved prompts.

---

## Problems Reported & Addressed

The dashboard had several critical usability and correctness issues:

1. **Hardcoded Prompt ID** — Everything was locked to `3381323161097207808`. No way to switch prompts.
2. **NaN KB Size Display Bug** — `raw_size_bytes` sometimes caused `(NaN).toFixed` crashes or ugly output.
3. **Non-functioning Pipeline Buttons** — "Refresh from Vertex" and "Run AI Estimation" did not respect any selected prompt and used stale paths.
4. **Unpopulated / Static Tabs** — Audit trail and Scientific Estimation tabs remained empty or showed placeholder data regardless of context.
5. **No Prompt Switching** — User could not explore other saved prompts in the lakehouse.

---

## Solution Implemented: Fully Dynamic React + BigQuery Dashboard

We performed a targeted three-file overwrite to turn the UI into a proper multi-prompt governance tool.

### Step 1: Dynamic Fetch API (`app/api/fetch-estimation/route.ts`)

- Added query parameter support: `?promptUid=...`
- New query that pulls **all distinct `prompt_uid`** from `ctoteam.prism_prompt_catalog.prompt_versions` to power the dropdown.
- Switched to **parameterized BigQuery queries** (`@prompt_uid`, `@prompt_id`) for security and correctness.
- Proper fallback logic when no prompt is selected.
- Returns `availablePrompts`, `activeUid`, and all related metrics/events/estimation in one response.

### Step 2: Dynamic Pipeline Executor (`app/api/run-pipeline/route.ts`)

- Now accepts `promptId` in the POST body.
- Validates that `promptId` is present.
- Passes the selected prompt ID to the underlying shell scripts (`extract_store_prompt.sh` and `run_ai_development_estimator.sh`).
- Returns full stdout/stderr for live logging in the UI.

### Step 3: Fully Interactive Dashboard (`app/page.tsx`)

Major enhancements:
- Large, styled `<select>` dropdown at the top of the header showing all available `prompt_uid` values.
- `selectedUid` React state + URL-driven data fetching.
- 15-second live polling scoped to the currently selected prompt.
- Safe number handling: `sizeDisplay` guard prevents NaN on `raw_size_bytes`.
- All action buttons now compute `sourcePromptId = selectedUid.split(':').pop()` and send it to the backend.
- Vertex AI Studio link is also dynamic based on the selected prompt.
- Audit and Report tabs now correctly reflect data for whatever prompt is chosen.
- Improved loading states and user feedback in the execution log panel.

---

## Files Changed

| File | Change Type | Purpose |
|------|-------------|---------|
| `prompt-intelligence-ui/app/api/fetch-estimation/route.ts` | Full overwrite | Dynamic prompt list + parameterized queries |
| `prompt-intelligence-ui/app/api/run-pipeline/route.ts` | Full overwrite | Accept and forward `promptId` |
| `prompt-intelligence-ui/app/page.tsx` | Full overwrite | Prompt dropdown, safe metrics, dynamic actions & tabs |

All changes were made inside the real project directory:
`/home/appadmin/projects/Ram_Projects/DiracDelta/prompt-intelligence-ui/`

---

## How to Use After Restart

```bash
cd /home/appadmin/projects/Ram_Projects/DiracDelta
./stop-dev.sh
./start-dev.sh
```

Open the **Network** URL shown in the banner.

You will immediately see:
- A prominent dropdown listing every prompt UID present in the BigQuery prompt catalog.
- Selecting any prompt refreshes all cards, the audit trail, and estimation data.
- Buttons now operate on the prompt you have currently selected.

---

## Technical Highlights

- **Security**: All BigQuery access now uses named parameters instead of string interpolation.
- **Resilience**: Multiple safe fallbacks (default UID, NaN guards, empty state messages).
- **UX**: The dropdown is deliberately large and prominent because prompt selection is now the primary context for the entire dashboard.
- **Observability**: Full subprocess stdout/stderr is streamed back into the "Live Execution Output" panel.

---

## Current State & Future Opportunities

**Current Limitations (as of this session):**
- Pipeline execution still routes through the legacy `gcloud_run/` scripts (as specified in the provided code).
- The `prompt-intelligence-ui/` directory itself was still untracked in git at the time of this session.
- No write-back of estimation results from the UI buttons into the new `prism_sentinel_estimation` tables (yet).

**Recommended Next Work:**
- Commit and push the entire `prompt-intelligence-ui/` directory (done in this session's git step).
- Consider switching the `run-pipeline` executor to call the cleaner `sentinel/scripts/` versions.
- Add a "Run Full Sentinel Audit" button that calls `run_sentinel_all.sh`.
- Surface the new scientific estimation JSON more beautifully (perhaps using the existing `scientific_estimation.md` reports).
- Add prompt search / filtering if the list of saved prompts grows large.

---

## Reproduction Commands

```bash
# Restart UI with new dynamic dashboard
cd /home/appadmin/projects/Ram_Projects/DiracDelta
./start-dev.sh

# Test the new fetch API directly (example)
curl "http://localhost:3000/api/fetch-estimation?promptUid=vertexai:3381323161097207808"
```

---

**Session Outcome:** The dashboard has been transformed from a single-prompt demo into a real multi-prompt Prompt Governance Lakehouse control surface.

---

*Memory note created 2026-05-30 following user request: "document this session as note in md file also push to git"*
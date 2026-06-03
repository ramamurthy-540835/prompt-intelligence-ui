# Sentinel Now Supports --prompt-id (for 3381323161097207808)

**Date:** 2026-05-30

## What Changed

The Sentinel audit scripts were updated to properly support running audits tied to a specific original Saved Prompt ID.

### New Capability

You can now run:

```bash
cd /home/appadmin/projects/Ram_Projects/DiracDelta/sentinel

./scripts/run_sentinel_all.sh \
  /home/appadmin/projects/Ram_Projects/DiracDelta/coder \
  --prompt-id 3381323161097207808 \
  --write-bq
```

This will:
- Run the full quality + gap + code quality + GCS + environment audit against the `coder` project.
- Record the `prompt_id` in BigQuery (in the `audit_runs` table).
- When `--write-bq` is used, the audit is explicitly linked back to the original prompt that defined the requirements.

## Scripts Updated

- `scripts/run_sentinel_all.sh`
  - Now accepts `--prompt-id <id>`
  - Passes it to the BigQuery writer
  - Shows the Prompt ID in the header output

- `scripts/write_audit_to_bigquery.sh`
  - Accepts optional 3rd argument for `PROMPT_ID`
  - Forwards it to the Python writer

- `agents/bigquery_audit_writer.py`
  - Now accepts `--prompt-id`
  - Stores it in the `audit_runs` table (as `prompt_id` column)

## BigQuery Impact

When you run with `--write-bq`, the `audit_runs` record will now contain the original `prompt_id`.

This enables future queries like:
- "Show me all audits that were performed against prompt 3381323161097207808"
- Better traceability between the original requirements and the actual delivered code in `coder`

### Schema Note

You may need to add the column once:

```sql
ALTER TABLE `ctoteam.prism_sentinel_audit.audit_runs`
ADD COLUMN IF NOT EXISTS prompt_id STRING;
```

## Recommended Way to Use for This Prompt

```bash
# Full audit + BigQuery persistence, linked to the original prompt
./scripts/run_sentinel_all.sh \
  ../coder \
  --prompt-id 3381323161097207808 \
  --write-bq
```

This is the cleanest way to audit the coder project while keeping the connection to the source requirements (Saved Prompt 3381323161097207808).

## Related Memory

- `2026-05-30-ai-estimator-deep-dive-flush.md` — Deep improvements to the AI Estimator itself
- `2026-05-30-coder-audit-flush.md` — Earlier general audit of the coder project

---
*This file captures the addition of `--prompt-id` support across the Sentinel tooling.*
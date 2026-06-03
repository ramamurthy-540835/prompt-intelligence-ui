# PHASE 1: UI Wiring Plan — Authoritative Data Sources
**Status:** Ready for Implementation  
**Blocking Issues:** None  
**Estimated Scope:** 8-12 hours  

---

## Overview

This phase wires the Prompt Intelligence Dashboard to live BigQuery + file-based data sources. No data inference, no derived values, no additional estimator runs — only connecting UI components to authoritative tables.

**Target:** Every dashboard field traceable back to BigQuery or local file system. Zero hardcoded placeholders remain.

---

## Part 1: BigQuery API Modifications

### 1.1 Extend `/api/fetch-estimation` Route

**File:** `prompt-intelligence-ui/app/api/fetch-estimation/route.ts`

**Current Queries:**
- ✅ prompt_versions (basic fields)
- ✅ ai_development_estimates (partial fields)
- ✅ prompt_events (lifecycle)

**Required Additions:**

```sql
-- 1. Enhanced prompt_versions query (add hash tracking)
SELECT 
  prompt_uid, source_prompt_id, version_number, run_id,
  extracted_hash, raw_hash,  -- NEW
  chunk_count, extracted_chars, user_message_count, model_message_count,
  raw_size_bytes, system_present,
  valid_from, status, repeat_mode
FROM `ctoteam.prism_prompt_catalog.prompt_versions`
WHERE prompt_uid = @prompt_uid AND is_current = TRUE
LIMIT 1

-- 2. Expanded ai_development_estimates query
SELECT 
  estimation_run_uuid, prompt_id,
  total_functional_points,
  complexity_band,
  estimated_input_tokens, estimated_output_tokens, estimated_total_tokens,
  estimated_total_cost_usd,
  model_used, source_file,
  created_at,
  raw_json  -- Contains full phase breakdown
FROM `ctoteam.prism_sentinel_estimation.ai_development_estimates`
WHERE prompt_id = @prompt_id
ORDER BY created_at DESC
LIMIT 1

-- 3. NEW: Audit runs (for overall score and status)
SELECT 
  audit_run_id, prompt_id,
  overall_score, overall_status,
  started_at, completed_at
FROM `ctoteam.prism_sentinel_audit.audit_runs`
WHERE prompt_id = @prompt_id
ORDER BY completed_at DESC
LIMIT 1

-- 4. NEW: Audit findings summary (count by severity)
SELECT 
  severity,
  COUNT(*) as count
FROM `ctoteam.prism_sentinel_audit.audit_findings`
WHERE audit_run_id = @audit_run_id
GROUP BY severity

-- 5. OPTIONAL: Requirement intelligence summary
SELECT 
  COUNT(*) as requirement_count
FROM `ctoteam.prism_requirement_intelligence.requirement_candidates`
WHERE prompt_id = @prompt_id

-- 6. NEW: List available prompts (for selector dropdown)
SELECT DISTINCT 
  prompt_uid
FROM `ctoteam.prism_prompt_catalog.prompt_versions`
WHERE is_current = TRUE
ORDER BY prompt_uid
```

**Response Shape:**
```typescript
{
  success: true,
  activeUid: string,
  availablePrompts: string[],
  latestVersion: {
    prompt_uid: string,
    source_prompt_id: string,
    version_number: number,
    run_id: string,
    extracted_hash: string,
    raw_hash: string,
    chunk_count: number,
    extracted_chars: number,
    user_message_count: number,
    model_message_count: number,
    raw_size_bytes: number,
    system_present: boolean,
    valid_from: string,
    status: string,
    repeat_mode: string
  },
  estimation: {
    estimation_run_uuid: string,
    prompt_id: string,
    total_functional_points: number,
    complexity_band: string,
    estimated_input_tokens: number,
    estimated_output_tokens: number,
    estimated_total_tokens: number,
    estimated_total_cost_usd: number,
    model_used: string,
    created_at: string,
    raw_json: string  // Full JSON for phase breakdown
  },
  audit: {
    audit_run_id: string,
    prompt_id: string,
    overall_score: number,
    overall_status: string,
    completed_at: string,
    findings_by_severity: {
      critical: number,
      major: number,
      minor: number,
      info: number
    }
  },
  requirementCount: number,
  events: Array<...>,
  authError: string | null,
  isFallback: boolean
}
```

### 1.2 Create `/api/fetch-audit-details` Route

**File:** `prompt-intelligence-ui/app/api/fetch-audit-details/route.ts` (NEW)

**Purpose:** Fetch paginated audit findings for Audit tab

**Query:**
```sql
SELECT 
  finding_id, audit_run_id, severity, category,
  file_path, line_number,
  finding_text, recommendation,
  owner_hint, created_at
FROM `ctoteam.prism_sentinel_audit.audit_findings`
WHERE audit_run_id = @audit_run_id
ORDER BY 
  CASE severity 
    WHEN 'critical' THEN 1
    WHEN 'major' THEN 2
    WHEN 'minor' THEN 3
    WHEN 'info' THEN 4
  END,
  created_at DESC
LIMIT @limit OFFSET @offset
```

**Response:**
```typescript
{
  success: boolean,
  findings: Array<{
    finding_id: string,
    severity: 'critical' | 'major' | 'minor' | 'info',
    category: string,
    file_path: string,
    line_number: number,
    finding_text: string,
    recommendation: string,
    owner_hint: string,
    created_at: string
  }>,
  total_count: number
}
```

### 1.3 Create `/api/fetch-report` Route

**File:** `prompt-intelligence-ui/app/api/fetch-report/route.ts` (NEW)

**Purpose:** Read markdown/JSON reports from local filesystem

**Logic:**
```
Input: prompt_id, report_type
  - report_type: 'requirement_scope' | 'scientific_estimation' | 'audit_evidence' | 'gap_analysis'

For report_type='requirement_scope':
  Try:
    1. /sentinel/reports/{prompt_id}/requirement_scope_clean.md
    2. Fall back to .json if .md unavailable
  
For report_type='scientific_estimation':
  Try:
    1. /sentinel/reports/{prompt_id}/scientific_estimation.md
    2. Fall back to .json

For report_type='audit_evidence':
  Try:
    1. /sentinel/reports/{prompt_id}/audit_evidence_package.md

For report_type='gap_analysis':
  Try:
    1. /sentinel/reports/{prompt_id}/gap_analysis.md
    2. Fall back to .json

Return: { success, content, format, error }
```

**Response:**
```typescript
{
  success: boolean,
  content: string,           // Markdown content
  format: 'markdown' | 'json',
  source_file: string,      // Path used
  error?: string
}
```

---

## Part 2: UI Component Modifications

### 2.1 Overview Tab

**File:** `prompt-intelligence-ui/app/page.tsx`

#### Metrics Grid (Replace hardcoded values)

**Current (Hardcoded):**
```
Active Version: Version 1
Structured Chunks: 0 Chunks
Confidence Rating: 85%
```

**New (from BigQuery):**
```typescript
// Version from prompt_versions.version_number
<div className="text-3xl font-black text-white">
  Version {data.latestVersion?.version_number || 'N/A'}
</div>

// Chunks from prompt_versions.chunk_count
<div className="text-3xl font-black text-white">
  {data.latestVersion?.chunk_count || '0'} Chunks
</div>

// Confidence score calculation (from raw_json)
const confidenceScore = useMemo(() => {
  if (!data.estimation?.raw_json) return 'N/A'
  try {
    const parsed = JSON.parse(data.estimation.raw_json)
    const {requirement_count} = parsed.functional_points || {}
    // TODO: Calculate (classified / total), placeholder for now
    return Math.round((requirement_count / 76) * 100) + '%' // 76 = sample denominator
  } catch {
    return 'N/A'
  }
}, [data.estimation?.raw_json])

<div className="text-3xl font-black text-indigo-400">
  {confidenceScore}
</div>
```

#### Prompt Requirements Analysis (NEW ROWS)

**Add to existing grid:**
```typescript
<div className="flex justify-between border-b border-slate-800 pb-2">
  <span className="text-slate-400 text-sm">Functional Points:</span>
  <span className="font-semibold text-sm text-indigo-300">
    {data.estimation?.total_functional_points || 'N/A'} FP
  </span>
</div>

<div className="flex justify-between border-b border-slate-800 pb-2">
  <span className="text-slate-400 text-sm">Complexity Band:</span>
  <span className="font-semibold text-sm">
    {data.estimation?.complexity_band || 'N/A'}
  </span>
</div>

<div className="flex justify-between border-b border-slate-800 pb-2">
  <span className="text-slate-400 text-sm">Extraction Hash (Clean):</span>
  <span className="font-mono text-xs text-slate-400 truncate">
    {data.latestVersion?.extracted_hash?.slice(0, 16)}...
  </span>
</div>

<div className="flex justify-between border-b border-slate-800 pb-2">
  <span className="text-slate-400 text-sm">Last Estimation Run:</span>
  <span className="font-mono text-xs text-slate-400">
    {new Date(data.estimation?.created_at).toLocaleString()}
  </span>
</div>
```

### 2.2 Token Estimator Panel (Right Column)

**Current (Hardcoded):**
```
Gemini 3.5 Flash Usage: 0 tokens
Estimated Development Hours: 54 hrs
```

**New (from BigQuery):**
```typescript
// Token display with breakdown
<div className="flex justify-between text-xs text-slate-400 mb-1">
  <span>Gemini 3.5 Flash — Total Tokens:</span>
  <span className="font-bold text-white">
    {data.estimation?.estimated_total_tokens?.toLocaleString() || 'N/A'}
  </span>
</div>

<div className="flex justify-between text-xs text-slate-400 mb-1">
  <span>Input Tokens:</span>
  <span className="text-slate-300 text-xs">
    {data.estimation?.estimated_input_tokens?.toLocaleString() || 'N/A'}
  </span>
</div>

<div className="flex justify-between text-xs text-slate-400 mb-1">
  <span>Output Tokens:</span>
  <span className="text-slate-300 text-xs">
    {data.estimation?.estimated_output_tokens?.toLocaleString() || 'N/A'}
  </span>
</div>

<div className="pt-2 border-t border-slate-800 text-xs text-slate-400 space-y-2">
  <div className="flex justify-between">
    <span>Estimated Cost (Gemini 3.5 Flash):</span>
    <span className="text-emerald-300 font-semibold">
      ${data.estimation?.estimated_total_cost_usd?.toFixed(2) || 'N/A'}
    </span>
  </div>

  <div className="flex justify-between">
    <span>Estimated Development Hours:</span>
    <span className="text-slate-200">
      {calculateDevHours(data.estimation?.estimated_total_tokens) || 'N/A'}
    </span>
  </div>
</div>
```

**Helper function:**
```typescript
const calculateDevHours = (totalTokens?: number): string => {
  if (!totalTokens) return 'N/A'
  // Calibration: 1 hr per 5k tokens (conservative, adjustable)
  const hours = Math.ceil(totalTokens / 5000)
  return `${hours} hrs`
}
```

### 2.3 Audit Tab (Replace Lifecycle Events)

**Current:** Shows lifecycle events (extracting, bronze_completed, etc.)

**New:** Show Audit Findings with severity cards

```typescript
{activeTab === 'audit' && (
  <div className="space-y-6">
    {/* Severity Summary Cards */}
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-red-950/30 border border-red-900/60 p-4 rounded-lg">
        <div className="text-xs text-red-400 font-semibold">CRITICAL</div>
        <div className="text-2xl font-bold text-red-300 mt-1">
          {data.audit?.findings_by_severity?.critical || 0}
        </div>
      </div>
      
      <div className="bg-orange-950/30 border border-orange-900/60 p-4 rounded-lg">
        <div className="text-xs text-orange-400 font-semibold">MAJOR</div>
        <div className="text-2xl font-bold text-orange-300 mt-1">
          {data.audit?.findings_by_severity?.major || 0}
        </div>
      </div>
      
      <div className="bg-yellow-950/30 border border-yellow-900/60 p-4 rounded-lg">
        <div className="text-xs text-yellow-400 font-semibold">MINOR</div>
        <div className="text-2xl font-bold text-yellow-300 mt-1">
          {data.audit?.findings_by_severity?.minor || 0}
        </div>
      </div>
      
      <div className="bg-blue-950/30 border border-blue-900/60 p-4 rounded-lg">
        <div className="text-xs text-blue-400 font-semibold">AUDIT SCORE</div>
        <div className="text-2xl font-bold text-blue-300 mt-1">
          {(data.audit?.overall_score || 0).toFixed(1)}%
        </div>
      </div>
    </div>

    {/* Findings List */}
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
      <h3 className="text-sm font-bold mb-4">Findings ({auditFindings.length})</h3>
      {auditFindings.length === 0 ? (
        <p className="text-slate-400 text-sm">No audit findings loaded.</p>
      ) : (
        <div className="space-y-3 max-h-[450px] overflow-y-auto">
          {auditFindings.map((finding) => (
            <div
              key={finding.finding_id}
              className={`p-3 rounded border-l-4 ${
                finding.severity === 'critical'
                  ? 'bg-red-950/20 border-l-red-500'
                  : finding.severity === 'major'
                  ? 'bg-orange-950/20 border-l-orange-500'
                  : finding.severity === 'minor'
                  ? 'bg-yellow-950/20 border-l-yellow-500'
                  : 'bg-blue-950/20 border-l-blue-500'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-xs text-slate-200 capitalize">
                  {finding.severity}
                </span>
                {finding.file_path && (
                  <span className="text-xs text-slate-500">{finding.file_path}</span>
                )}
              </div>
              <p className="text-xs text-slate-300 mb-2">{finding.finding_text}</p>
              {finding.recommendation && (
                <p className="text-xs text-slate-400 italic">
                  💡 {finding.recommendation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}
```

### 2.4 Report Tab (Render Markdown)

**Current:** Shows raw JSON only

**New:** Render markdown reports with tabs

```typescript
{activeTab === 'report' && (
  <div className="space-y-4">
    {/* Report Selector */}
    <div className="flex gap-2 border-b border-slate-800 pb-3">
      {['requirement_scope', 'scientific_estimation', 'audit_evidence', 'gap_analysis'].map(
        (reportType) => (
          <button
            key={reportType}
            onClick={() => setActiveReport(reportType)}
            className={`px-4 py-2 text-xs font-medium rounded transition ${
              activeReport === reportType
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {reportType.replace(/_/g, ' ')}
          </button>
        )
      )}
    </div>

    {/* Report Content */}
    {reportLoading ? (
      <div className="text-slate-400 text-sm">Loading report...</div>
    ) : reportError ? (
      <div className="text-red-400 text-sm bg-red-950/20 p-3 rounded">
        {reportError}
      </div>
    ) : reportContent ? (
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 prose prose-invert max-w-none">
        <ReactMarkdown
          components={{
            h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 mt-6 text-white" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-3 mt-5 text-indigo-300" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-lg font-semibold mb-2 mt-4 text-slate-200" {...props} />,
            p: ({node, ...props}) => <p className="text-slate-300 mb-3 leading-relaxed" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 text-slate-300" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 text-slate-300" {...props} />,
            code: ({node, inline, ...props}) =>
              inline ? (
                <code className="bg-slate-950 px-2 py-1 rounded text-amber-300 font-mono text-xs" {...props} />
              ) : (
                <code className="block bg-slate-950 p-3 rounded text-amber-300 font-mono text-xs overflow-x-auto mb-3" {...props} />
              ),
            table: ({node, ...props}) => <table className="border-collapse border border-slate-700 mb-3" {...props} />,
            th: ({node, ...props}) => <th className="border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 text-left" {...props} />,
            td: ({node, ...props}) => <td className="border border-slate-700 px-3 py-2 text-slate-300" {...props} />,
          }}
        >
          {reportContent}
        </ReactMarkdown>
      </div>
    ) : (
      <p className="text-slate-400 text-sm">No report content available.</p>
    )}
  </div>
)}
```

---

## Part 3: Package & Dependencies

### 3.1 Add Markdown Rendering Library

**Package:** `react-markdown`

```bash
npm install react-markdown remark-gfm
```

**Update imports:**
```typescript
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
```

---

## Part 4: Implementation Checklist

### API Changes
- [ ] Extend `/api/fetch-estimation` with 6 new queries (audit, FP, requirement count)
- [ ] Create `/api/fetch-audit-details` for paginated findings
- [ ] Create `/api/fetch-report` to read markdown files from disk
- [ ] Test each query with real data from prompt 3381323161097207808
- [ ] Handle BigQuery auth errors gracefully (fall back to empty arrays)

### UI Component Changes
- [ ] Remove hardcoded 85% confidence value
- [ ] Remove hardcoded 54 hrs estimate
- [ ] Wire version number from prompt_versions.version_number
- [ ] Wire chunk count from prompt_versions.chunk_count
- [ ] Wire FP, tokens, cost from ai_development_estimates
- [ ] Replace Audit tab lifecycle events with severity cards + findings list
- [ ] Replace Report tab JSON display with markdown renderer
- [ ] Add report tabs (requirement_scope, scientific_estimation, audit_evidence, gap_analysis)

### Testing
- [ ] Test with prompt 3381323161097207808
- [ ] Verify all BigQuery queries return data
- [ ] Verify markdown reports render correctly
- [ ] Test fallback when BigQuery unavailable
- [ ] Test token formatting (1.5M → "1,500,000")
- [ ] Test cost formatting ("$1.98")

### Deployment
- [ ] Run ESLint
- [ ] Type-check TypeScript
- [ ] Manual browser test (dev server)
- [ ] Test with multiple prompt IDs (verify dropdown works)

---

## Part 5: Success Criteria

✅ **All UI fields source from authoritative BigQuery tables or files**
```
Version          ← prompt_versions.version_number
Chunks           ← prompt_versions.chunk_count
FP               ← ai_development_estimates.total_functional_points
Tokens           ← ai_development_estimates.estimated_total_tokens
Cost             ← ai_development_estimates.estimated_total_cost_usd
Audit Score      ← audit_runs.overall_score
Findings         ← audit_findings (severity-filtered)
Reports          ← sentinel/reports/{prompt_id}/*.md
```

✅ **Zero hardcoded values remain**
- 85% → Calculated or from BigQuery
- 54 hrs → Calculated from token estimate
- Any other fallback → Replaced with real data

✅ **Reports render as markdown, not raw JSON**
- Requirement scope: Formatted text
- Scientific estimation: Formatted with tables
- Audit evidence: Formatted with severity badges
- Gap analysis: Formatted text

✅ **Audit tab shows real findings**
- Critical count > 0? Displayed
- Major findings? Sortable and searchable
- Severity-color-coded cards

✅ **Dashboard matches data flow**
```
Vertex → PromptRegistry → Estimation → Audit → Dashboard
```

---

## Notes

### Why Not Modify the Estimator Yet?
Phase 1 focuses on **UI wiring only**. The estimator will be addressed in Phase 2 once the UI is live and stakeholders confirm acceptance. Changing estimator priority (GCS → BQML) is a separate effort.

### Fallback Behavior
If BigQuery is unavailable:
- Show "BigQuery Unavailable" banner
- Display empty state for metrics
- Still show cached audit findings if available
- Still render report files from disk

### Incremental Deployment
You can deploy this in stages:
1. Extend API queries (no UI changes) — safe
2. Update Overview tab metrics — low risk
3. Replace Audit tab — moderate risk
4. Add Report markdown rendering — low risk

---

## Estimated Timeline

| Task | Effort |
|------|--------|
| API queries + testing | 2-3 hrs |
| Overview tab changes | 1-2 hrs |
| Token/Cost display | 0.5 hrs |
| Audit tab redesign | 2-3 hrs |
| Report markdown rendering | 1.5-2 hrs |
| Integration testing | 1-2 hrs |
| **Total** | **8-12 hrs** |


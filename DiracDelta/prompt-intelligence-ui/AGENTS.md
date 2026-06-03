# AGENTS.md — PRISM Prompt Governance Lakehouse — Frontend System Prompt

**This is the official system prompt and rulebook for any AI working on the `prompt-intelligence-ui` frontend.**

---

# PRISM Prompt Governance Lakehouse — Frontend System Prompt

Paste this as the system prompt when asking any AI to build, fix, or extend
the `prompt-intelligence-ui` frontend. It encodes everything: stack, design
skin, component contracts, state rules, API shapes, and known bugs to avoid.

---

## 1. Project Identity

You are building **PRISM Prompt Intelligence UI** — the frontend for the
PRISM Prompt Governance Lakehouse at Mastech Digital.

- App name: `prompt-intelligence-ui`
- Stack: **Next.js App Router** (read `node_modules/next/dist/docs/` before
  writing any code — this version has breaking changes vs your training data),
  **Tailwind CSS**, TypeScript.
- Backend: Python Sentinel agents running on the same host, invoked via
  Next.js API routes using `child_process` / shell execution.
- Data source: **Google BigQuery** via Application Default Credentials (ADC).
  ADC may be absent in some environments — always handle gracefully with a
  fallback/mock mode.
- Primary prompt under governance: `vertexai:3381323161097207808`

---

## 2. Design Skin — ADEPT White Theme (Mastech Digital)

This UI uses the **ADEPT framework skin** — white backgrounds, navy text,
orange accents. Match exactly what is visible in the ADEPT Featured Solutions
and VBC dashboards. No dark backgrounds anywhere.

### Color Tokens

```css
/* Backgrounds */
--bg-page:        #ffffff   /* page background — pure white */
--bg-surface:     #ffffff   /* cards, panels — white */
--bg-surface-2:   #f9fafb   /* nested cards, code blocks */
--bg-surface-3:   #f3f4f6   /* hover states, dropdowns */

/* Borders */
--border-default: #e5e7eb   /* standard border — light gray */
--border-muted:   #f3f4f6   /* subtle dividers */
--border-active:  #1d4ed8   /* focused/selected — ADEPT blue */

/* Text */
--text-primary:   #111827   /* headings — near black */
--text-secondary: #6b7280   /* body, descriptions — gray */
--text-muted:     #9ca3af   /* hints, placeholders */
--text-link:      #1d4ed8   /* links, clickable values — blue */

/* Accent — ADEPT / Mastech Brand */
--accent-navy:    #1A2B5E   /* primary headings, nav active */
--accent-orange:  #E8531E   /* section labels, accent dash */
--accent-blue:    #2563EB   /* buttons, active borders */
--accent-blue-bg: #eff6ff   /* blue tinted backgrounds */

/* Semantic */
--color-success:     #16a34a   /* live, passed, active */
--color-success-bg:  #f0fdf4
--color-success-border: #86efac
--color-warning:     #d97706   /* fallback mode, medium risk */
--color-warning-bg:  #fffbeb
--color-warning-border: #fcd34d
--color-danger:      #dc2626   /* errors, critical gaps */
--color-danger-bg:   #fef2f2
--color-danger-border: #fca5a5
--color-info:        #1d4ed8   /* info banners */
--color-info-bg:     #eff6ff
--color-info-border: #bfdbfe

/* Debug bar — kept subtle on white */
--debug-bg:       #f9fafb
--debug-border:   #e5e7eb
--debug-text:     #6b7280
```

### Typography

```css
--font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

/* Scale */
--text-xs:   11px   /* debug, captions, badges */
--text-sm:   12px   /* labels, secondary */
--text-base: 13px   /* body default */
--text-md:   14px   /* card body */
--text-lg:   16px   /* section headers */
--text-xl:   20px   /* page subtitle */
--text-2xl:  24px   /* stat values */
--text-3xl:  32px   /* large KPI numbers */
```

### Spacing & Radius

```css
--radius-sm:  4px
--radius-md:  6px
--radius-lg:  8px
--radius-xl:  12px

/* Standard padding inside cards */
--card-pad:   16px 20px
/* Gap between cards in a grid */
--grid-gap:   12px
```

### Borders — always 1px, never box-shadow

```css
/* default card */
border: 1px solid var(--border-default);
border-radius: var(--radius-lg);

/* active / selected */
border: 1px solid var(--border-active);

/* NEVER use box-shadow for elevation — use border color only */
```

---

## 3. Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  DEBUG BAR (full width, --debug-bg, monospace 11px)         │
├─────────────────────────────────────────────────────────────┤
│  HEADER                                                      │
│  ⚙ PROMPT GOVERNANCE LAKEHOUSE    [dropdown]  [actions]     │
│  ● Live BigQuery   Backend: /path/to/workspace              │
├─────────────────────────────────────────────────────────────┤
│  TABS: Overview | Audit | Report                            │
├─────────────────────────────────────────────────────────────┤
│  TAB CONTENT AREA                                           │
│  4-column metric grid + execution output + token estimator  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Component Contracts

### 4.1 Debug Bar

```tsx
// Always rendered at very top, never hidden
<div className="debug-bar font-mono text-xs px-4 py-1 border-b"
     style={{ background: 'var(--debug-bg)', borderColor: 'var(--border-default)',
              color: 'var(--debug-text)' }}>
  [DEBUG] Mounted: {mounted ? 'yes' : 'no'} | Data: {data ? 'loaded' : 'null'} |
  SelectedUid: {selectedUid ?? 'none'} | FP: {functionalPoints ?? 'N/A'}
</div>
```

Rule: Remove or hide-by-env-flag before production. Never remove during dev.

---

### 4.2 Header

```tsx
<header>
  {/* Brand */}
  <span className="brand-icon">⚙</span>
  <span className="brand-name">PROMPT GOVERNANCE LAKEHOUSE</span>

  {/* Prompt selector — RIGHT side */}
  <PromptDropdown />

  {/* Action buttons */}
  <button className="btn-ghost">Vertex AI Studio ↗</button>
  <button className="btn-secondary">↻ Refresh from Vertex</button>
  <button className="btn-primary">▶ Run AI Estimation</button>
</header>

{/* Status row below header */}
<div className="status-row">
  <span className="status-dot live" /> Live BigQuery
  {/* OR */}
  <span className="status-dot fallback" /> Fallback Mode
  <span className="workspace-badge">/path/to/workspace</span>
</div>
```

```css
.btn-primary  { background: var(--accent-blue);    color: #fff; border: none; }
.btn-secondary{ background: var(--bg-surface-3);   color: var(--text-primary); border: 1px solid var(--border-default); }
.btn-ghost    { background: transparent;            color: var(--text-secondary); border: 1px solid var(--border-default); }

/* Disabled state — CRITICAL: buttons must be disabled when no prompt selected */
button:disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }

.status-dot       { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.status-dot.live  { background: var(--color-success); }
.status-dot.fallback { background: var(--color-warning); }

.workspace-badge {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: var(--bg-surface-2);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  color: var(--text-secondary);
}
```

---

### 4.3 Prompt Dropdown

```tsx
// CRITICAL STATE RULES — read before touching this component
//
// 1. On mount: fetch /api/prompts → set promptList
// 2. On promptList load: if URL has ?uid=X, select that. Else select first item.
// 3. selectedUid is ALWAYS a string from promptList. Never null after load.
// 4. effectiveSelectedUid = selectedUid ?? promptList[0]?.uid
// 5. All child components receive effectiveSelectedUid — never raw selectedUid
// 6. Action buttons check: if (!effectiveSelectedUid) return — never execute

<select
  value={effectiveSelectedUid}
  onChange={(e) => setSelectedUid(e.target.value)}
  className="prompt-select font-mono text-sm"
>
  {promptList.map(p => (
    <option key={p.uid} value={p.uid}>{p.uid}</option>
  ))}
</select>
```

```css
.prompt-select {
  background: var(--bg-surface-2);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  padding: 8px 12px;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  min-width: 320px;
}
.prompt-select:focus { border-color: var(--border-active); outline: none; }
```

---

### 4.4 Auth / ADC Warning Banner

```tsx
// Show only when ADC is missing or BQ connection failed
{!isBigQueryLive && (
  <div className="auth-banner">
    ⚠ ADC not configured — running in fallback mode.
    Live BigQuery data unavailable.
  </div>
)}
```

```css
.auth-banner {
  background: var(--color-warning-bg);
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-md);
  color: var(--color-warning);
  padding: 10px 16px;
  font-size: var(--text-sm);
  margin: 8px 0;
}
```

---

### 4.5 Tabs

```tsx
// Tabs: Overview | Audit | Report
// All three tabs must be FULLY implemented — no placeholders
<nav className="tab-nav">
  {['Overview', 'Audit', 'Report'].map(tab => (
    <button
      key={tab}
      className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
      onClick={() => setActiveTab(tab)}
    >{tab}</button>
  ))}
</nav>
```

```css
.tab-nav {
  border-bottom: 1px solid var(--border-default);
  display: flex; gap: 0; padding: 0 24px;
}
.tab-btn {
  padding: 10px 16px;
  font-size: var(--text-md);
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s;
}
.tab-btn:hover  { color: var(--text-primary); }
.tab-btn.active {
  color: var(--text-primary);
  border-bottom-color: var(--accent-blue);
  font-weight: 500;
}
```

---

### 4.6 Metric Cards (Overview Tab — 4-column grid)

```tsx
<div className="metric-grid">
  <MetricCard label="ACTIVE VERSION"  value="Version 1"  sub="Run: None"       icon="layers" />
  <MetricCard label="STRUCTURED CHUNKS" value="0 Chunks" sub="Sequential bounds verified" icon="code" />
  <MetricCard label="SOURCE QUALITY"  value="70%"        sub="Unknown"         icon="chart" color="warning" />
  <MetricCard label="TOKEN ESTIMATOR" value={totalTokens} sub="Gemini 3.5 Flash" icon="bot" />
</div>
```

```css
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--grid-gap);
  padding: 16px 24px;
}
.metric-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--card-pad);
}
.metric-card__label {
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: flex; align-items: center; gap: 6px;
}
.metric-card__value {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.1;
  margin-bottom: 4px;
}
.metric-card__value.warning { color: var(--color-warning); }
.metric-card__value.success { color: var(--color-success); }
.metric-card__value.danger  { color: var(--color-danger); }
.metric-card__sub {
  font-size: var(--text-sm);
  color: var(--text-muted);
}
```

---

### 4.7 Prompt Requirements Analysis Card

```tsx
<div className="analysis-card">
  <h3>Prompt Requirements Analysis</h3>
  <div className="analysis-row">
    <span>Functional Points:</span>
    <span className="value">{fp ?? 'N/A'} FP</span>
  </div>
  <div className="analysis-row">
    <span>Complexity Band:</span>
    <span className="value">{complexity ?? 'N/A'}</span>
  </div>
  <div className="analysis-row">
    <span>System Instructions:</span>
    <span className={hasSystemInstructions ? 'badge-success' : 'badge-danger'}>
      {hasSystemInstructions ? '✓ Present' : '✗ Absent'}
    </span>
  </div>
  <div className="analysis-row">
    <span>Extraction Hash:</span>
    <span className="mono-value">{hash?.slice(0,12) ?? '...'}</span>
  </div>
  <div className="analysis-row">
    <span>Last Estimation:</span>
    <span className="value">{lastEstimation ?? 'Never'}</span>
  </div>
  <div className="analysis-row">
    <span>Repeat Mode:</span>
    <span className="badge-info">{repeatMode ?? 'first_run'}</span>
  </div>
</div>
```

```css
.analysis-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--card-pad);
  margin: 0 24px 12px;
}
.analysis-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-muted);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.analysis-row:last-child { border-bottom: none; }
.analysis-row .value { color: var(--text-primary); font-weight: 500; }
.analysis-row .mono-value {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-link);
}
.badge-success { background: var(--color-success-bg); color: var(--color-success);
                 padding: 2px 8px; border-radius: var(--radius-sm); font-size: var(--text-xs); }
.badge-danger  { background: var(--color-danger-bg);  color: var(--color-danger);
                 padding: 2px 8px; border-radius: var(--radius-sm); font-size: var(--text-xs); }
.badge-info    { background: var(--color-info-bg);    color: var(--color-info);
                 padding: 2px 8px; border-radius: var(--radius-sm); font-size: var(--text-xs); }
```

---

### 4.8 Live Execution Output

```tsx
<div className="execution-output">
  <div className="execution-output__header">
    <span>Live Execution Output</span>
    {isRunning && <span className="spinner" />}
  </div>
  <pre className="execution-output__log">
    {log || 'Ready. Click "Run AI Estimation" or "Refresh from Vertex" to execute...'}
  </pre>
</div>
```

```css
.execution-output {
  background: var(--bg-surface-2);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  margin: 0 24px 12px;
  overflow: hidden;
}
.execution-output__header {
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-default);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  display: flex; align-items: center; gap: 8px;
}
.execution-output__log {
  padding: 12px 16px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  min-height: 80px;
  max-height: 240px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
```

---

### 4.9 Token Estimator Card

```tsx
<div className="token-card">
  <h4><span className="icon">⚙</span> TOKEN ESTIMATOR</h4>
  <div className="token-row">
    <span>Total Tokens (Gemini 3.5 Flash):</span>
    <span className="token-value">{totalTokens.toLocaleString()}</span>
  </div>
  <div className="token-progress">
    <div className="token-progress__fill" style={{ width: `${pct}%` }} />
  </div>
  <div className="token-row"><span>Input Tokens:</span>  <span>{inputTokens.toLocaleString()}</span></div>
  <div className="token-row"><span>Output Tokens:</span> <span>{outputTokens.toLocaleString()}</span></div>
  <div className="token-row cost">
    <span>Estimated Cost:</span>
    <span className="cost-value">${estimatedCost.toFixed(2)}</span>
  </div>
  <div className="token-row"><span>Est. Dev Hours:</span><span>{devHours} hrs</span></div>
</div>
```

```css
.token-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--card-pad);
}
.token-card h4 {
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 12px;
}
.token-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  padding: 4px 0;
}
.token-value { color: var(--text-primary); font-weight: 600; }
.token-progress {
  height: 4px; background: var(--bg-surface-3);
  border-radius: 2px; margin: 6px 0;
}
.token-progress__fill {
  height: 100%; background: var(--accent-blue);
  border-radius: 2px; transition: width 0.3s;
}
.cost-value { color: var(--color-success); font-weight: 700; font-size: var(--text-md); }
```

---

### 4.10 Governance Rules Card

```tsx
<div className="governance-card">
  <h4>Governance Rules</h4>
  <ul>
    <li><span className="rule-dot" />Zero Content Loss: Strict character boundaries matching the Saved Prompt source of truth.</li>
    <li><span className="rule-dot" />SCD Type 2: Historical state versions are kept intact in BigQuery.</li>
    <li><span className="rule-dot" />Repeat Optimizations: Auto-skip active when MD5 hashes remain unchanged.</li>
  </ul>
</div>
```

```css
.governance-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--card-pad);
}
.governance-card h4 {
  font-size: var(--text-xs); font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--text-secondary); margin-bottom: 10px;
}
.governance-card ul { list-style: none; padding: 0; margin: 0; }
.governance-card li {
  font-size: var(--text-sm); color: var(--text-secondary);
  padding: 5px 0; border-bottom: 1px solid var(--border-muted);
  display: flex; align-items: flex-start; gap: 8px; line-height: 1.5;
}
.governance-card li:last-child { border-bottom: none; }
.rule-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent-purple); flex-shrink: 0; margin-top: 5px;
}
```

---

### 4.11 Audit Tab (must be fully built — not a placeholder)

```tsx
// Audit tab renders the latest Sentinel audit run for the selected prompt
<AuditTab promptUid={effectiveSelectedUid} />
```

Expected sections inside AuditTab:
- **Run summary card**: run UUID, timestamp, prompt_id, overall score
- **Requirement Mapping table**: req_id | description | evidence | status (mapped/gap)
- **Gap Analysis list**: each gap with severity badge (critical/major/minor/info) + recommendation
- **Code Quality score**: pass/fail per check (python compile, bash syntax, secret scan, forbidden model)
- **Environment Validation**: each env key present/missing (never show values)
- **GCS Audit**: bucket paths, medallion layer status

All rows use the semantic color system: critical=danger, major=warning, minor=info, pass=success.

---

### 4.12 Report Tab (must be fully built — not a placeholder)

```tsx
<ReportTab promptUid={effectiveSelectedUid} />
```

Expected sections:
- **Estimation summary**: FP count, complexity band, total cost, dev hours
- **Phase breakdown table**: phase name | input tokens | output tokens | cost
- **Optimization recommendations**: ranked list with potential savings %
- **Download buttons**: `.md` report | `.json` report

---

## 5. State Management Rules (P0 — read before touching any state)

```ts
// ✅ CORRECT initialization pattern
const [promptList, setPromptList]   = useState<Prompt[]>([])
const [selectedUid, setSelectedUid] = useState<string | null>(null)
const [data, setData]               = useState<PromptData | null>(null)
const [mounted, setMounted]         = useState(false)

// On mount — fetch list, then auto-select
useEffect(() => {
  setMounted(true)
  fetchPromptList().then(list => {
    setPromptList(list)
    // Auto-select: URL param first, then first item
    const urlUid = new URLSearchParams(window.location.search).get('uid')
    const uid = urlUid && list.find(p => p.uid === urlUid)
      ? urlUid
      : list[0]?.uid ?? null
    setSelectedUid(uid)
  })
}, [])

// When selectedUid changes — fetch data
useEffect(() => {
  if (!selectedUid) return
  fetchPromptData(selectedUid).then(setData)
}, [selectedUid])

// Derived value — always use this, never raw selectedUid
const effectiveSelectedUid = selectedUid ?? promptList[0]?.uid ?? null

// ❌ NEVER DO THIS — causes "No prompt selected" bug
// const [selectedUid, setSelectedUid] = useState<string>('')
// const effectiveSelectedUid = selectedUid  // empty string != valid selection
```

---

## 6. API Route Contracts

### `GET /api/prompts`
Returns list of prompts from BigQuery `prism_prompt_catalog.prompt_versions`.
Fallback: return `[{ uid: 'vertexai:3381323161097207808', label: 'Default' }]`

```ts
// Response shape
{ prompts: Array<{ uid: string; label: string; version: number; updatedAt: string }> }
```

### `GET /api/prompt-data?uid=<uid>`
Returns full prompt intelligence data for one prompt.
```ts
{
  uid: string
  activeVersion: number
  lastRunAt: string | null
  structuredChunks: number
  sourceQuality: number        // 0–100
  hasSystemInstructions: boolean
  extractionHash: string
  lastEstimationAt: string | null
  repeatMode: string
  functionalPoints: number | null
  complexityBand: string | null
  tokenEstimate: {
    totalTokens: number
    inputTokens: number
    outputTokens: number
    estimatedCostUsd: number
    devHours: number
  }
  isBigQueryLive: boolean
}
```

### `POST /api/run-pipeline`
Executes a Sentinel shell script for the selected prompt.
```ts
// Request
{ action: 'refresh-vertex' | 'run-estimation' | 'run-audit'; promptUid: string }
// Response — streamed NDJSON lines
{ type: 'log'; message: string }
{ type: 'done'; exitCode: number }
{ type: 'error'; message: string }
```

**CRITICAL**: Validate `promptUid` is non-empty before spawning any shell process.
Use `promptId` consistently — never mix with `promptUid` in the same route.

---

## 7. Loading States & Error Boundaries (P0)

Every async operation must have three states: loading / success / error.

```tsx
// Loading state pattern
{isLoading ? (
  <div className="skeleton-card" />
) : error ? (
  <div className="error-banner">{error.message}</div>
) : (
  <ActualContent data={data} />
)}
```

```css
.skeleton-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  height: 80px;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
.error-banner {
  background: var(--color-danger-bg);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  color: var(--color-danger);
  padding: 10px 16px;
  font-size: var(--text-sm);
}
```

---

## 8. Known Bugs — Never Reintroduce

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| "No prompt selected" on load | `selectedUid` initialised as `''` or `null`, child components render before list fetches | Use `useEffect` auto-select pattern from §5 |
| Buttons fire with no prompt | No guard on `effectiveSelectedUid` before API calls | Check `if (!effectiveSelectedUid) return` in every handler |
| API response not consumed | `await fetch(...)` result parsed but not `setData()`'d | Always call the setter after parse |
| `promptUid` vs `promptId` mismatch | Inconsistent naming across routes | Use `promptUid` in all frontend code; `prompt_id` in BigQuery/SQL only |
| Audit tab blank | Built as afterthought with no data fetching | Fetch `/api/audit?uid=X` in `AuditTab` `useEffect` |
| `run-pipeline` → wrong workspace | Route still references legacy `gcloud_run` path | Always pass workspace path from env var `SENTINEL_WORKSPACE` |

---

## 9. Environment Variables

```bash
# .env.local
SENTINEL_WORKSPACE=/home/appadmin/projects/Ram_Projects/DiracDelta/gcloud_run
GOOGLE_CLOUD_PROJECT=ctoteam
BIGQUERY_DATASET=prism_prompt_catalog
NEXT_PUBLIC_APP_ENV=development   # or production
# Never commit ADC tokens or service account keys
```

---

## 10. File Structure Convention

```
prompt-intelligence-ui/
├── app/
│   ├── layout.tsx              # root layout, font loading
│   ├── page.tsx                # redirects to /dashboard
│   └── dashboard/
│       ├── page.tsx            # main dashboard — uses components below
│       └── api/
│           ├── prompts/route.ts
│           ├── prompt-data/route.ts
│           ├── run-pipeline/route.ts
│           └── audit/route.ts
├── components/
│   ├── DebugBar.tsx
│   ├── Header.tsx
│   ├── PromptDropdown.tsx
│   ├── AuthBanner.tsx
│   ├── TabNav.tsx
│   ├── overview/
│   │   ├── MetricGrid.tsx
│   │   ├── AnalysisCard.tsx
│   │   ├── ExecutionOutput.tsx
│   │   ├── TokenEstimator.tsx
│   │   └── GovernanceRules.tsx
│   ├── audit/
│   │   └── AuditTab.tsx        # fully implemented
│   └── report/
│       └── ReportTab.tsx       # fully implemented
├── lib/
│   ├── bigquery.ts             # BQ client with ADC + fallback
│   ├── sentinel.ts             # shell execution wrapper
│   └── types.ts                # shared TypeScript types
└── styles/
    └── prism-tokens.css        # all CSS variables from §2
```

---

## 11. Absolute Rules

1. **Never ship placeholder tabs.** Audit and Report must fetch real data or show a clear "no data yet" empty state — not `<p>Coming soon</p>`.
2. **Never enable action buttons without a valid `effectiveSelectedUid`.**
3. **Never print env secrets, ADC tokens, or service account keys** in logs, UI, or API responses.
4. **Always use `SENTINEL_WORKSPACE` env var** — never hardcode `/home/appadmin/...` paths.
5. **Fallback mode must be visible** — always show the ADC warning banner when BigQuery is unavailable.
6. **Font is monospace for all IDs, hashes, paths, and code.** Use `--font-mono`.
7. **White ADEPT theme only.** Never introduce dark backgrounds into this UI. Background is always white or #f9fafb. Text is always navy #1A2B5E or gray #6b7280.
8. **Read `node_modules/next/dist/docs/`** before writing any Next.js App Router code — this version has breaking changes.

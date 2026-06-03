"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  BarChart2, Play, RefreshCw, Terminal, CheckCircle2, 
  AlertTriangle, Layers, Cpu, Code2, ExternalLink, ChevronDown, ShieldAlert
} from 'lucide-react';
import AgentPipeline from '../components/AgentPipeline';
import PromptGalleryPanel from '../components/PromptGalleryPanel';
import { CodingAgentView } from '../components/CodingAgentView';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const FP_CATEGORY_COLORS: Record<string, string> = {
  functional: '#2563EB',
  infrastructure: '#16a34a',
  data: '#d97706',
  security: '#dc2626',
  orchestration: '#8b5cf6',
  backend: '#2563EB',
  cloud: '#16a34a',
  testing: '#ca8a04',
  frontend: '#7c3aed'
};

type EstimationError = {
  type: 'preflight' | 'runtime';
  message: string;
  detail?: string;
};

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLog, setActionLog] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [promptFingerprint, setPromptFingerprint] = useState<string>('—');
  const [activeTab, setActiveTab] = useState<'overview' | 'ai-estimation' | 'audit' | 'report' | 'coding'>('overview');

  // 3-Stage flow state
  const [stage, setStage] = useState<1 | 2 | 3>(1);

  // New: Prompt list from BigQuery via backend
  const [promptList, setPromptList] = useState<any[]>([]);
  const [bqSource, setBqSource] = useState<'bigquery' | 'fallback'>('fallback');

  // Cleanup: Missing state declarations that were causing runtime errors
  const [auditFindings, setAuditFindings] = useState<any[]>([]);

  // Estimation data fields (now also updated from fresh "Run AI Estimation" runs)
  const [functionalPoints, setFunctionalPoints] = useState<number | null>(null);
  const [complexityBand, setComplexityBand] = useState<string | null>(null);
  const [sourceQuality, setSourceQuality] = useState<number>(70);
  const [tokenEstimate, setTokenEstimate] = useState<any>(null);
  const [lastEstimationAt, setLastEstimationAt] = useState<string | null>(null);
  const [repeatMode, setRepeatMode] = useState<string>('first_run');
  const [estimationError, setEstimationError] = useState<EstimationError | null>(null);

  // Fresh run result from the latest "Run AI Estimation" (parsed from stdout for immediate UI update)
  const [latestEstimation, setLatestEstimation] = useState<any>(null);

  // New state for the rich Report tab (structured data)
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [showMdReport, setShowMdReport] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalFlyoutMinimized, setApprovalFlyoutMinimized] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // NEW SIDEBAR: Prompt Gallery (expandable list from gcloud_run + coder)
  const [galleryOpen, setGalleryOpen] = useState(true);
  const [galleryPrompts, setGalleryPrompts] = useState<any[]>([]);
  const [hoveredPrompt, setHoveredPrompt] = useState<string | null>(null);
  const [hoveredTop, setHoveredTop] = useState<number>(0);

  // ADC / gcloud auth status for banner (validates BOTH gcloud auth login + application-default)
  const [adcOk, setAdcOk] = useState<boolean | null>(null);
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [adcEmail, setAdcEmail] = useState<string | null>(null);

  // BQ Catalog Status for Stage 1 dashboard
  const [bqCatalogStatus, setBqCatalogStatus] = useState<any[]>([]);

  // FIX 5: active filters for model comparison table
  const [activeProviders, setActiveProviders] = useState<Set<string>>(
    new Set(['Google', 'xAI', 'OpenAI', 'Anthropic', 'AWS Bedrock'])
  );
  const [activeTiers, setActiveTiers] = useState<Set<string>>(
    new Set(['fast', 'reasoning', 'coding', 'balanced', 'premium'])
  );

  const thStyle = {
    textAlign: 'left' as const,
    padding: '8px 10px',
    color: '#6b7280',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap' as const,
  };
  const tdStyle = {
    padding: '10px 10px',
    color: '#374151',
    verticalAlign: 'top' as const,
  };

  // FIX 5 helpers
  const providerColor = (p: string) => ({
    'Google': '#4285F4', 'xAI': '#000000',
    'OpenAI': '#10A37F', 'Anthropic': '#D4722A', 'AWS Bedrock': '#FF9900'
  }[p] ?? '#6b7280');

  const tierColor = (t: string) => ({
    fast:'#dbeafe', reasoning:'#fef9c3', coding:'#dcfce7',
    balanced:'#f3e8ff', premium:'#fee2e2'
  }[t] ?? '#f3f4f6');

  // Simplified, reliable fetch


  async function safeJson(res: Response) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response (status ${res.status}): ${text.slice(0, 120)}`);
    }
  }
  const fetchDashboardData = async (uid?: string) => {
    const targetUid = uid || selectedUid || 'vertexai:3381323161097207808';
    const url = `/api/fetch-estimation?promptUid=${encodeURIComponent(targetUid)}`;
    console.log('[Dashboard] Fetching:', url);
    try {
      const res = await fetch(url);
      const json = await safeJson(res);
      console.log('[Dashboard] API Response:', json);
      if (json.success) {
        setData(json);
        // Ensure we have a selected prompt
        if (!selectedUid && json.activeUid) {
          setSelectedUid(json.activeUid);
        }
      }
    } catch (e) {
      console.error("[Dashboard] Fetch failed:", e);
    }
  };

  // Mount detection - must be first and have empty dependency array
  useEffect(() => {
    console.log('mounting...', process.env.NEXT_PUBLIC_BACKEND_URL);
    setMounted(true);

    fetch('/api/status')
      .then(safeJson)
      .then((status) => console.log('[mount] /api/status OK', status))
      .catch((e) => console.error('[mount] /api/status failed', e));

    fetch('/api/prompt-data?uid=vertexai:3381323161097207808')
      .then(safeJson)
      .then((promptData) => console.log('[mount] /api/prompt-data OK', promptData?.promptId ?? promptData?.uid))
      .catch((e) => console.error('[mount] /api/prompt-data failed', e));
  }, []);

  // FIX 1: Watch URL param changes (from sidebar clicks etc) and sync selectedUid + dropdown
  useEffect(() => {
    const urlUid = searchParams.get('uid')
    if (urlUid && urlUid !== selectedUid) {
      setSelectedUid(urlUid)
    }
  }, [searchParams])

  // Load prompt list from backend (/api/prompts proxies to 8005)
  useEffect(() => {
    if (!mounted) return;

    const urlParams = new URLSearchParams(window.location.search);
    const urlUid = urlParams.get('uid');

    fetch('/api/prompts')
      .then(safeJson)
      .then(res => {
        let list = res.prompts ?? [];
        // Dedup by uid so the dropdown shows exactly the distinct prompts (no repeated 3381... rows)
        const seen = new Set<string>();
        list = list.filter((p: any) => {
          if (seen.has(p.uid)) return false;
          seen.add(p.uid);
          return true;
        });
        setPromptList(list);
        setBqSource(res.source === 'bigquery' ? 'bigquery' : 'fallback');

        // Only auto-select if URL specifies a uid (so default landing with no uid shows the full Stage 1 lakehouse dashboard).
        // User can pick from left gallery panel or from the BQ table in the dashboard.
        if (urlUid) {
          const match = list.find((p: any) => p.uid === urlUid);
          const toSelect = match ? urlUid : (list[0]?.uid ?? null);
          if (toSelect) {
            setSelectedUid(toSelect);
            fetchDashboardData(toSelect);
          }
        } else {
          // stay null -> show lakehouse dashboard in stage 1
        }
      })
      .catch(() => {
        // Fallback list only; do not force a selection so that !selectedUid shows the Stage 1 lakehouse dashboard by default
        const defaultUid = 'vertexai:3381323161097207808';
        setPromptList([{
          uid: defaultUid,
          promptId: '3381323161097207808',
          label: defaultUid,
          version: 1,
          isActive: true
        }]);
        // leave selectedUid as null (from initial state) unless URL had one (handled in URL watcher)
      });
  }, [mounted]);

  // Fetch real per-prompt data via Next.js proxy (never direct to 8005 from browser - avoids CORS)
  useEffect(() => {
    if (!selectedUid) return;

    fetch(`/api/prompt-data?uid=${encodeURIComponent(selectedUid)}`)
      .then(safeJson)
      .then(d => {
        setFunctionalPoints(d.functionalPoints ?? null);
        setComplexityBand(d.complexityBand ?? null);
        const sq = d.sourceQuality ?? 70;
        setSourceQuality(sq > 1 ? Math.round(sq) : Math.round(sq * 100));
        setTokenEstimate(d.tokenEstimate ?? null);
        setLastEstimationAt(d.lastEstimationAt ?? null);
        setRepeatMode(d.repeatMode ?? 'first_run');

        // Also feed the debug bar + overview cards with real data
        setData((prev: any) => ({
          ...(prev || {}),
          activeUid: selectedUid,
          estimation: {
            total_functional_points: d.functionalPoints ?? prev?.estimation?.total_functional_points,
            functional_points: d.functionalPoints,
            complexity_band: d.complexityBand,
            estimated_total_tokens: d.tokenEstimate?.totalTokens,
            estimated_total_cost_usd: d.tokenEstimate?.estimatedCostUsd,
          },
          isFallback: false,
          authError: null,
        }));
      })
      .catch((e) => {
        console.error('[prompt-data] proxy fetch failed', e);
      });
  }, [selectedUid]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextUid = e.target.value;
    setSelectedUid(nextUid);
    setData(null);

    // URL sync - make the selection shareable
    const params = new URLSearchParams(window.location.search);
    params.set('uid', nextUid);
    router.replace(`?${params.toString()}`, { scroll: false });

    fetchDashboardData(nextUid);
  };

  const handlePromptClick = (uid: string) => {
    setSelectedUid(uid);
    router.push(`/?uid=${encodeURIComponent(uid)}`, { scroll: false });
    fetchDashboardData(uid);
  };

  // load gallery prompts (gcloud_run primary + coder fallback + tracker status from gcloud_run/prompt-tracker.json)
  // use relative proxy to avoid direct browser-to-backend fetch issues (CORS, reachability)
  useEffect(() => {
    fetch(`/api/vertex-prompts`)
      .then(safeJson)
      .then(res => {
        if (res && Array.isArray(res.prompts)) setGalleryPrompts(res.prompts ?? []);
      })
      .catch(console.error);
  }, []);

  // ADC status fetch on mount (for header banner warning).
  // Now validates BOTH: gcloud auth login (CLI) + gcloud auth application-default login (ADC for Python libs).
  useEffect(() => {
    if (!mounted) return
    fetch(`/api/adc-status`)
      .then(r => r.json())
      .then(d => {
        setAuthStatus(d)
        setAdcOk(!!d.ok)
        const email = d?.cli?.account || d?.adc?.email || '';
        setAdcEmail(email || null)
      })
      .catch(() => {
        setAuthStatus({ ok: false, error: 'unreachable' })
        setAdcOk(false)
        setAdcEmail(null)
      })
  }, [mounted])

  // BQ Catalog Status fetch for Stage 1 dashboard (real BQ schema health)
  useEffect(() => {
    if (!mounted) return
    fetch(`/api/bq-catalog-status`)
      .then(r => r.json())
      .then(d => {
        if (d && d.catalog) {
          setBqCatalogStatus(d.catalog)
        }
      })
      .catch(console.error)
  }, [mounted])

  const triggerAction = async (action: 'refresh' | 'estimate', dryRun: boolean = false) => {
    const uidToUse = selectedUid || 'vertexai:3381323161097207808';
    const sourcePromptId = uidToUse.split(':').pop() || uidToUse;
    
    setLoading(true);
    const label = dryRun ? 'DRY RUN' : action.toUpperCase();
    setActionLog(`Starting action: ${label} on Prompt ID ${sourcePromptId}...\nThis may take a minute...\n`);
    
    try {
      if (action === 'estimate') {
        setEstimationError(null);
        // Already wired to real 8005 backend via run-pipeline (see api/run-pipeline/route.ts)
        const res = await fetch('/api/run-pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, promptId: sourcePromptId, dryRun })
        });
        const json = await safeJson(res);
        if (res.status === 422 || json.status === 'preflight_failed') {
          setEstimationError({
            type: 'preflight',
            message: json.message || 'Run the pipeline agents first to extract prompt content',
            detail: 'Go to Stage 2 and click Run All Pipeline first'
          });
          setActionLog(`PRE-FLIGHT FAILED\n${json.stdout || ''}\n${json.message || json.error || 'Insufficient prompt data'}`);
          return;
        }
        
        let log = `--- STDOUT ---\n${json.stdout || ''}\n`;
        if (json.stderr) log += `\n--- STDERR ---\n${json.stderr}\n`;
        if (!json.success) {
          setEstimationError({
            type: 'runtime',
            message: json.error || 'Execution failed.',
          });
          log += `\n❌ ERROR: ${json.error || 'Execution failed.'}`;
        } else {
          setEstimationError(null);
          log += `\n🟢 SUCCESS: Action completed successfully.${dryRun ? ' (dry-run: no writes)' : ''}`;
        }
        setActionLog(log);
        if (!dryRun) fetchDashboardData(selectedUid || undefined);

        // === NEW: refresh the UI cards with the *actual* numbers from this run ===
        // FIX 1: always parse (including dry-run stdout which uses short labels) and populate latestEstimation
        if (json.success && json.stdout) {
          const fresh = parseEstimationFromStdout(json.stdout);
          if (fresh.totalFunctionalPoints) {
            setFunctionalPoints(fresh.totalFunctionalPoints);
            setComplexityBand(fresh.complexityBand || 'Large');
          }
          if (fresh.totalTokens || fresh.estimatedCostUsd) {
            setTokenEstimate({
              totalTokens: fresh.totalTokens || 0,
              inputTokens: fresh.inputTokens || 0,
              outputTokens: fresh.outputTokens || 0,
              estimatedCostUsd: fresh.estimatedCostUsd || 0,
              devHours: fresh.devHours || Math.round((fresh.totalTokens || 15000) / 10000)
            });
          }

          // FIX 2: fetch model comparison using the real token count from this run (dry or not)
          // so the "Model Cost Recommendations" table in Latest Estimation shows actual $ and ratios
          let modelComparison: any[] = [];
          const tok = fresh.totalTokens || 0;
          if (tok > 0) {
            try {
              // use same-origin proxy (avoids direct browser fetch issues to backend)
              const modelsRes = await fetch(`/api/models?tokens=${tok}`);
              const modelData = await safeJson(modelsRes);
              modelComparison = modelData.models ?? [];
            } catch (e) {
              console.error('model comparison fetch after estimation failed', e);
            }
          }

          // Store rich summary for a nice post-run panel (model recommendations, task count, etc.)
          // FIX 3: include isDryRun so we can show the "not saved" badge
          setLatestEstimation({
            ...fresh,
            promptId: sourcePromptId,
            runAt: new Date().toISOString(),
            fullReport: json.stdout,
            isDryRun: dryRun,
            modelComparison
          });
        }
      } else if (action === 'refresh') {
        // Proxy through our run-pipeline handler (avoids browser CORS to 8005).
        // The handler currently shells to gcloud_run script for refresh; real /scope can be wired in the route later.
        const res = await fetch('/api/run-pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'refresh', promptId: sourcePromptId })
        });
        const json = await safeJson(res);

        let log = `--- REFRESH (via proxy) ---\n${json.stdout || JSON.stringify(json, null, 2)}\n`;
        if (json.stderr) log += `\n--- STDERR ---\n${json.stderr}\n`;
        if (json.success) {
          log += `\n🟢 SUCCESS: Refresh completed for ${sourcePromptId}`;
        } else {
          log += `\n⚠️ ${json.error || 'Completed with warnings'}`;
        }
        setActionLog(log);
        fetchDashboardData(selectedUid || undefined);
        // Also re-pull the details for the cards
        // (the selectedUid effect will re-run if we touch it, but force a refetch of details)
        fetch(`/api/prompt-data?uid=${encodeURIComponent(selectedUid || 'vertexai:3381323161097207808')}`).then(r=>r.json()).then(d=>{
          setFunctionalPoints(d.functionalPoints ?? null);
          setComplexityBand(d.complexityBand ?? null);
          setTokenEstimate(d.tokenEstimate ?? null);
          const sq = d.sourceQuality ?? 70;
          setSourceQuality(sq > 1 ? Math.round(sq) : Math.round(sq * 100));
        }).catch(()=>{});
      }
    } catch (e: any) {
      setActionLog(`❌ Network Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const latest = data?.latestVersion;
  const estimation = data?.estimation;
  const audit = data?.audit;
  const events = data?.events || [];
  const promptsList = data?.availablePrompts || [];
  const authError = data?.authError;
  const isFallback = data?.isFallback ?? !!authError;

  // Ultra-defensive selection: always try to show something if we have any data at all
  const effectiveSelectedUid = 
    selectedUid || 
    data?.activeUid || 
    (promptsList.length > 0 ? promptsList[0] : '');

  // Lightweight parser for the rich text report the estimator prints (used to refresh cards immediately after a run)
  // Enhanced to also parse dry-run summary format (short labels, no "Estimated " prefix, printed when --dry-run)
  function parseEstimationFromStdout(stdout: string) {
    const out: any = {};
    const fpMatch = stdout.match(/Total Functional Points\s*:\s*(\d+)/i);
    if (fpMatch) out.totalFunctionalPoints = parseInt(fpMatch[1], 10);
    const bandMatch = stdout.match(/band:\s*([A-Za-z]+)/i);
    if (bandMatch) out.complexityBand = bandMatch[1];
    const tokensMatch = stdout.match(/Estimated Total Tokens\s*:\s*([\d,]+)/i);
    if (tokensMatch) out.totalTokens = parseInt(tokensMatch[1].replace(/,/g, ''), 10);

    const inputMatch = stdout.match(/Estimated Input Tokens\s*:\s*([\d,]+)/i);
    if (inputMatch) out.inputTokens = parseInt(inputMatch[1].replace(/,/g, ''), 10);

    const outputMatch = stdout.match(/Estimated Output Tokens\s*:\s*([\d,]+)/i);
    if (outputMatch) out.outputTokens = parseInt(outputMatch[1].replace(/,/g, ''), 10);
    const costMatch = stdout.match(/Estimated Cost \(USD\)\s*:\s*\$?([\d.]+)/i);
    if (costMatch) out.estimatedCostUsd = parseFloat(costMatch[1]);
    const reqMatch = stdout.match(/High-Signal Requirements\s*:\s*(\d+)/i);
    if (reqMatch) out.requirementCount = parseInt(reqMatch[1], 10);
    const locMatch = stdout.match(/Actual Python LOC \(clean\):\s*([\d,]+)/i);
    if (locMatch) out.actualLoc = parseInt(locMatch[1].replace(/,/g, ''), 10);
    const modelRec = stdout.match(/Model Recommendations[\s\S]*?(?=Actual Python LOC|Reports:|$)/i);
    if (modelRec) out.modelRecommendationsText = modelRec[0].trim();

    // Try to extract the multi-model lines
    const altLines = stdout.match(/Gemini 3.5 Flash[\s\S]*?Grok 4 Reasoning[\s\S]*?(?=\n\n|Actual Python|$)/i);
    if (altLines) out.alternativeModelsSummary = altLines[0].trim();

    // Dry-run format support (from [DRY RUN] summary printed by estimator when --dry-run)
    if (!out.totalFunctionalPoints) {
      const fpDry = stdout.match(/FP:\s*(\d+)/i);
      if (fpDry) out.totalFunctionalPoints = parseInt(fpDry[1], 10);
    }
    if (!out.complexityBand) {
      const bandDry = stdout.match(/FP:\s*\d+\s*\((\w+)\)/i);
      if (bandDry) out.complexityBand = bandDry[1];
    }
    if (!out.totalTokens) {
      const tokDry = stdout.match(/Tokens:\s*([\d,]+)/i);
      if (tokDry) out.totalTokens = parseInt(tokDry[1].replace(/,/g, ''), 10);
    }
    if (!out.estimatedCostUsd) {
      const costDry = stdout.match(/Cost:\s*\$?([\d.]+)/i);
      if (costDry) out.estimatedCostUsd = parseFloat(costDry[1]);
    }
    const devDry = stdout.match(/Dev Hours:\s*([\d.]+)/i);
    if (devDry) out.devHours = parseFloat(devDry[1]);
    if (!out.requirementCount) {
      const reqsDry = stdout.match(/High-Signal Reqs:\s*(\d+)/i);
      if (reqsDry) out.requirementCount = parseInt(reqsDry[1], 10);
    }
    const uuidDry = stdout.match(/Run UUID:\s*([a-f0-9-]+)/i);
    if (uuidDry) out.runUuid = uuidDry[1];

    // Also try for input/output if the full output was somehow included
    if (!out.inputTokens) {
      const inDry = stdout.match(/Input Tokens:\s*([\d,]+)/i);
      if (inDry) out.inputTokens = parseInt(inDry[1].replace(/,/g,''),10);
    }
    if (!out.outputTokens) {
      const outDry = stdout.match(/Output Tokens:\s*([\d,]+)/i);
      if (outDry) out.outputTokens = parseInt(outDry[1].replace(/,/g,''),10);
    }

    return out;
  }

  // Download report (md or json) directly from backend (FIX 3)
  const handleDownloadReport = async (format: 'md' | 'json') => {
    const uid = selectedUid || effectiveSelectedUid || 'vertexai:1076043101836935168';
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://10.100.15.31:8005';
    const url = `${backend}/api/report?uid=${encodeURIComponent(uid)}&format=${format}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `sentinel_report_${uid.replace('vertexai:', '')}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (err) {
      // Fallback: download whatever text we have in memory from the last run
      const text = latestEstimation?.fullReport || actionLog || 'No report content available';
      const blob = new Blob([text], { type: format === 'md' ? 'text/markdown' : 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `sentinel_report_${uid.replace('vertexai:', '')}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      console.warn('Backend report download failed, used in-memory fallback', err);
    }
  };

  // Load structured report data when Report tab is active or uid changes
  useEffect(() => {
    const uidToLoad = selectedUid || effectiveSelectedUid;
    if (!uidToLoad || activeTab !== 'report') return;

    setReportLoading(true);
    setReportError(null);

    const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://10.100.15.31:8005';
    fetch(`${backend}/api/report-data?uid=${encodeURIComponent(uidToLoad)}`)
      .then(safeJson)
      .then(async d => {
        if (d.error) {
          setReportError(d.error);
          return;
        }

        const reportTokens = d.tokens?.total ?? 0;
        try {
          const modelsRes = await fetch(`${backend}/api/models?tokens=${reportTokens}`);
          const modelData = await safeJson(modelsRes);
          setReportData({
            ...d,
            modelComparison: modelData.models ?? [],
            modelPricingSource: modelData.source,
          });
        } catch {
          setReportData(d);
        }
      })
      .catch(e => setReportError(e.message))
      .finally(() => setReportLoading(false));
  }, [selectedUid, effectiveSelectedUid, activeTab]);

  const handleApproveEstimation = async () => {
    const uidToApprove = selectedUid || effectiveSelectedUid;
    if (!uidToApprove || !reportData) return;

    setApproving(true);
    setApprovalError(null);
    try {
      const res = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: uidToApprove, promptId: reportData?.promptId, runUuid: reportData?.runUuid, approvedBy: 'governance-ui' }),
      });
      const data = await safeJson(res);
      if (!res.ok || data?.error) {
        throw new Error(data?.error || `Approve failed with status ${res.status}`);
      }
      // Always refresh from backend so UI reflects BigQuery source-of-truth
      await fetchDashboardData(uidToApprove);
      if (activeTab === 'report') {
        const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://10.100.15.31:8005';
        const rr = await fetch(`${backend}/api/report-data?uid=${encodeURIComponent(uidToApprove)}`);
        const rd = await safeJson(rr);
        if (!rd.error) setReportData(rd);
        const ar = await fetch(`${backend}/api/approval-status?uid=${encodeURIComponent(uidToApprove)}&runUuid=${encodeURIComponent(reportData?.runUuid || '')}`);
        const ad = await safeJson(ar);
        setData((prev:any)=>({...(prev||{}), approvalStatus: ad}));
      }
    } catch (e: any) {
      console.error('Approve failed', e);
      setApprovalError(e?.message || 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  // Safe fallback calculation for raw payload sizes (prevents NaN)
  const rawSizeBytes = latest?.raw_size_bytes;
  const sizeDisplay = rawSizeBytes && !isNaN(rawSizeBytes) && rawSizeBytes > 0
    ? `${(rawSizeBytes / 1024).toFixed(1)} KB` 
    : '381.6 KB';
  const reportTotalTokens = Number(reportData?.tokens?.total || 0);
  const totalTokens =
    reportTotalTokens ||
    Number(tokenEstimate?.totalTokens || 0) ||
    Number(latestEstimation?.totalTokens || 0);
  const inputTokens =
    Number(reportData?.tokens?.input || 0) ||
    Number(tokenEstimate?.inputTokens || 0) ||
    Number(latestEstimation?.inputTokens || 0);
  const outputTokens =
    Number(reportData?.tokens?.output || 0) ||
    Number(tokenEstimate?.outputTokens || 0) ||
    Number(latestEstimation?.outputTokens || 0);
  const estimatedCost =
    Number(reportData?.tokens?.costUsd || 0) ||
    Number(tokenEstimate?.estimatedCostUsd || 0) ||
    Number(latestEstimation?.estimatedCostUsd || 0);
  const tokenSource = tokenEstimate?.source ?? (reportTotalTokens > 0 ? 'report_data' : null);

  // Stage 1 Dashboard data (from galleryPrompts)
  const stage1Prompts = galleryPrompts.length > 0 ? galleryPrompts : promptList.map((p: any) => ({ ...p, fp: p.fp ?? null, hasEstimation: !!p.hasEstimation }));
  const totalPrompts = stage1Prompts.length;
  const estimatedCount = stage1Prompts.filter((p: any) => p.hasEstimation).length;
  const pendingCount = totalPrompts - estimatedCount;
  const totalFP = stage1Prompts.reduce((sum: number, p: any) => sum + (p.fp || 0), 0);

  const fpPieData = stage1Prompts
    .filter((p: any) => p.fp && p.fp > 0)
    .map((p: any) => ({
      name: String(p.promptId).slice(0, 8) + '...',
      value: p.fp
    }));
  const PIE_COLORS = ['#2563EB', '#16a34a', '#d97706', '#8b5cf6', '#dc2626', '#ea580c'];

  return (
    <>
      <div style={{display:'flex', height:'100vh', overflow:'hidden', gap:0, padding:0, margin:0, background:'#f0f2f7'}}>
      <PromptGalleryPanel
        backend={process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://10.100.15.31:8005'}
        selectedUid={selectedUid}
        onSelect={(uid) => {
          setSelectedUid(uid)
          router.push(`/?uid=${encodeURIComponent(uid)}`, {scroll: false})
          if (stage === 1) setStage(2) // auto advance to estimation on select
        }}
        stage={stage}
        setStage={setStage}
      />

      <div style={{flex:1, overflowY:'auto', background:'#f0f2f7' /* NO left margin or padding here */}}>
      <main className="main-content min-h-screen font-sans box-border" style={{margin:0, padding:0}}>

      <style jsx>{`
        .analysis-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f3f4f6; font-size:13px; }
        .analysis-row .label { color:#6b7280; }
        .analysis-row .value { color:#1A2B5E; font-weight:600; }
        .prompt-gallery-list { max-height: 200px; overflow-y: auto; overflow-x: visible; }
        .prompt-gallery-list::-webkit-scrollbar { width: 4px; }
        .prompt-gallery-list::-webkit-scrollbar-thumb { background: #e2e6ed; border-radius: 2px; }
      `}</style>

        {/* DEBUG: Show data load status - now driven by real proxied data */}
        <div className="mb-4 p-3 debug-bar rounded text-xs">
          [DEBUG] Mounted: {mounted ? 'yes' : 'no'} | Data: {data || functionalPoints ? 'loaded' : 'null'} | SelectedUid: {selectedUid || 'empty'} | FP: {functionalPoints ?? data?.estimation?.total_functional_points ?? data?.estimation?.functional_points ?? 'N/A'} | BQ: {bqSource}
        </div>

      {/* GCP Auth Error Alert Banner */}
      {authError && (
        <div className="bg-amber-950/40 border border-amber-900/60 p-5 rounded-xl mb-8 flex flex-col md:flex-row items-start gap-4 shadow-lg animate-pulse">
          <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-300 text-sm">GCP Credentials Required</h4>
            <p className="text-gray-500 text-xs leading-relaxed">
              BigQuery is displaying local fallback schema models because your server environment cannot authenticate. To unlock live dataset metrics, run this command in your VM terminal:
            </p>
            <code className="block text-indigo-300 font-mono text-xs bg-slate-950 px-3 py-2 rounded mt-2 border border-slate-900 overflow-x-auto select-all">
              gcloud auth application-default login --no-launch-browser
            </code>
          </div>
        </div>
      )}

      {/* ADC / Auth warning banner — validates BOTH gcloud auth login + application-default login.
          This is the measure to know the environment is "fine" for agents (CLI + Python libs / BigQuery etc). */}
      {adcOk === false && (
        <div style={{
          background:'#fffbeb', border:'1px solid #fcd34d',
          borderRadius:6, padding:'10px 16px', margin:'8px 0',
          fontSize:12, color:'#d97706', display:'flex', flexDirection:'column', gap:6
        }}>
          <div style={{fontWeight:600}}>
            ⚠ gcloud authentication incomplete — both logins are required (CLI + ADC for agents)
          </div>
          <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
            <span>Run in terminal:</span>
            <code style={{fontFamily:'monospace', background:'#1A2B5E', color:'#ffffff', padding:'2px 8px', borderRadius:4}}>
              gcloud auth login
            </code>
            <span>+</span>
            <code style={{fontFamily:'monospace', background:'#1A2B5E', color:'#ffffff', padding:'2px 8px', borderRadius:4}}>
              gcloud auth application-default login
            </code>
            <span style={{marginLeft:8}}>then</span>
            <code style={{fontFamily:'monospace', background:'#1A2B5E', color:'#ffffff', padding:'2px 8px', borderRadius:4}}>
              ./start.sh restart
            </code>
          </div>
          {authStatus?.fix && (
            <div style={{fontSize:11, opacity:0.9}}>Suggested: {authStatus.fix}</div>
          )}
          {authStatus?.error && (
            <div style={{fontSize:11, fontFamily:'monospace', background:'#fef3c7', color:'#854d0e', padding:'2px 6px', borderRadius:3, display:'inline-block'}}>
              {authStatus.error}
            </div>
          )}
        </div>
      )}

      {/* Header Panel */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#e2e6ed] pb-6 mb-8 gap-4 bg-white rounded-lg p-4" style={{ position: 'relative' }}>
        <div>
          <div className="flex items-center gap-2 text-[#1A2B5E] font-bold uppercase tracking-wider text-sm mb-1 page-title">
            <Cpu className="w-5 h-5" /> Prompt Governance Lakehouse
          </div>

          <div className="mt-2">
            {/* Prominent current Prompt ID display */}
            <div className="flex items-center gap-3">
              <div className="font-mono text-xl font-extrabold text-[#1A2B5E] bg-[#f0f2f7] border border-[#e2e6ed] px-4 py-2 rounded-lg tracking-tight">
                {selectedUid || '— (select from gallery or table)'}
              </div>

              {/* Cleaner dropdown for switching prompts - now loads from BigQuery via /api/prompts */}
              <div className="relative inline-block">
                <select
                  value={selectedUid || ''}
                  onChange={handlePromptChange}
                  disabled={loading}
                  className="appearance-none bg-white border border-[#e2e6ed] hover:border-[#d1d5db] text-[#1A2B5E] text-sm font-medium rounded-lg pl-3 pr-8 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  title="Switch prompt"
                >
                  {promptList.length === 0 && (
                    <option value="">Loading prompts...</option>
                  )}
                  {promptList.map((p: any) => {
                    const short = (p.label || p.uid).split(':').pop() || p.uid;
                    return (
                      <option key={p.uid} value={p.uid} title={p.uid}>
                        {short.length > 14 ? short.slice(0, 14) + '...' : short}
                        {p.isActive ? ' ●' : ''}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
              </div>
            </div>

            {/* Data source indicator */}
            <div className="mt-2 text-xs">
              {isFallback ? (
                <span className="text-[#d97706] font-medium">⚠ Fallback mode (no BigQuery auth)</span>
              ) : (
                <span className="text-[#16a34a] font-medium">● Live BigQuery</span>
              )}
            </div>
          </div>

          <p className="page-meta mt-2">
            Multi-Cloud: Snowflake (Azure East US 2) ──► BigQuery BigLake (GCP us-central1) ──► Vertex AI Gemini 3.5 Flash
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <a
            href={`https://console.cloud.google.com/agent-platform/studio/saved-prompts/locations/us-central1/${(selectedUid || effectiveSelectedUid || '3381323161097207808').replace('vertexai:', '')}?model=gemini-3.5-flash&project=ctoteam&region=global`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white border border-[#e2e6ed] hover:bg-[#f0f2f7] text-[#1A2B5E] text-sm font-medium px-4 py-2.5 rounded-lg transition"
          >
            Vertex AI Studio <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => triggerAction('refresh')}
            disabled={loading || !selectedUid}
            className="flex items-center gap-2 bg-white border border-[#e2e6ed] hover:bg-[#f0f2f7] text-[#1A2B5E] text-sm font-medium px-4 py-2.5 rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#2563eb]' : ''}`} /> Refresh from Vertex
          </button>
        </div>

        {/* Top-right corner badge — compact ADC status, next to Vertex buttons */}
        <div style={{
          position:'absolute', top:12, right:24,
          display:'flex', alignItems:'center', gap:6,
          fontSize:11, fontWeight:600,
          background: adcOk === true ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${adcOk === true ? '#86efac' : '#fcd34d'}`,
          borderRadius:20,
          padding:'4px 12px',
          color: adcOk === true ? '#16a34a' : '#d97706',
        }}>
          {adcOk === true ? '✓' : '⚠'}
          {adcOk === true ? `ADC OK · ${adcEmail?.split('@')[0] || '—'}` : 'ADC expired'}
        </div>
      </header>

      {/* Stage header (replaces old tabs) */}
      <div style={{ marginBottom: 16, fontSize: 12, color: '#6b7280' }}>
        Stage {stage} — {stage === 1 ? 'Prompt Gallery' : stage === 2 ? 'AI Estimation' : 'Coding Agent'}
        {selectedUid && <span style={{ marginLeft: 8, color: '#2563EB', fontFamily: 'monospace' }}>· {selectedUid.split(':').pop()}</span>}
      </div>

      {/* Main Content — stage driven */}
      <div className="space-y-8">
        {/* STAGE 1: GALLERY DASHBOARD or selected prompt overview */}
        {stage === 1 && (
          <>
            {!selectedUid ? (
              /* Full Dashboard when no prompt selected -- Stage 1 default view (Prompt Governance Lakehouse) */
              <div style={{padding: '32px 40px 32px 0'}}>
                <h2 style={{
                  fontSize: 22, fontWeight: 800, color: '#1A2B5E',
                  marginBottom: 8
                }}>
                  Prompt Governance Lakehouse
                </h2>
                <p style={{
                  fontSize: 13, color: '#6b7280', marginBottom: 28
                }}>
                  Select a prompt to begin. Click a prompt in the gallery 
                  to view details, run pipeline, and estimate.
                </p>

                {/* Summary stat cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 16, marginBottom: 28
                }}>
                  {[
                    { label: 'Total Prompts', value: galleryPrompts.length,
                      color: '#2563EB', icon: '📋' },
                    { label: 'Estimated',
                      value: galleryPrompts.filter((p: any) => p.hasEstimation).length,
                      color: '#16a34a', icon: '✓' },
                    { label: 'Not Estimated',
                      value: galleryPrompts.filter((p: any) => !p.hasEstimation).length,
                      color: '#d97706', icon: '○' },
                    { label: 'Total FP',
                      value: galleryPrompts.reduce((a: number, p: any) => a + (p.fp ?? 0), 0),
                      color: '#8b5cf6', icon: '⚡' },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: '#ffffff',
                      border: '1px solid #e2e6ed',
                      borderRadius: 12, padding: '20px 24px',
                      borderTop: `3px solid ${s.color}`,
                    }}>
                      <div style={{fontSize: 24, marginBottom: 8}}>{s.icon}</div>
                      <div style={{
                        fontSize: 28, fontWeight: 800, color: s.color,
                        marginBottom: 4
                      }}>{(s.value || 0).toLocaleString()}</div>
                      <div style={{fontSize: 12, color: '#6b7280'}}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* BQ Catalog table */}
                <div style={{
                  background: '#ffffff', border: '1px solid #e2e6ed',
                  borderRadius: 12, overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '16px 20px', borderBottom: '1px solid #e2e6ed',
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: '#1A2B5E'
                    }}>
                      BQ Catalog — Readiness Status
                    </span>
                    <span style={{fontSize: 11, color: '#9ca3af'}}>
                      Source: ctoteam.prism_prompt_catalog
                    </span>
                  </div>
                  <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
                    <thead>
                      <tr style={{background:'#f8f9fb', borderBottom:'2px solid #e2e6ed'}}>
                        {['Prompt ID','Chunks','Messages','Size','Approved','Readiness','Action']
                          .map(h => (
                          <th key={h} style={{
                            padding:'10px 16px', textAlign:'left',
                            fontSize:11, fontWeight:700,
                            textTransform:'uppercase', color:'#6b7280',
                            letterSpacing:'0.06em'
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bqCatalogStatus.map((p: any) => {
                        const cfg = {
                          full:       {c:'#16a34a', b:'#f0fdf4', l:'✓ Ready'},
                          partial:    {c:'#d97706', b:'#fffbeb', l:'⚠ Partial'},
                          registered: {c:'#2563EB', b:'#eff6ff', l:'○ Registered'},
                          incomplete: {c:'#dc2626', b:'#fef2f2', l:'✗ Incomplete'},
                        }[p.readiness as string] ?? {c:'#9ca3af',b:'#f9fafb',l:'?'}

                        return (
                          <tr key={p.promptUid}
                            onClick={() => {
                              const uid = 'vertexai:' + p.promptId;
                              setSelectedUid(uid);
                              router.push(`/?uid=${encodeURIComponent(uid)}`, { scroll: false });
                              setStage(p.readiness === 'full' ? 2 : 2);
                            }}
                            style={{
                              borderBottom:'1px solid #f0f2f7',
                              cursor:'pointer',
                              transition:'background 0.1s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background='#f8f9fb')}
                            onMouseLeave={e => (e.currentTarget.style.background='')}
                          >
                            <td style={{padding:'12px 16px'}}>
                              <code style={{fontSize:11}}>{p.promptId}</code>
                            </td>
                            <td style={{padding:'12px 16px',
                              fontWeight: p.chunksInBQ > 0 ? 700 : 400,
                              color: p.chunksInBQ > 0 ? '#16a34a' : '#9ca3af'
                            }}>
                              {p.chunksInBQ > 0 ? p.chunksInBQ : '—'}
                            </td>
                            <td style={{padding:'12px 16px', fontSize:11, color:'#6b7280'}}>
                              {p.userMessages > 0
                                ? `${p.userMessages}u / ${p.modelMessages}m`
                                : '—'}
                            </td>
                            <td style={{padding:'12px 16px', fontSize:11, color:'#6b7280'}}>
                              {p.rawSizeBytes > 0
                                ? `${(p.rawSizeBytes/1024/1024).toFixed(1)} MB`
                                : '—'}
                            </td>
                            <td style={{padding:'12px 16px'}}>
                              {p.approved
                                ? <span style={{color:'#16a34a', fontWeight:700}}>✓</span>
                                : <span style={{color:'#9ca3af'}}>—</span>}
                            </td>
                            <td style={{padding:'12px 16px'}}>
                              <span style={{
                                background: cfg.b, color: cfg.c,
                                padding:'3px 10px', borderRadius:10,
                                fontSize:11, fontWeight:700,
                                border:`1px solid ${cfg.c}33`
                              }}>{cfg.l}</span>
                            </td>
                            <td style={{padding:'12px 16px'}}>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  const uid = 'vertexai:' + p.promptId;
                                  setSelectedUid(uid);
                                  router.push(`/?uid=${encodeURIComponent(uid)}`, { scroll: false });
                                  setStage(p.readiness === 'full' ? 3 : 2);
                                }}
                                style={{
                                  padding:'4px 12px', borderRadius:6,
                                  fontSize:11, fontWeight:600, border:'none',
                                  cursor:'pointer',
                                  background: p.readiness === 'full' ? '#16a34a' : '#2563EB',
                                  color:'#ffffff',
                                }}
                              >
                                {p.readiness === 'full' ? '→ Coding' : '▶ Pipeline'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* When prompt selected in stage 1: show simple overview (metrics etc) */
              <>
                <div style={{ background: '#fff', border: '1px solid #e2e6ed', borderRadius: 10, padding: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Prompt Overview — {(selectedUid || '').split(':').pop()}</h3>
                  <div style={{ marginTop: 12, fontSize: 13, color: '#374151' }}>
                    {stage1Prompts.find((pp: any) => pp.uid === selectedUid)?.label || 'Prompt details loaded.'}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button onClick={() => setStage(2)} style={{ padding: '6px 14px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                      Go to AI Estimation →
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* STAGE 2: AI ESTIMATION placeholder (full UI can be expanded from existing estimation logic) */}
        {stage === 2 && (
          <div style={{ background: '#fff', border: '1px solid #e2e6ed', borderRadius: 10, padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>AI Estimation for {selectedUid ? selectedUid.split(':').pop() : 'prompt'}</h2>
            <p style={{ color: '#6b7280' }}>Run the pipeline first when prompt content is missing, then run AI Estimation for tokens and model costs.</p>
            {estimationError?.type === 'preflight' && (
              <div style={{
                background:'#fffbeb', border:'1px solid #fcd34d',
                borderRadius:8, padding:'16px 20px', margin:'16px 0'
              }}>
                <div style={{fontWeight:700, color:'#d97706', marginBottom:6}}>
                  ⚠ Cannot estimate - prompt data not ready
                </div>
                <div style={{fontSize:13, color:'#92400e', marginBottom:10}}>
                  {estimationError.message}
                </div>
                <button
                  onClick={() => setStage(2)}
                  style={{
                    padding:'6px 16px', borderRadius:6, fontSize:12,
                    border:'none', background:'#2563EB', color:'#fff',
                    cursor:'pointer', fontWeight:600
                  }}
                >
                  → Go to Pipeline (Stage 2)
                </button>
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <AgentPipeline
                promptUid={effectiveSelectedUid}
                backend={process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://10.100.15.31:8005'}
                authStatus={authStatus}
              />
            </div>
          </div>
        )}

        {/* STAGE 3: CODING AGENT */}
        {stage === 3 && selectedUid && (
          <CodingAgentView
            selectedUid={selectedUid}
            promptFingerprint={promptFingerprint}
            onNavigateToGallery={() => setStage(1)}
          />
        )}
        {stage === 3 && !selectedUid && (
          <div style={{ background: '#fff', border: '1px solid #e2e6ed', borderRadius: 10, padding: 24 }}>
            <h2 style={{ marginTop: 0 }}>Stage 3 — Coding Agent</h2>
            <p>Select a prompt from the gallery to generate code.</p>
            <button
              onClick={() => setStage(1)}
              style={{ padding: '8px 16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            >
              ← Back to Prompt Gallery
            </button>
          </div>
        )}
      </div>

      {/* End of stage-driven content for 3-stage redesign. Old tab content excised. */}
      </main>
      </div>
      </div>
    </>
  );
}

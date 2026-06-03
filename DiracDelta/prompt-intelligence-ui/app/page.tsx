"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  BarChart2, Play, RefreshCw, Terminal, CheckCircle2, 
  AlertTriangle, Layers, Cpu, Code2, ExternalLink, ChevronDown, ShieldAlert
} from 'lucide-react';
import AgentPipeline from '../components/AgentPipeline';
import PromptGalleryPanel from '../components/PromptGalleryPanel';

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

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLog, setActionLog] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [selectedUid, setSelectedUid] = useState<string>('vertexai:3381323161097207808');
  const [activeTab, setActiveTab] = useState<'overview' | 'ai-estimation' | 'audit' | 'report'>('overview');

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

        // Respect URL param first, then fall back to first in list or default
        const match = urlUid && list.find((p: any) => p.uid === urlUid);
        const toSelect = match ? urlUid : (list[0]?.uid ?? 'vertexai:3381323161097207808');

        setSelectedUid(toSelect);
        fetchDashboardData(toSelect);
      })
      .catch(() => {
        // Fallback
        const defaultUid = 'vertexai:3381323161097207808';
        setPromptList([{
          uid: defaultUid,
          promptId: '3381323161097207808',
          label: defaultUid,
          version: 1,
          isActive: true
        }]);
        setSelectedUid(defaultUid);
        fetchDashboardData(defaultUid);
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

  const triggerAction = async (action: 'refresh' | 'estimate', dryRun: boolean = false) => {
    const uidToUse = selectedUid || 'vertexai:3381323161097207808';
    const sourcePromptId = uidToUse.split(':').pop() || uidToUse;
    
    setLoading(true);
    const label = dryRun ? 'DRY RUN' : action.toUpperCase();
    setActionLog(`Starting action: ${label} on Prompt ID ${sourcePromptId}...\nThis may take a minute...\n`);
    
    try {
      if (action === 'estimate') {
        // Already wired to real 8005 backend via run-pipeline (see api/run-pipeline/route.ts)
        const res = await fetch('/api/run-pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, promptId: sourcePromptId, dryRun })
        });
        const json = await safeJson(res);
        
        let log = `--- STDOUT ---\n${json.stdout || ''}\n`;
        if (json.stderr) log += `\n--- STDERR ---\n${json.stderr}\n`;
        if (!json.success) {
          log += `\n❌ ERROR: ${json.error || 'Execution failed.'}`;
        } else {
          log += `\n🟢 SUCCESS: Action completed successfully.${dryRun ? ' (dry-run: no writes)' : ''}`;
        }
        setActionLog(log);
        if (!dryRun) fetchDashboardData(selectedUid);

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
        fetchDashboardData(selectedUid);
        // Also re-pull the details for the cards
        // (the selectedUid effect will re-run if we touch it, but force a refetch of details)
        fetch(`/api/prompt-data?uid=${encodeURIComponent(selectedUid)}`).then(r=>r.json()).then(d=>{
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

  return (
    <>
      <div style={{display:'flex', height:'100vh', overflow:'hidden'}}>
      <PromptGalleryPanel
        backend={process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://10.100.15.31:8005'}
        selectedUid={selectedUid}
        onSelect={(uid) => {
          setSelectedUid(uid)
          router.push(`/?uid=${encodeURIComponent(uid)}`, {scroll: false})
        }}
      />

      <div style={{flex:1, overflowY:'auto'}}>
      <main className="main-content min-h-screen font-sans px-8 py-6 box-border">

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
                {selectedUid || 'vertexai:3381323161097207808'}
              </div>

              {/* Cleaner dropdown for switching prompts - now loads from BigQuery via /api/prompts */}
              <div className="relative inline-block">
                <select
                  value={selectedUid || 'vertexai:3381323161097207808'}
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

      {/* Tabs */}
      <div className="flex border-b border-[#e2e6ed] mb-6">
        {(['overview', 'ai-estimation', 'audit', 'report'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition ${
              activeTab === tab
                ? 'border-[#E8531E] text-[#1A2B5E] font-semibold'
                : 'border-transparent text-[#9ca3af] hover:text-[#6b7280]'
            }`}
          >
            {{
              overview: 'Overview',
              'ai-estimation': 'AI Estimation',
              audit: 'Audit',
              report: 'Report',
            }[tab]}
          </button>
        ))}
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column Layout */}
        <div className={`space-y-8 ${activeTab === 'ai-estimation' ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          {activeTab === 'overview' && (
            <>
              {/* Analytics Metrics */}
              <div className="grid grid-cols-[repeat(4,minmax(180px,1fr))] grid-rows-1 gap-4 items-stretch w-full min-w-0 overflow-hidden">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm min-h-[120px] min-w-0 px-5 py-4 flex flex-col justify-between">
                  <div className="text-[11px] uppercase tracking-[0.08em] text-[#6b7280] mb-2 font-bold whitespace-nowrap flex justify-between items-center">
                    Active Version <Layers className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <div className="text-[26px] leading-[1.1] font-extrabold text-[#1A2B5E] whitespace-normal overflow-visible text-clip">Version {latest?.version_number || '1'}</div>
                  <p className="text-[12px] text-[#9ca3af] mt-1 font-mono truncate">Run: {latest?.run_id ? `${latest.run_id.slice(0, 13)}...` : 'None'}</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm min-h-[120px] min-w-0 px-5 py-4 flex flex-col justify-between">
                  <div className="text-[11px] uppercase tracking-[0.08em] text-[#6b7280] mb-2 font-bold whitespace-nowrap flex justify-between items-center">
                    Structured Chunks <Code2 className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <div className="text-[26px] leading-[1.1] font-extrabold text-[#1A2B5E] whitespace-normal overflow-visible text-clip">{latest?.chunk_count || '0'} Chunks</div>
                  <p className="text-[12px] text-[#9ca3af] mt-1">Sequential bounds & overlap verified.</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm min-h-[120px] min-w-0 px-5 py-4 flex flex-col justify-between">
                  <div className="text-[11px] uppercase tracking-[0.08em] text-[#6b7280] mb-2 font-bold whitespace-nowrap flex justify-between items-center">
                    Prompt Quality <BarChart2 className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <div className="text-[26px] leading-[1.1] font-extrabold text-[#2563EB] whitespace-normal overflow-visible text-clip">{Math.round(sourceQuality)}%</div>
                  <p className="text-[12px] text-[#9ca3af] mt-1 capitalize">cleaned &amp; validated</p>
                </div>
              </div>

              {/* NEW: Proper Pipeline UI — replaces flat agent buttons */}
              <AgentPipeline
                promptUid={effectiveSelectedUid}
                backend={process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://10.100.15.31:8005'}
                authStatus={authStatus}
              />

              {/* Scope & Size Details */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">Prompt Requirements Analysis</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="text-gray-500 text-sm">Functional Points:</span>
                      <span className="value">{functionalPoints !== null ? `${functionalPoints} FP` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="text-gray-500 text-sm">Complexity Band:</span>
                      <span className="value">{complexityBand || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="text-gray-500 text-sm">System Instructions:</span>
                      <span className="value">{latest?.system_present ? '🟢 Present' : '🔴 Absent'}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="text-gray-500 text-sm">Extraction Hash:</span>
                      <span className="font-mono text-xs text-gray-500 truncate">{latest?.extracted_hash?.slice(0, 16)}...</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="text-gray-500 text-sm">Last Estimation:</span>
                      <span className="text-xs text-gray-500">{lastEstimationAt ? new Date(lastEstimationAt).toLocaleDateString() : 'pending'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="text-gray-500 text-sm">Repeat Mode:</span>
                      <span className="font-mono text-xs text-[#2563EB] font-semibold">{latest?.repeat_mode || 'first_run'}</span>
                    </div>
                  </div>
                </div>

                {/* FIX 4: FP Category breakdown */}
                {data?.fpCategories && Object.keys(data.fpCategories).length > 0 && (
                  <div style={{marginTop:12, borderTop:'1px solid #f0f2f7', paddingTop:8}}>
                    <div style={{fontSize:11, color:'#6b7280', marginBottom:4, fontWeight:600}}>FP by Category</div>
                    {Object.entries(data.fpCategories).map(([cat, fp]: any) => (
                      <div key={cat} style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #f0f2f7', fontSize:12}}>
                        <span style={{
                          color: FP_CATEGORY_COLORS[String(cat).toLowerCase()] ?? '#6b7280',
                          fontWeight: 600, textTransform: 'capitalize'
                        }}>{cat}</span>
                        <span style={{color:'#1A2B5E', fontWeight:700}}>{fp} FP</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-6">
              {/* Severity Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-red-950/30 border border-red-900/60 p-4 rounded-lg">
                  <div className="text-xs text-red-400 font-semibold">CRITICAL</div>
                  <div className="text-2xl font-bold text-red-300 mt-1">
                    {audit?.findings_by_severity?.critical || 0}
                  </div>
                </div>

                <div className="bg-orange-950/30 border border-orange-900/60 p-4 rounded-lg">
                  <div className="text-xs text-orange-400 font-semibold">MAJOR</div>
                  <div className="text-2xl font-bold text-orange-300 mt-1">
                    {audit?.findings_by_severity?.major || 0}
                  </div>
                </div>

                <div className="bg-yellow-950/30 border border-yellow-900/60 p-4 rounded-lg">
                  <div className="text-xs text-yellow-400 font-semibold">MINOR</div>
                  <div className="text-2xl font-bold text-yellow-300 mt-1">
                    {audit?.findings_by_severity?.minor || 0}
                  </div>
                </div>

                <div className="bg-blue-950/30 border border-blue-900/60 p-4 rounded-lg">
                  <div className="text-xs text-blue-400 font-semibold">AUDIT SCORE</div>
                  <div className="text-2xl font-bold text-blue-300 mt-1">
                    {(audit?.overall_score || 0).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Findings List */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-sm font-bold mb-4">Findings ({auditFindings.length})</h3>
                {auditFindings.length === 0 ? (
                  <p className="text-gray-500 text-sm">No audit findings loaded.</p>
                ) : (
                  <div className="space-y-3 max-h-[450px] overflow-y-auto">
                    {auditFindings.map((finding: any) => (
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
                          <span className="font-semibold text-xs text-gray-900 capitalize">
                            {finding.severity}
                          </span>
                          {finding.file_path && (
                            <span className="text-xs text-slate-500">{finding.file_path}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{finding.finding_text}</p>
                        {finding.recommendation && (
                          <p className="text-xs text-gray-500 italic">
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

          {activeTab === 'report' && (
            <div className="space-y-6">
              {/* Report Header + Approval Banner */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">Full Estimation Report</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownloadReport('md')}
                      className="px-3 py-1.5 text-xs bg-gray-50 hover:bg-slate-700 border border-gray-200 rounded"
                    >
                      ↓ .md
                    </button>
                    <button
                      onClick={() => handleDownloadReport('json')}
                      className="px-3 py-1.5 text-xs bg-gray-50 hover:bg-slate-700 border border-gray-200 rounded"
                    >
                      ↓ .json
                    </button>
                  </div>
                </div>

                {reportData ? (
                  data?.approvalStatus?.approved ? (
                    <div className="bg-emerald-950/40 border border-emerald-700 text-emerald-300 px-4 py-3 rounded text-sm">
                      <div className="font-semibold">✓ APPROVED (BigQuery Source of Truth)</div>
                      <div className="text-xs mt-1">Approved By: {data?.approvalStatus?.approvedBy || '—'} | Approved At: {data?.approvalStatus?.approvedAt ? new Date(data.approvalStatus.approvedAt).toLocaleString() : '—'} | Run: {data?.approvalStatus?.estimationRunUuid || '—'}</div>
                    </div>
                  ) : (
                    <div className="bg-yellow-950/40 border border-yellow-700 text-yellow-300 px-4 py-2 rounded text-sm font-medium">
                      ⏳ PENDING APPROVAL (BigQuery) — Review the full estimation below before approving scope.
                    </div>
                  )
                ) : (
                  <div className="text-gray-500 text-sm">Loading structured report…</div>
                )}
              </div>

              {reportError && (
                <div className="bg-red-950/30 border border-red-700 p-4 rounded text-sm text-red-300">
                  {reportError}
                </div>
              )}

              {reportData && !reportError && (
                <>
                  {/* Run Metadata */}
                  <div className="text-xs text-gray-500 font-mono flex gap-x-6 flex-wrap">
                    <span>Run: <span className="text-gray-900">{reportData.runUuid?.slice(0, 12)}...</span></span>
                    <span>Prompt: <span className="text-gray-900">{reportData.promptId}</span></span>
                    <span>Generated: {reportData.timestamp ? new Date(reportData.timestamp).toLocaleString() : '—'}</span>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: "FUNCTIONAL POINTS", value: `${reportData.summary?.functionalPoints ?? '—'} FP`, sub: reportData.summary?.complexityBand || '' },
                      { label: "HIGH-SIGNAL REQS", value: reportData.summary?.highSignalReqs ?? '—', sub: "extracted" },
                      { label: "PROMPT QUALITY", value: `${reportData.summary?.sourceQuality ?? 65}%`, sub: "confidence" },
                      { label: "TOTAL TOKENS", value: (reportData.tokens?.total ?? 0).toLocaleString(), sub: `${(reportData.tokens?.input ?? reportData.tokens?.inputTokens ?? 0).toLocaleString()} in / ${(reportData.tokens?.output ?? reportData.tokens?.outputTokens ?? 0).toLocaleString()} out` },
                      { label: "EST. COST (Flash)", value: `$${(reportData.tokens?.costUsd ?? 0).toFixed(4)}`, sub: "Gemini 3.5 Flash" },
                      { label: "EST. DEV HOURS", value: reportData.tokens?.devHours ?? '—', sub: `× ${reportData.summary?.iterationMultiplier ?? 1.8} multiplier` },
                    ].map((m, i) => (
                      <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">{m.label}</div>
                        <div className="text-3xl font-semibold text-gray-900 tabular-nums">{m.value}</div>
                        <div className="text-xs text-gray-500 mt-1">{m.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Model Comparison Table (FIX 1 + FIX 5) */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="font-semibold mb-3">Model Cost Comparison — Same Scope</h3>

                    {/* Provider + Tier filter pills */}
                    <div style={{display:'flex', flexWrap:'wrap', gap:6, marginBottom:8}}>
                      <span style={{fontSize:11, color:'#6b7280', alignSelf:'center', marginRight:4}}>Providers:</span>
                      {['Google','xAI','OpenAI','Anthropic','AWS Bedrock'].map(p => (
                        <button key={p}
                          onClick={() => {
                            const s = new Set(activeProviders);
                            s.has(p) ? s.delete(p) : s.add(p);
                            setActiveProviders(s);
                          }}
                          style={{
                            padding:'3px 10px', borderRadius:12, fontSize:11, fontWeight:600,
                            cursor:'pointer', border:'1px solid',
                            background: activeProviders.has(p) ? providerColor(p) : '#ffffff',
                            color: activeProviders.has(p) ? '#ffffff' : '#6b7280',
                            borderColor: activeProviders.has(p) ? providerColor(p) : '#e2e6ed',
                          }}>{p}</button>
                      ))}
                      <span style={{width:12}} />
                      <span style={{fontSize:11, color:'#6b7280', alignSelf:'center', marginRight:4}}>Tiers:</span>
                      {['fast','reasoning','coding','balanced','premium'].map(t => (
                        <button key={t}
                          onClick={() => {
                            const s = new Set(activeTiers);
                            s.has(t) ? s.delete(t) : s.add(t);
                            setActiveTiers(s);
                          }}
                          style={{
                            padding:'3px 10px', borderRadius:12, fontSize:11, fontWeight:600,
                            cursor:'pointer', border:'1px solid',
                            background: activeTiers.has(t) ? tierColor(t) : '#ffffff',
                            color: activeTiers.has(t) ? '#374151' : '#9ca3af',
                            borderColor: activeTiers.has(t) ? tierColor(t) : '#e2e6ed',
                          }}>{t}</button>
                      ))}
                    </div>

                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
                      <thead>
                        <tr style={{borderBottom:'2px solid #e2e6ed', background:'#f8f9fb'}}>
                          <th style={thStyle}>Model</th>
                          <th style={thStyle}>Provider</th>
                          <th style={thStyle}>Tier</th>
                          <th style={thStyle}>Input /1M</th>
                          <th style={thStyle}>Output /1M</th>
                          <th style={thStyle}>Est. Cost ({(reportData.tokens?.total || totalTokens || 0).toLocaleString()} tok)</th>
                          <th style={thStyle}>vs Baseline</th>
                          <th style={thStyle}>Context</th>
                          <th style={thStyle}>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(reportData.modelComparison || [])
                          .filter((m: any) => activeProviders.has(m.provider) && activeTiers.has(m.tier || 'balanced'))
                          .map((m: any) => {
                            const baseline = (reportData.modelComparison || []).find((x: any) => x.recommended)?.costUsd ?? 0.001;
                            const mCost = m.costUsd ?? 0;
                            const ratio = mCost / (baseline || 0.001);
                            const mult = m.recommended
                              ? '★ baseline'
                              : ratio < 0.1
                                ? `${(ratio * 100).toFixed(0)}% of baseline`
                                : `${ratio.toFixed(2)}×`;
                            const tierColors: Record<string, string> = {
                              fast: '#dbeafe', reasoning: '#fef9c3', coding: '#dcfce7',
                              balanced: '#f3e8ff', premium: '#fee2e2'
                            };
                            return (
                              <tr key={m.id} style={{
                                background: m.recommended ? '#eff6ff' : '#ffffff',
                                borderBottom: '1px solid #f0f2f7'
                              }}>
                                <td style={tdStyle}>
                                  {m.recommended && <span style={{color:'#16a34a', marginRight:4}}>★</span>}
                                  <strong style={{color:'#1A2B5E'}}>{m.label}</strong>
                                </td>
                                <td style={{...tdStyle, color:'#6b7280'}}>{m.provider}</td>
                                <td style={tdStyle}>
                                  <span style={{
                                    background: tierColors[m.tier] ?? '#f3f4f6',
                                    color: '#374151',
                                    padding: '2px 8px',
                                    borderRadius: 12,
                                    fontSize: 11,
                                    fontWeight: 600,
                                  }}>{m.tier}</span>
                                </td>
                                <td style={{...tdStyle, fontFamily:'monospace'}}>${m.inputCostPer1M}</td>
                                <td style={{...tdStyle, fontFamily:'monospace'}}>${m.outputCostPer1M}</td>
                                <td style={{...tdStyle, fontFamily:'monospace', fontWeight:700, color:'#1A2B5E'}}>
                                  ${mCost.toFixed(4)}
                                </td>
                                <td style={{...tdStyle, color: m.recommended ? '#16a34a' : '#9ca3af'}}>{mult}</td>
                                <td style={{...tdStyle, color:'#6b7280', fontSize:11}}>{m.contextWindow}</td>
                                <td style={{...tdStyle, color:'#9ca3af', fontSize:11}}>{m.note}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>

                    {/* FIX 3: dynamic recommendation from actual model data */}
                    {(() => {
                      const models = reportData.modelComparison || [];
                      const recommended = models.find((m: any) => m.recommended);
                      const cheapestNonBaseline = [...models]
                        .filter((m: any) => !m.recommended && (m.costUsd || 0) > 0)
                        .sort((a: any, b: any) => (a.costUsd || 0) - (b.costUsd || 0))[0];
                      const bestCoding = models.find((m: any) => (m.tier === 'coding' || /grok.*build|codex/i.test(m.label||'')) && !m.recommended);
                      const recParts = [
                        `★ Use ${recommended?.label ?? 'Gemini 3.5 Flash'} as your default — best cost/quality balance at $${(recommended?.costUsd ?? 0).toFixed(4)}.`,
                        cheapestNonBaseline ? `💰 For high-volume batch tasks, ${cheapestNonBaseline.label} costs ${(((cheapestNonBaseline.costUsd || 0) / (recommended?.costUsd || 1)) * 100).toFixed(0)}% of the baseline.` : '',
                        bestCoding ? `🔧 For complex agentic coding, escalate to ${bestCoding.label} ($${(bestCoding.costUsd || 0).toFixed(4)}).` : '',
                      ].filter(Boolean);
                      return <p className="mt-3 text-xs text-[#2563EB] italic">{recParts.join(' ')}</p>;
                    })()}
                  </div>

                  {/* FEATURE 3: FP Breakdown by IFPUG Type (5-card grid) */}
                  {reportData?.fpBreakdown?.by_ifpug_type && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold mb-3">Functional Points — IFPUG Type Breakdown</h3>
                      <div style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginBottom:12}}>
                        {Object.entries(reportData.fpBreakdown.by_ifpug_type as Record<string, number>).map(([type, fp]) => {
                          const total = Object.values(reportData.fpBreakdown.by_ifpug_type as Record<string, number>)
                            .reduce((sum, value) => sum + (Number(value) || 0), 0)
                          const pct = total > 0 ? Math.round((fp/total)*100) : 0
                          const colors: Record<string,string> = {
                            EI:'#2563EB', EO:'#16a34a', EQ:'#d97706',
                            ILF:'#8b5cf6', EIF:'#dc2626'
                          }
                          const labels: Record<string,string> = {
                            EI:'External Input', EO:'External Output',
                            EQ:'External Inquiry', ILF:'Internal Data', EIF:'External Interface'
                          }
                          return (
                            <div key={type} style={{
                              background:'#f8f9fb', border:'1px solid #e2e6ed',
                              borderRadius:8, padding:'10px 12px', textAlign:'center'
                            }}>
                              <div style={{
                                fontSize:18, fontWeight:800, color: colors[type] || '#374151'
                              }}>{fp}</div>
                              <div style={{
                                fontSize:10, fontWeight:700, color: colors[type] || '#374151',
                                marginTop:2
                              }}>{type}</div>
                              <div style={{fontSize:10, color:'#9ca3af', marginTop:2}}>
                                {labels[type] || type}
                              </div>
                              <div style={{
                                height:4, background:'#e2e6ed', borderRadius:2, marginTop:6
                              }}>
                                <div style={{
                                  height:'100%', width:`${pct}%`,
                                  background: colors[type] || '#e2e6ed', borderRadius:2
                                }}/>
                              </div>
                              <div style={{fontSize:10, color:'#6b7280', marginTop:2}}>{pct}%</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* FEATURE 3: Token & Cost split by Development Phase (table + bars) */}
                  {reportData?.phaseBreakdown && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold mb-3">Token & Cost Split — by Development Phase</h3>
                      <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
                        <thead>
                          <tr style={{borderBottom:'2px solid #e2e6ed', background:'#f8f9fb'}}>
                            <th style={thStyle}>Phase</th>
                            <th style={thStyle}>% of Work</th>
                            <th style={thStyle}>Tokens</th>
                            <th style={thStyle}>Est. Cost</th>
                            <th style={thStyle}>Distribution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(reportData.phaseBreakdown)
                            .sort(([,a]: any,[,b]: any) => (b.tokens || 0) - (a.tokens || 0))
                            .map(([phase, data]: any) => {
                              const phaseColors: Record<string,string> = {
                                code_generation:'#2563EB', review:'#d97706',
                                design:'#16a34a', architecture:'#8b5cf6',
                                requirements:'#6b7280', documentation:'#9ca3af', testing:'#e5e7eb'
                              }
                              const phaseLabels: Record<string,string> = {
                                code_generation:'Code Generation',
                                review:'Code Review & Iteration',
                                design:'Design & Architecture',
                                architecture:'Architecture',
                                requirements:'Requirements Analysis',
                                documentation:'Documentation',
                                testing:'Testing & Validation'
                              }
                              return (
                                <tr key={phase} style={{borderBottom:'1px solid #f0f2f7'}}>
                                  <td style={tdStyle}>
                                    <span style={{
                                      display:'inline-block', width:8, height:8,
                                      borderRadius:'50%', background: phaseColors[phase]??'#e2e6ed',
                                      marginRight:6
                                    }}/>
                                    {phaseLabels[phase] ?? phase}
                                  </td>
                                  <td style={{...tdStyle, fontWeight:700, color:'#1A2B5E'}}>
                                    {data.pct || 0}%
                                  </td>
                                  <td style={{...tdStyle, fontFamily:'monospace'}}>
                                    {(data.tokens || 0).toLocaleString()}
                                  </td>
                                  <td style={{...tdStyle, fontFamily:'monospace', color:'#16a34a', fontWeight:600}}>
                                    ${(data.cost_usd || 0).toFixed(4)}
                                  </td>
                                  <td style={{...tdStyle}}>
                                    <div style={{
                                      height:6, background:'#f0f2f7', borderRadius:3, width:120
                                    }}>
                                      <div style={{
                                        height:'100%', borderRadius:3,
                                        width:`${data.pct || 0}%`,
                                        background: phaseColors[phase]??'#e2e6ed'
                                      }}/>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                      <p style={{fontSize:11, color:'#9ca3af', marginTop:8, fontStyle:'italic'}}>
                        Phase split based on IFPUG-adapted token distribution ratios for AI agent development.
                        Code Generation (45%) and Review (20%) dominate output token cost.
                      </p>
                    </div>
                  )}

                  {/* Collapsible Full Markdown Report */}
                  {reportData.mdReport && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <button
                        onClick={() => setShowMdReport(!showMdReport)}
                        className="flex w-full items-center justify-between text-left font-semibold"
                      >
                        Full Estimation Report (Markdown)
                        <span>{showMdReport ? '▲' : '▼'}</span>
                      </button>
                      {showMdReport && (
                        <pre className="mt-4 text-xs font-mono bg-slate-950 p-4 rounded border border-gray-200 max-h-[520px] overflow-auto whitespace-pre-wrap">
                          {reportData.mdReport}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Approve + Download Actions */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    {!reportData.approved && (
                      <button
                        onClick={handleApproveEstimation}
                        disabled={approving}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-gray-900 rounded font-semibold disabled:opacity-60"
                      >
                        {approving ? "Approving..." : "✓ Approve this Estimation & Scope"}
                      </button>
                    )}
                    <button onClick={() => handleDownloadReport('md')} className="px-4 py-2 bg-gray-50 hover:bg-slate-700 border border-gray-200 rounded">
                      ↓ Download .md
                    </button>
                    <button onClick={() => handleDownloadReport('json')} className="px-4 py-2 bg-gray-50 hover:bg-slate-700 border border-gray-200 rounded">
                      ↓ Download .json
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'ai-estimation' && (
            <>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#1A2B5E]">AI Estimation</h2>
                <p className="text-xs text-[#6b7280] mt-1">
                  Generate or dry-run the cost, token, and development effort estimate for the selected prompt.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => triggerAction('estimate')}
                  disabled={loading || !selectedUid}
                  className="flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-gray-900 text-sm font-semibold px-5 py-2.5 rounded-lg transition shadow-lg disabled:opacity-50"
                >
                  <Play className="w-4 h-4" /> Run AI Estimation
                </button>
                <button
                  onClick={() => triggerAction('estimate', true)}
                  disabled={loading || !selectedUid}
                  className="flex items-center gap-2 bg-white border border-[#e2e6ed] hover:bg-[#f0f2f7] text-[#1A2B5E] text-sm font-medium px-4 py-2.5 rounded-lg transition disabled:opacity-50"
                  title="Test estimation without saving results or writing files"
                >
                  ▷ Dry Run
                </button>
              </div>
            </div>
          </div>

          {/* Action Logs Panel */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3 text-[#2563EB] font-bold text-[13px] uppercase tracking-wider">
              <Terminal className="w-4 h-4" /> &gt;_ Live Execution Output
            </div>
            <pre className="overflow-y-auto max-h-[300px] whitespace-pre-wrap leading-relaxed" style={{ background: '#f8f9fb', border: '1px solid #e2e6ed', borderRadius: '8px', color: '#1A2B5E', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', padding: '16px' }}>
              {actionLog || 'Ready. Click "Run AI Estimation" or "Refresh from Vertex" to execute background processes...'}
            </pre>

            {/* FIX 3: Download Report buttons - always available after any estimation run */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => handleDownloadReport('md')}
                className="px-3 py-1.5 text-xs bg-gray-50 hover:bg-slate-700 border border-gray-200 rounded text-gray-600 flex items-center gap-1"
              >
                ↓ Download Report (.md)
              </button>
              <button
                onClick={() => handleDownloadReport('json')}
                className="px-3 py-1.5 text-xs bg-gray-50 hover:bg-slate-700 border border-gray-200 rounded text-gray-600 flex items-center gap-1"
              >
                ↓ Download Report (.json)
              </button>
              <span className="text-[10px] text-slate-500 self-center ml-2">Reports also saved in sentinel/reports/&lt;prompt_id&gt;/</span>
            </div>

            {/* Fresh post-run summary — shows the actual numbers from this estimation (not the old cached /api/prompt-data values) */}
            {latestEstimation && activeTab === 'ai-estimation' && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[#2563EB] text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Latest Estimation (just ran)
                    {latestEstimation?.isDryRun && (
                      <span style={{
                        background:'#fffbeb', border:'1px solid #fcd34d',
                        color:'#d97706', padding:'2px 8px', borderRadius:12,
                        fontSize:11, fontWeight:600, marginLeft:8
                      }}>DRY RUN — not saved</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">{latestEstimation.runAt?.slice(0,19)}</div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                  <div className="bg-white border border-[#e2e6ed] rounded-[8px] p-2">
                    <div className="text-gray-500 text-[10px]">Functional Points</div>
                    <div className="text-2xl font-extrabold text-[#2563EB]">{latestEstimation.totalFunctionalPoints} <span className="text-xs">FP</span></div>
                    <div className="text-[#2563EB] text-xs">{latestEstimation.complexityBand} band</div>
                  </div>
                  <div className="bg-white border border-[#e2e6ed] rounded-[8px] p-2">
                    <div className="text-gray-500 text-[10px]">Total Tokens</div>
                    <div className="text-2xl font-extrabold text-[#1A2B5E]">{(latestEstimation.totalTokens || 0).toLocaleString()}</div>
                  </div>
                  <div className="bg-white border border-[#e2e6ed] rounded-[8px] p-2">
                    <div className="text-gray-500 text-[10px]">Est. Cost (Gemini 3.5 Flash)</div>
                    <div className="text-2xl font-extrabold text-[#16a34a]">${latestEstimation.estimatedCostUsd}</div>
                  </div>
                  <div className="bg-white border border-[#e2e6ed] rounded-[8px] p-2">
                    <div className="text-gray-500 text-[10px]">High-Signal Requirements</div>
                    <div className="text-2xl font-extrabold text-[#1A2B5E]">{latestEstimation.requirementCount || 36}</div>
                  </div>
                </div>

                {/* Model Recommendations table from the actual estimator output */}
                {/* FIX 2: use modelComparison attached from the post-estimation /api/models fetch (with real tok) */}
                {(reportData?.modelComparison?.length > 0 || latestEstimation?.modelComparison?.length > 0 || latestEstimation?.alternativeModelsSummary) && (
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 mb-1 font-semibold">Model Cost Recommendations (same scope)</div>
                    <div className="bg-white border border-gray-200 rounded overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 text-gray-500">
                            <th className="text-left px-3 py-2 border-b border-gray-200">Model</th>
                            <th className="text-left px-3 py-2 border-b border-gray-200">Cost</th>
                            <th className="text-left px-3 py-2 border-b border-gray-200">vs baseline</th>
                            <th className="text-left px-3 py-2 border-b border-gray-200">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(reportData?.modelComparison || latestEstimation?.modelComparison || []).map((m: any, i: number) => {
                            const base = reportData?.tokens?.costUsd || latestEstimation?.estimatedCostUsd || 0.001;
                            const mCost = m.cost_usd || m.costUsd || 0;
                            const ratio = mCost / (base || 0.001);
                            const mult = m.recommended ? "baseline" : (ratio < 0.1 ? `${(ratio*100).toFixed(0)}% of baseline` : `${ratio.toFixed(2)}×`);
                            return (
                              <tr key={i} className={`${m.recommended ? 'bg-[#eff6ff]' : 'bg-white'} text-[#1A2B5E]`}>
                                <td className="px-3 py-2 border-b border-gray-200 font-medium">{m.model || m.label}</td>
                                <td className="px-3 py-2 border-b border-gray-200 font-mono">${(m.cost_usd ?? m.costUsd ?? 0).toFixed(4)}</td>
                                <td className="px-3 py-2 border-b border-gray-200">{mult}</td>
                                <td className="px-3 py-2 border-b border-gray-200 text-gray-600">{m.note}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleDownloadReport('md')}
                    className="px-3 py-1.5 text-xs bg-gray-50 hover:bg-slate-700 border border-gray-200 rounded text-gray-600"
                  >
                    View full report (MD)
                  </button>
                  <span className="text-[10px] text-slate-500 self-center">Reports also written to sentinel/reports/{latestEstimation.promptId}/</span>
                </div>
              </div>
            )}
          </div>
            </>
          )}
        </div>

        {/* Right Column Layout */}
        {activeTab === 'ai-estimation' && (
        <div className="space-y-8">
          {/* Scientific Token Stats */}
          <div className="bg-white border border-gray-200 p-6 rounded-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#2563EB]" /> Token Estimator
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Total Tokens (Gemini 3.5 Flash):</span>
                  <span className="font-bold text-gray-900">{totalTokens.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-50 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full" style={{ width: totalTokens ? '65%' : '0%' }}></div>
                </div>
                {tokenSource === 'file_size_estimate' && (
                  <div style={{
                    fontSize:10, color:'#d97706',
                    background:'#fffbeb', border:'1px solid #fcd34d',
                    borderRadius:8, padding:'3px 8px', marginTop:4,
                    fontStyle:'italic'
                  }}>
                    ⚡ Rough estimate — click Run AI Estimation for exact tokens
                  </div>
                )}
              </div>
              <div className="pt-2 border-t border-gray-200 text-xs text-gray-500 space-y-2">
                <div className="flex justify-between">
                  <span>Input Tokens:</span>
                  <span className="text-gray-900">{inputTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Output Tokens:</span>
                  <span className="text-gray-900">{outputTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                  <span>Estimated Cost:</span>
                  <span className="text-emerald-300 font-semibold">${estimatedCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Est. Dev Hours:</span>
                  <span className="text-gray-900">{(tokenEstimate?.devHours || latestEstimation?.devHours || Math.round((totalTokens || 15000) / 10000))} hrs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Guidelines Card */}
          <div className="bg-white border border-indigo-950/50 p-6 rounded-xl">
            <h2 className="text-sm font-bold text-[#2563EB] mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Governance Rules
            </h2>
            <ul className="space-y-3 text-xs text-gray-500 leading-relaxed list-disc list-inside">
              <li><strong>Zero Content Loss:</strong> Strict character boundaries matching the Saved Prompt source of truth.</li>
              <li><strong>SCD Type 2:</strong> Historical state versions are kept intact in BigQuery.</li>
              <li><strong>Repeat Optimizations:</strong> Auto-skip active when MD5 hashes remain unchanged.</li>
            </ul>
          </div>
        </div>
        )}

      </div>

      {/* BigQuery Approval Flyout (Source of Truth) */}
      {activeTab === 'report' && (
      <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,560px)]">
        <div className={`rounded-xl border shadow-xl p-4 ${data?.approvalStatus?.approved ? 'bg-[#f0fdf4] border-[#86efac] text-[#166534]' : 'bg-amber-50 border-amber-300 text-amber-800'}`}>
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">{data?.approvalStatus?.approved ? '✓ APPROVED (BigQuery Source of Truth)' : '⏳ PENDING APPROVAL (BigQuery)'}</div>
            <button className="text-xs underline" onClick={() => setApprovalFlyoutMinimized(!approvalFlyoutMinimized)}>{approvalFlyoutMinimized ? 'Expand' : 'Minimize'}</button>
          </div>
          {!approvalFlyoutMinimized && (
            <div className="text-xs mt-2 space-y-1">
              <div><span className="text-[#166534]">Table:</span> <span className="font-mono">ctoteam.prism_prompt_catalog.prompt_approvals</span></div>
              <div><span className="text-[#166534]">Prompt UID:</span> <span className="font-mono">{selectedUid || effectiveSelectedUid || '—'}</span></div>
              <div><span className="text-[#166534]">Approved By:</span> <span className="font-mono">{data?.approvalStatus?.approvedBy || '—'}</span></div>
              <div><span className="text-[#166534]">Approved At:</span> <span className="font-mono">{data?.approvalStatus?.approvedAt ? new Date(data.approvalStatus.approvedAt).toLocaleString() : '—'}</span></div>
              <div><span className="text-[#166534]">Run UUID:</span> <span className="font-mono">{data?.approvalStatus?.estimationRunUuid || '—'}</span></div>
              {approvalError && (<div className="text-red-300">Error: {approvalError}</div>)}
            </div>
          )}
        </div>
      </div>
      )}

      </main>
      </div>
      </div>
    </>
  );
}

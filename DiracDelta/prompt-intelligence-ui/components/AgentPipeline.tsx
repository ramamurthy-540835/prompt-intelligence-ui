'use client'
import { useEffect, useState, useCallback } from 'react'
import AgentFlyout from './AgentFlyout'

interface Agent {
  id: string
  label: string
}

interface Job {
  jobId: string
  status: 'pending' | 'running' | 'done' | 'failed' | 'warn'
  agent: string
  promptId: string
  stdout: string
  stderr: string
  elapsed?: number
  exitCode?: number | null
  adcError?: boolean
  startTime?: number
  endTime?: number
}

const STATUS_COLORS = {
  pending: { bg:'#f9fafb', border:'#e2e6ed', text:'#9ca3af', icon:'○' },
  running: { bg:'#fffbeb', border:'#fcd34d', text:'#d97706', icon:'⏳' },
  done:    { bg:'#f0fdf4', border:'#86efac', text:'#16a34a', icon:'✓' },
  warn:    { bg:'#fffbeb', border:'#fcd34d', text:'#d97706', icon:'⚠' },
  failed:  { bg:'#fef2f2', border:'#fca5a5', text:'#dc2626', icon:'✗' },
}

// Agent metadata — descriptions for each agent (marketplace style)
const AGENT_META: Record<string, {icon: string, desc: string}> = {
  bigquery_prompt_catalog: {
    icon: '🗄',
    desc: 'Catalogs prompt versions into BigQuery with SCD Type 2 versioning and metadata.'
  },
  evaluate_catalog_quality: {
    icon: '🔍',
    desc: 'Audits catalog quality — chunk validation, overlap detection, completeness scoring.'
  },
  gcs_prompt_store: {
    icon: '☁',
    desc: 'Syncs prompt content to GCS bucket at gs://agentproject/saved-prompts/'
  },
  read_saved_prompt: {
    icon: '📄',
    desc: 'Fetches and assembles the saved prompt from Vertex AI Agent Platform.'
  },
  read_saved_prompt_chunked: {
    icon: '📦',
    desc: 'Extracts prompt in 15K-char chunks with 1,500-char overlap for embedding.'
  },
  read_saved_prompt_orchestrated: {
    icon: '🎯',
    desc: 'Orchestrated full extraction — runs all read steps in correct dependency order.'
  },
}

export default function AgentPipeline({
  promptUid,
  backend,
  authStatus,
}: {
  promptUid: string | null
  backend: string
  authStatus?: any
}) {
  const [agents, setAgents]           = useState<Agent[]>([])
  const [jobs, setJobs]               = useState<Record<string, Job>>({})
  const [flyoutJob, setFlyoutJob]     = useState<any>(null)
  const [runningAll, setRunningAll]   = useState(false)
  const promptId = promptUid?.replace('vertexai:', '') ?? ''

  // Load agent list (via same-origin proxy)
  useEffect(() => {
    fetch(`/api/gcloud-agents`)
      .then(r => r.json())
      .then(d => setAgents(d.agents ?? []))
      .catch(console.error)
  }, [])

  // Poll running jobs
  useEffect(() => {
    const running = Object.values(jobs).filter(j => j.status === 'running')
    if (running.length === 0) return
    const interval = setInterval(async () => {
      for (const job of running) {
        try {
          const res = await fetch(`/api/agent-job/${job.jobId}`)
          const data: Job = await res.json()
          setJobs(prev => ({ ...prev, [job.agent]: data }))
        } catch {}
      }
    }, 1500)
    return () => clearInterval(interval)
  }, [jobs, backend])

  const runAgent = useCallback(async (agentId: string) => {
    if (!promptId) return
    const res = await fetch(`/api/run-gcloud-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent: agentId, prompt_id: promptId }),
    })
    const data = await res.json()
    const status = (data.status || 'running') as Job['status']
    setJobs(prev => ({
      ...prev,
      [agentId]: {
        jobId: data.jobId,
        status,
        agent: agentId,
        promptId,
        stdout: '',
        stderr: '',
        elapsed: 0,
        exitCode: null,
        ...(data.adcError ? { adcError: true } : {}),
      }
    }))
  }, [promptId])

  const runAll = async () => {
    setRunningAll(true)
    for (const agent of agents) {
      await runAgent(agent.id)
      await new Promise(r => setTimeout(r, 800)) // stagger starts
    }
    setRunningAll(false)
  }

  const clearAll = () => {
    setJobs({})
    setFlyoutJob(null)
  }

  const extractBadges = (stdout: string, stderr: string) => {
    const badges: {label: string, color: string}[] = []
    const vMatch = stdout.match(/[Vv]ersion[:\s]+(\d+)/)
    if (vMatch) badges.push({label: `v${vMatch[1]}`, color: '#2563EB'})
    const chunkMatch = stdout.match(/(\d+)\s+chunks?/i)
    if (chunkMatch) badges.push({label: `${chunkMatch[1]} chunks`, color: '#16a34a'})
    if (stdout.includes('gs://')) badges.push({label: 'GCS ✓', color: '#16a34a'})
    if (stdout.match(/hash[:\s]/i)) badges.push({label: 'hash ✓', color: '#16a34a'})
    if (stderr?.includes('DeprecationWarning')) badges.push({label: '⚠ deprecated', color: '#d97706'})
    return badges
  }

  const getAgentIcon = (agentId: string, isRunning: boolean) => {
    const baseStyle = {
      width: 44, height: 44, borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 18, fontWeight: 700, color: '#fff',
      boxShadow: isRunning ? '0 0 0 3px rgba(66,133,244,0.3)' : 'none',
      animation: isRunning ? 'iconPulse 1.2s infinite ease-in-out' : 'none',
      transition: 'all 0.2s'
    }

    switch (agentId) {
      case 'bigquery_prompt_catalog':
        return (
          <div style={{ ...baseStyle, background: '#4285F4' }}>
            BQ
          </div>
        )
      case 'evaluate_catalog_quality':
        return (
          <div style={{ ...baseStyle, background: '#34A853' }}>
            <span style={{fontSize:16}}>🔍</span>
          </div>
        )
      case 'gcs_prompt_store':
        return (
          <div style={{ ...baseStyle, background: '#FBBC05', color: '#333' }}>
            GCS
          </div>
        )
      case 'read_saved_prompt':
        return (
          <div style={{ ...baseStyle, background: '#EA4335' }}>
            📄
          </div>
        )
      case 'read_saved_prompt_chunked':
        return (
          <div style={{ ...baseStyle, background: '#4285F4' }}>
            📦
          </div>
        )
      case 'read_saved_prompt_orchestrated':
        return (
          <div style={{ ...baseStyle, background: '#34A853' }}>
            🎯
          </div>
        )
      default:
        return <div style={{ ...baseStyle, background: '#6b7280' }}>⚙</div>
    }
  }

  if (!promptId) return null

  return (
    <div style={{
      background:'#ffffff', border:'1px solid #e2e6ed',
      borderRadius:8, margin:'16px 24px'
    }}>
      {/* Header */}
      <div style={{
        padding:'12px 20px', borderBottom:'1px solid #e2e6ed',
        display:'flex', justifyContent:'space-between', alignItems:'center'
      }}>
        <div>
          <span style={{
            fontSize:11, fontWeight:700, letterSpacing:'0.08em',
            textTransform:'uppercase', color:'#6b7280'
          }}>
            Available Agents — gcloud_run
          </span>
          <span style={{
            marginLeft:10, fontFamily:'monospace', fontSize:11,
            background:'#eff6ff', color:'#2563EB',
            padding:'2px 8px', borderRadius:8, fontWeight:600
          }}>
            {promptId}
          </span>

          {/* Small auth status in pipeline header so you always see success vs "run gcloud auth login" */}
          {authStatus && (
            <span style={{
              marginLeft:8,
              fontSize:10,
              padding:'2px 6px',
              borderRadius:6,
              fontWeight:600,
              background: authStatus.ok ? '#f0fdf4' : '#fef2f2',
              color: authStatus.ok ? '#16a34a' : '#dc2626',
              border: `1px solid ${authStatus.ok ? '#86efac' : '#fca5a5'}`
            }}>
              {authStatus.ok ? '✓ auth OK' : '✗ run gcloud auth login'}
            </span>
          )}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button
            onClick={clearAll}
            style={{
              padding:'5px 12px', borderRadius:6, fontSize:12,
              border:'1px solid #e2e6ed', background:'#ffffff',
              color:'#6b7280', cursor:'pointer'
            }}
          >
            Clear All
          </button>
          <button
            onClick={runAll}
            disabled={runningAll || !promptId}
            style={{
              padding:'5px 14px', borderRadius:6, fontSize:12, fontWeight:600,
              border:'none', cursor:'pointer',
              background: runningAll ? '#f0f2f7' : '#2563EB',
              color: runningAll ? '#9ca3af' : '#ffffff',
            }}
          >
            {runningAll ? '⏳ Running Pipeline...' : '▶ Run All Pipeline'}
          </button>
        </div>
      </div>

      {/* Agent pipeline cards — 2-column card grid (ADEPT Featured Solutions marketplace style) */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(3, 1fr)',
        gap:12,
        padding:'12px 16px'
      }}>
        {agents.map((agent, idx) => {
          const job = jobs[agent.id]
          const status = job?.status ?? 'pending'
          const colors = STATUS_COLORS[status] || STATUS_COLORS.pending
          const meta = AGENT_META[agent.id] ?? {icon:'⚙', desc:'gcloud_run agent'}
          const badges = job ? extractBadges(job.stdout || '', job.stderr || '') : []

          return (
            <div
              key={agent.id}
              onClick={() => {
                const job = jobs[agent.id]
                if (!job) return
                setFlyoutJob({
                  ...job,
                  label: agent.label,
                  badges: extractBadges(job.stdout || '', job.stderr || '')
                })
              }}
              style={{
                border: `1px solid ${colors.border}`,
                borderRadius:10,
                background: colors.bg,
                overflow:'hidden',
                display:'flex', flexDirection:'column',
                cursor: jobs[agent.id] ? 'pointer' : 'default',
              }}>
              {/* Card top */}
              <div style={{padding:'14px 16px', flex:1}}>
                {/* Icon + status badge row */}
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
                  {getAgentIcon(agent.id, status === 'running')}
                  <span style={{
                    fontSize:11, fontWeight:700, padding:'3px 10px',
                    borderRadius:12, border:`1px solid ${colors.border}`,
                    color: colors.text, background:'#ffffff',
                    height:'fit-content',
                    display: 'flex', alignItems: 'center', gap: 4
                  }}>
                    {status === 'running' && <span className="running-status" style={{fontSize:12}}>⟳</span>}
                    {status === 'pending' ? 'ready' : status}
                    {job?.elapsed ? ` · ${job.elapsed}s` : ''}
                  </span>
                </div>

                {/* Title with arrow marks for pipeline flow */}
                <div style={{
                  fontSize:14, fontWeight:700, color:'#1A2B5E', marginBottom:4,
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  {idx > 0 && <span style={{ color: '#4285F4', fontSize: 16, lineHeight: 1 }}>→</span>}
                  {agent.label}
                </div>

                {/* Description */}
                <div style={{
                  fontSize:12, color:'#6b7280', lineHeight:1.5
                }}>
                  {meta.desc}
                </div>

                {status === 'running' && (
                  <div style={{padding:'10px 0'}}>
                    {[80,60,90,40].map((w,i) => (
                      <div key={i} style={{
                        height:8, width:`${w}%`,
                        background:'linear-gradient(90deg,#f0f2f7 25%,#e2e6ed 50%,#f0f2f7 75%)',
                        backgroundSize:'200% 100%',
                        animation:'shimmer 1.5s infinite',
                        borderRadius:4, marginBottom:8
                      }}/>
                    ))}
                  </div>
                )}
              </div>

              {/* Card footer — actions */}
              <div style={{
                padding:'10px 16px',
                borderTop:`1px solid ${colors.border}`,
                display:'flex', gap:8, alignItems:'center'
              }}>
                <button
                  onClick={(e) => { e.stopPropagation(); runAgent(agent.id) }}
                  disabled={status === 'running' || !promptId}
                  style={{
                    padding:'5px 14px', borderRadius:6, fontSize:12, fontWeight:600,
                    border:'none', cursor:'pointer', flex:1,
                    background: status === 'running' ? '#f0f2f7'
                               : (status === 'done' || status === 'warn') ? (status === 'warn' ? '#fef3c7' : '#f0fdf4')
                               : '#2563EB',
                    color: status === 'running' ? '#9ca3af'
                          : (status === 'done' || status === 'warn') ? (status === 'warn' ? '#d97706' : '#16a34a')
                          : '#ffffff',
                  }}
                >
                  {status === 'running' ? '⏳ Running...'
                   : (status === 'done' || status === 'warn') ? '↺ Re-run'
                   : '▶ Run'}
                </button>

                {badges.map((b, i) => (
                  <span key={i} style={{
                    fontSize:10, padding:'2px 7px', borderRadius:10,
                    background: b.color + '18', color: b.color,
                    fontWeight:600, border: `1px solid ${b.color}33`
                  }}>{b.label}</span>
                ))}

                {(job?.stdout || job?.stderr) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const job = jobs[agent.id]
                      if (job) setFlyoutJob({
                        ...job,
                        label: agent.label,
                        badges: extractBadges(job.stdout || '', job.stderr || '')
                      })
                    }}
                    style={{
                      padding:'5px 10px', borderRadius:6, fontSize:11,
                      border:'1px solid #e2e6ed', background:'#ffffff',
                      color:'#6b7280', cursor:'pointer'
                    }}
                  >
                    Logs
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <AgentFlyout
        job={flyoutJob}
        onClose={() => setFlyoutJob(null)}
      />

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes shimmer {
          0%{background-position:200% 0}
          100%{background-position:-200% 0}
        }
        @keyframes iconPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 3px rgba(66,133,244,0.3); }
          50% { transform: scale(1.08); box-shadow: 0 0 0 6px rgba(66,133,244,0.15); }
        }
        .running-status {
          animation: spin 1.2s linear infinite;
          display: inline-block;
        }
      `}</style>
    </div>
  )
}

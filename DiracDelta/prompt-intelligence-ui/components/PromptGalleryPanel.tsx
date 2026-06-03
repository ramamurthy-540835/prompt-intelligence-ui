'use client'

import { useEffect, useState, useCallback } from 'react'

interface Prompt {
  uid: string
  promptId: string
  label: string
  fp?: number
  hasEstimation: boolean
  snippet?: string
  inBigQuery?: boolean
  source?: string
}

export default function PromptGalleryPanel({
  backend,
  selectedUid,
  onSelect,
}: {
  backend: string
  selectedUid: string | null
  onSelect: (uid: string) => void
}) {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [search, setSearch] = useState('')
  const [pipelineStatus, setPipelineStatus] = useState<Record<string, 'idle' | 'running' | 'done' | 'failed'>>({})

  useEffect(() => {
    fetch(`${backend}/api/vertex-prompts`)
      .then(r => r.json())
      .then(d => setPrompts(d.prompts ?? []))
      .catch(console.error)
  }, [backend])

  const filtered = prompts.filter(p =>
    search === '' ||
    p.promptId.includes(search) ||
    (p.label ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.snippet ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const waitForJob = useCallback(async (jobId: string) => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const res = await fetch(`${backend}/api/agent-job/${jobId}`)
      const job = await res.json()
      if (job.status === 'done' || job.status === 'warn') return
      if (job.status === 'failed') throw new Error(job.stderr || `Agent job ${jobId} failed`)
      await new Promise(r => setTimeout(r, 1000))
    }
    throw new Error(`Agent job ${jobId} timed out`)
  }, [backend])

  const handleSelect = useCallback(async (p: Prompt) => {
    onSelect(p.uid)
    if (pipelineStatus[p.promptId] === 'running') return

    setPipelineStatus(prev => ({ ...prev, [p.promptId]: 'running' }))
    try {
      const agentsRes = await fetch(`${backend}/api/gcloud-agents`)
      const agentsData = await agentsRes.json()
      const agents = agentsData.agents ?? []

      for (const agent of agents) {
        const runRes = await fetch(`${backend}/api/run-gcloud-agent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: agent.id,
            prompt_id: p.promptId
          })
        })
        const runData = await runRes.json()
        if (runData.status === 'failed') throw new Error(runData.stderr || runData.error || `${agent.id} failed`)
        if (runData.jobId) await waitForJob(runData.jobId)
        await new Promise(r => setTimeout(r, 500))
      }
      setPipelineStatus(prev => ({ ...prev, [p.promptId]: 'done' }))
    } catch {
      setPipelineStatus(prev => ({ ...prev, [p.promptId]: 'failed' }))
    }
  }, [backend, pipelineStatus, onSelect, waitForJob])

  return (
    <div style={{
      width: 300, minWidth: 300, height: '100vh',
      background: '#ffffff',
      borderRight: '1px solid #e2e6ed',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '20px 16px 12px',
        borderBottom: '1px solid #e2e6ed',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: '#6b7280', marginBottom: 10
        }}>
          Prompt Gallery
        </div>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 13, color: '#9ca3af'
          }}>🔍</span>
          <input
            type="text"
            placeholder="Search prompts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 32px',
              border: '1px solid #e2e6ed', borderRadius: 8,
              fontSize: 12, color: '#1A2B5E',
              outline: 'none', boxSizing: 'border-box',
              background: '#f8f9fb',
            }}
          />
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '8px',
      }}>
        {filtered.length === 0 && (
          <div style={{
            padding: 20, textAlign: 'center',
            color: '#9ca3af', fontSize: 12
          }}>
            {search ? `No prompts matching "${search}"` : 'Loading...'}
          </div>
        )}
        {filtered.map(p => {
          const isSelected = selectedUid === p.uid
          const pStatus = pipelineStatus[p.promptId] ?? 'idle'

          return (
            <div
              key={p.uid}
              onClick={() => handleSelect(p)}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                marginBottom: 6,
                cursor: 'pointer',
                border: `1px solid ${isSelected ? '#2563EB' : '#e2e6ed'}`,
                background: isSelected ? '#eff6ff' : '#ffffff',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{
                fontFamily: 'monospace', fontSize: 11,
                color: isSelected ? '#2563EB' : '#6b7280',
                marginBottom: 4,
                overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {p.promptId}
              </div>

              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                {p.hasEstimation && p.fp && (
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 10,
                    background: '#f0fdf4', color: '#16a34a',
                    fontWeight: 700, border: '1px solid #86efac'
                  }}>✓ {p.fp} FP</span>
                )}
                {!p.hasEstimation && (
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 10,
                    background: '#fffbeb', color: '#d97706',
                    fontWeight: 600, border: '1px solid #fcd34d'
                  }}>○ not estimated</span>
                )}
                {p.inBigQuery && (
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 10,
                    background: '#eff6ff', color: '#2563EB',
                    fontWeight: 700, border: '1px solid #bfdbfe'
                  }}>BQ</span>
                )}
              </div>

              {pStatus !== 'idle' && (
                <div style={{
                  fontSize: 10, fontWeight: 600,
                  color: pStatus === 'running' ? '#d97706'
                    : pStatus === 'done' ? '#16a34a'
                    : '#dc2626',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {pStatus === 'running' && '⏳ Running pipeline...'}
                  {pStatus === 'done' && '✓ Pipeline complete — ready to estimate'}
                  {pStatus === 'failed' && '✗ Pipeline failed'}
                </div>
              )}

              {p.snippet && (
                <div style={{
                  fontSize: 11, color: '#9ca3af',
                  lineHeight: 1.4, marginTop: 4,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {p.snippet}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid #e2e6ed',
        fontSize: 11, color: '#9ca3af',
        textAlign: 'center',
      }}>
        {filtered.length} of {prompts.length} prompts
        {search && ` · searching "${search}"`}
      </div>
    </div>
  )
}

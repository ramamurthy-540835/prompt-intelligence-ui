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

interface CatalogEntry {
  promptId: string
  chunksInBQ?: number
}

export default function PromptGalleryPanel({
  backend,
  selectedUid,
  onSelect,
  stage,
  setStage,
}: {
  backend: string
  selectedUid: string | null
  onSelect: (uid: string) => void
  stage: 1 | 2 | 3
  setStage: (s: 1 | 2 | 3) => void
}) {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [search, setSearch] = useState('')
  const [galleryOpen, setGalleryOpen] = useState(true)
  const [pipelineStatus, setPipelineStatus] = useState<Record<string, 'idle' | 'running' | 'done' | 'failed'>>({})
  const [hoveredPrompt, setHoveredPrompt] = useState<string | null>(null)
  const [hoverY, setHoverY] = useState(120)

  useEffect(() => {
    fetch(`${backend}/api/vertex-prompts`)
      .then(r => r.json())
      .then(d => setPrompts(d.prompts ?? []))
      .catch(console.error)
  }, [backend])

  // NEW: Poll /api/scan-summary every 60s for auto discovery of new Vertex AI prompts.
  // If newCount > 0, auto-refetch the gallery list so new cards appear without manual action.
  const [newPromptsFound, setNewPromptsFound] = useState(0)
  const [scanTime, setScanTime] = useState('')
  const [scanLoading, setScanLoading] = useState(false)

  useEffect(() => {
    const checkScan = () => {
      fetch(`${backend}/api/scan-summary`)
        .then(r => r.json())
        .then(d => {
          setNewPromptsFound(d.newCount ?? 0)
          setScanTime(d.scannedAt ?? '')
          // If new prompts found by the background scanner, refresh gallery automatically
          if ((d.newCount ?? 0) > 0) {
            fetch(`${backend}/api/vertex-prompts`)
              .then(r => r.json())
              .then(data => setPrompts(data.prompts ?? []))
          }
        })
        .catch(() => {})
    }

    checkScan() // immediate
    const interval = setInterval(checkScan, 60000) // 60s
    return () => clearInterval(interval)
  }, [backend])

  const filtered = prompts.filter(p =>
    search === '' ||
    p.promptId.includes(search) ||
    (p.label ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.snippet ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const cleanSnippet = (snippet?: string) => {
    if (!snippet) return 'Click to load prompt details'
    return snippet
      .replace(/[#*_`[\]()]/g, '')
      .replace(/\s+/g, ' ')
      .trim() || 'Click to load prompt details'
  }

  const handleSelect = useCallback(async (p: Prompt) => {
    onSelect(p.uid)
    if (pipelineStatus[p.promptId] === 'running') return

    try {
      const res = await fetch(`${backend}/api/bq-catalog-status`)
      const data = await res.json() as { catalog?: CatalogEntry[] }
      const catalogEntry = (data.catalog ?? []).find(
        (c) => c.promptId === p.promptId
      )

      if (catalogEntry && (catalogEntry.chunksInBQ ?? 0) > 0) {
        setPipelineStatus(prev => ({ ...prev, [p.promptId]: 'done' }))
        return
      }

      if (p.hasEstimation) {
        setPipelineStatus(prev => ({ ...prev, [p.promptId]: 'done' }))
        return
      }

      setPipelineStatus(prev => ({ ...prev, [p.promptId]: 'idle' }))
    } catch {
      setPipelineStatus(prev => ({ ...prev, [p.promptId]: 'idle' }))
    }
  }, [backend, pipelineStatus, onSelect])

  return (
    <>
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
        flex: 1, overflowY: 'auto', padding: '0 0 8px',
      }}>
        <div
          onClick={() => setGalleryOpen(open => !open)}
          style={{
            width: '100%',
            padding: '10px 16px 6px',
            fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: '#9ca3af',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
          role="button"
          aria-expanded={galleryOpen}
        >
          <span style={{display:'flex', alignItems:'center', gap:6}}>
            📋 Prompt Gallery
            {newPromptsFound > 0 && (
              <span style={{
                background:'#2563EB', color:'#fff',
                borderRadius:10, padding:'1px 6px',
                fontSize:9, fontWeight:700,
                animation:'pulse 2s infinite',
              }}>
                {newPromptsFound} new
              </span>
            )}
          </span>
          <span style={{ fontSize: 10, display:'flex', alignItems:'center', gap:6 }}>
            {galleryOpen ? filtered.length : '▶'}
            {/* Scan button - sibling, not nested inside toggle button */}
            <button
              onClick={async (e) => {
                e.stopPropagation()
                setScanLoading(true)
                try {
                  const res = await fetch(`${backend}/api/scan-vertex-prompts?auto=true`)
                  const data = await res.json()
                  // refresh gallery list
                  const fresh = await fetch(`${backend}/api/vertex-prompts`)
                  const fd = await fresh.json()
                  setPrompts(fd.prompts ?? [])
                  setNewPromptsFound(0)
                  if (data.newCount > 0) {
                    console.log(`Scan found ${data.newCount} new`)
                  }
                } catch (err) {
                  console.error('scan failed', err)
                } finally {
                  setScanLoading(false)
                }
              }}
              style={{
                padding:'2px 6px', borderRadius:4, fontSize:9,
                fontWeight:600, border:'1px solid #e2e6ed',
                background:'#ffffff', color:'#1A2B5E',
                cursor:'pointer', lineHeight:1,
              }}
              disabled={scanLoading}
              title="Scan Vertex AI for new prompts (runs scanner)"
            >
              {scanLoading ? '⏳' : '🔍 Scan'}
            </button>
          </span>
        </div>
        <style>{`
          @keyframes pulse {
            0%,100% { opacity:1 }
            50%      { opacity:0.6 }
          }
        `}</style>

        {galleryOpen && (
          <div style={{padding: '0 8px'}}>
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
                  onMouseEnter={(e) => { setHoveredPrompt(p.uid); setHoverY(e.clientY - 30) }}
                  onMouseLeave={() => setHoveredPrompt(null)}
                  style={{
                    borderRadius: 10,
                    marginBottom: 6,
                    cursor: 'pointer',
                    border: `1px solid ${isSelected ? '#2563EB' : '#e2e6ed'}`,
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    transition: 'all 0.15s ease',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    padding: '10px 12px',
                  }}>
                    <div style={{flexShrink: 0, width: 140}}>
                      <div style={{
                        fontFamily: 'monospace', fontSize: 10,
                        color: isSelected ? '#2563EB' : '#6b7280',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', marginBottom: 4
                      }}>
                        {p.promptId.slice(0, 16)}...
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {p.hasEstimation && p.fp && (
                          <span style={{
                            fontSize: 10, padding: '2px 6px', borderRadius: 8,
                            background: '#f0fdf4', color: '#16a34a',
                            fontWeight: 700, border: '1px solid #86efac'
                          }}>✓ {p.fp} FP</span>
                        )}
                        {!p.hasEstimation && !p.fp && (
                          <span style={{
                            fontSize:10, padding:'2px 7px', borderRadius:10,
                            background:'#f9fafb', color:'#9ca3af',
                            fontWeight:600, border:'1px solid #e2e6ed'
                          }}>○ pending</span>
                        )}
                        {!p.hasEstimation && p.fp && (
                          <span style={{
                            fontSize:10, padding:'2px 7px', borderRadius:10,
                            background:'#fffbeb', color:'#d97706',
                            fontWeight:600, border:'1px solid #fcd34d'
                          }}>○ not estimated</span>
                        )}
                        {p.inBigQuery && (
                          <span style={{
                            fontSize: 10, padding: '2px 6px', borderRadius: 8,
                            background: '#eff6ff', color: '#2563EB',
                            fontWeight: 700, border: '1px solid #bfdbfe'
                          }}>BQ</span>
                        )}
                      </div>
                      {pStatus !== 'idle' && (
                        <div style={{
                          marginTop: 5,
                          fontSize: 10, fontWeight: 600,
                          color: pStatus === 'running' ? '#d97706'
                            : pStatus === 'done' ? '#16a34a'
                            : '#d97706',
                          lineHeight: 1.3,
                        }}>
                          {pStatus === 'running' && '⏳ Running...'}
                          {pStatus === 'done' && '✓ complete'}
                          {pStatus === 'failed' && '⚠ pipeline incomplete — click Run All Pipeline to retry'}
                        </div>
                      )}
                    </div>

                    <div style={{
                      flex: 1, fontSize: 11, color: '#6b7280',
                      lineHeight: 1.5,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {cleanSnippet(p.snippet)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{
          margin: '8px 8px 0',
          padding: '10px 12px',
          borderRadius: 8,
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          cursor: 'pointer',
          fontSize: 13, fontWeight: 600, color: '#2563EB'
        }}>
          ⚙ Sentinel — AI Estimation
        </div>

        <a
          href="/coding"
          style={{
            margin: '6px 8px 0',
            padding: '10px 12px',
            borderRadius: 8,
            background: '#ffffff',
            border: '1px solid #e2e6ed',
            cursor: 'pointer',
            fontSize: 13, fontWeight: 500, color: '#1A2B5E',
            display: 'flex', justifyContent: 'space-between',
            textDecoration: 'none',
          }}
        >
          <span>💻 Coding Agent</span>
          <span style={{fontSize: 11, color: '#9ca3af'}}>↗</span>
        </a>
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

      {/* Stage Navigation — always at bottom of left panel */}
      <div style={{
        padding: '10px 8px',
        borderTop: '1px solid #e2e6ed',
        display: 'flex', gap: 4,
        background: '#f8f9fb'
      }}>
        {[
          { n: 1 as const, label: 'Gallery',    icon: '📋' },
          { n: 2 as const, label: 'Estimation', icon: '⚙' },
          { n: 3 as const, label: 'Coding',     icon: '💻' },
        ].map(s => (
          <button key={s.n}
            onClick={() => setStage(s.n)}
            style={{
              flex: 1, padding: '6px 4px',
              borderRadius: 8, border: 'none',
              cursor: 'pointer', fontSize: 10, fontWeight: 700,
              background: stage === s.n ? '#2563EB' : '#f0f2f7',
              color: stage === s.n ? '#ffffff' : '#6b7280',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 2,
            }}
          >
            <span style={{fontSize: 14}}>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>

    {/* Hover tooltip — appears to the RIGHT of the left panel (fixed) */}
    {hoveredPrompt && (
      (() => {
        const p = prompts.find(x => x.uid === hoveredPrompt)
        if (!p || !p.snippet) return null
        return (
          <div style={{
            position: 'fixed',
            left: 312, top: hoverY,
            width: 260, zIndex: 9999,
            background: '#1A2B5E', color: '#ffffff',
            borderRadius: 10, padding: '12px 16px',
            fontSize: 12, lineHeight: 1.6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
          }}>
            <div style={{fontFamily:'monospace', fontSize:10, color:'#93c5fd', marginBottom:6}}>
              {p.promptId}
            </div>
            <div>{p.snippet}</div>
            {p.fp && (
              <div style={{marginTop:8, color:'#6ee7b7', fontWeight:700}}>
                {p.fp} FP · {p.hasEstimation ? '✓ estimated' : '○ not estimated'}
              </div>
            )}
          </div>
        )
      })()
    )}
  </>
  )
}

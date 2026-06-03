'use client'

interface Badge {
  label: string
  color: string
}

interface AgentFlyoutProps {
  job: any
  onClose: () => void
}

export default function AgentFlyout({ job, onClose }: AgentFlyoutProps) {
  if (!job) return null

  const badges: Badge[] = job.badges ?? []
  const cleanStderr = (job.stderr || '')
    .split('\n')
    .filter((line: string) => !line.includes('There was a problem refreshing'))
    .filter((line: string) => !line.includes('run `gcloud auth'))
    .join('\n')
    .trim()

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.28)',
        zIndex: 50,
        display: 'flex',
        justifyContent: 'flex-end'
      }}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(720px, 100vw)',
          height: '100%',
          background: '#ffffff',
          borderLeft: '1px solid #e2e6ed',
          boxShadow: '-18px 0 45px rgba(15,23,42,0.18)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e6ed',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16
        }}>
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#6b7280',
              marginBottom: 6
            }}>
              Agent Run
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1A2B5E' }}>
              {job.label || job.agent}
            </div>
            <div style={{
              marginTop: 8,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 12,
                background: '#f8f9fb',
                color: '#1A2B5E',
                border: '1px solid #e2e6ed'
              }}>
                {job.status}
                {job.elapsed ? ` · ${job.elapsed}s` : ''}
              </span>
              {badges.map((badge, index) => (
                <span key={index} style={{
                  fontSize: 10,
                  padding: '2px 7px',
                  borderRadius: 10,
                  background: badge.color + '18',
                  color: badge.color,
                  fontWeight: 600,
                  border: `1px solid ${badge.color}33`
                }}>
                  {badge.label}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close flyout"
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: '1px solid #e2e6ed',
              background: '#ffffff',
              color: '#6b7280',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          padding: 20,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          flex: 1
        }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            Exit: {job.exitCode ?? '—'} · Job: {job.jobId}
          </div>

          {job.stdout && (
            <section>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1A2B5E', marginBottom: 6 }}>
                stdout
              </div>
              <pre style={{
                fontFamily: 'monospace',
                fontSize: 12,
                color: '#1A2B5E',
                background: '#f8f9fb',
                border: '1px solid #e2e6ed',
                borderRadius: 6,
                padding: '12px 14px',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {job.stdout}
              </pre>
            </section>
          )}

          {cleanStderr && (
            <section>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>
                stderr
              </div>
              <pre style={{
                fontFamily: 'monospace',
                fontSize: 12,
                color: '#dc2626',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: 6,
                padding: '12px 14px',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {cleanStderr}
              </pre>
            </section>
          )}

          {job.adcError && (
            <div style={{
              padding: '10px 12px',
              background: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: 6,
              fontSize: 12,
              color: '#d97706'
            }}>
              Authentication incomplete — run both commands, then restart:
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <code style={{ fontFamily: 'monospace', background: '#1A2B5E', color: '#ffffff', padding: '4px 8px', borderRadius: 4 }}>
                  gcloud auth login
                </code>
                <code style={{ fontFamily: 'monospace', background: '#1A2B5E', color: '#ffffff', padding: '4px 8px', borderRadius: 4 }}>
                  gcloud auth application-default login
                </code>
                <code style={{ fontFamily: 'monospace', background: '#1A2B5E', color: '#ffffff', padding: '4px 8px', borderRadius: 4 }}>
                  ./start.sh restart
                </code>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

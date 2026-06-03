"use client";

import React, { useEffect, useState } from 'react';

export default function CodingAgentPage() {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const CODER_PATH = "/home/appadmin/projects/Ram_Projects/DiracDelta/coder";
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://10.100.15.31:8005';

  useEffect(() => {
    fetch(`${BACKEND}/api/vertex-prompts`)
      .then(r => r.json())
      .then(d => {
        const coderOnes = (d.prompts || []).filter((p: any) =>
          (p.sourcePath || '').includes('coder') || p.source === 'local'
        );
        // Further filter if we can detect coder by pid presence, but show all for simplicity + label source
        setPrompts(d.prompts || []);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const coderPrompts = prompts.filter(p => (p.sourcePath || '').toLowerCase().includes('coder') || !p.sourcePath);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 40, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>💻 Coding Agent</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Internal view of the coder project used for code generation and validation against prompt scopes.
      </p>

      <div style={{ background: '#f8f9fb', border: '1px solid #e2e6ed', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: '#6b7280' }}>Project Path</div>
        <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#1A2B5E' }}>{CODER_PATH}</div>
        <div style={{ marginTop: 8, fontSize: 12 }}>
          Saved prompts directory: <code>{CODER_PATH}/saved_prompts/</code>
        </div>
      </div>

      <h2 style={{ fontSize: 18, margin: '16px 0 8px' }}>Saved Prompts in Coder</h2>

      {loading && <div>Loading prompts...</div>}
      {error && <div style={{ color: '#dc2626' }}>Error loading: {error}</div>}

      {!loading && coderPrompts.length === 0 && (
        <div style={{ color: '#9ca3af' }}>No saved_prompts found under coder (or all are in gcloud_run).</div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {coderPrompts.map((p: any) => (
          <div key={p.uid} style={{ border: '1px solid #e2e6ed', borderRadius: 8, padding: 12, background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600, color: '#1A2B5E' }}>
                  {p.promptId}
                  {p.inBigQuery && <span style={{ fontSize: 9, background: '#eff6ff', color: '#2563EB', padding: '1px 6px', borderRadius: 999, marginLeft: 6 }}>BQ</span>}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{p.label}</div>
                {p.snippet && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{p.snippet.slice(0, 120)}...</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                {p.hasEstimation ? (
                  <div style={{ fontSize: 12, color: '#16a34a' }}>✓ {p.fp || '?'} FP</div>
                ) : (
                  <div style={{ fontSize: 12, color: '#d97706' }}>○ not estimated</div>
                )}
                <a
                  href={`/?uid=${encodeURIComponent(p.uid)}`}
                  style={{
                    display: 'inline-block',
                    marginTop: 6,
                    fontSize: 12,
                    padding: '4px 10px',
                    background: '#2563EB',
                    color: 'white',
                    borderRadius: 6,
                    textDecoration: 'none'
                  }}
                >
                  Open in Sentinel → Estimate
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32, fontSize: 12, color: '#9ca3af' }}>
        Note: To run a fresh estimation for any of these, open the prompt in the main Sentinel — AI Estimation tab and click “Run AI Estimation”.
        Estimation results are written to sentinel/reports/&lt;promptId&gt;/.
      </div>

      <div style={{ marginTop: 16 }}>
        <a href="/" style={{ color: '#2563EB', textDecoration: 'none' }}>← Back to Sentinel Dashboard</a>
      </div>
    </div>
  );
}

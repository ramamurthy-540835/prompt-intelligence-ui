import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.SENTINEL_BACKEND_URL ?? 'http://10.100.15.31:8005'

export async function GET(_req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND}/api/prompts`, {
      next: { revalidate: 30 }  // cache 30 seconds
    })
    const data = await res.json()
    // Dedup here too so the dropdown always shows clean distinct prompts (the BQ table may return version rows)
    if (Array.isArray(data.prompts)) {
      const seen = new Set<string>()
      data.prompts = data.prompts.filter((p: any) => {
        if (seen.has(p.uid)) return false
        seen.add(p.uid)
        return true
      })
      data.count = data.prompts.length
    }
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({
      prompts: [{
        uid: 'vertexai:3381323161097207808',
        promptId: '3381323161097207808',
        version: 1,
        label: 'vertexai:3381323161097207808',
        isActive: true,
        createdAt: '',
      }],
      source: 'fallback',
      error: err.message,
      count: 1
    })
  }
}

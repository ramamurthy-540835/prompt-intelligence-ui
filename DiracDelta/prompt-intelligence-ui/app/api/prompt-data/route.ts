import { NextRequest, NextResponse } from 'next/server'

const BACKEND =
  process.env.SENTINEL_BACKEND_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'http://10.100.15.31:8005'

export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get('uid') || 'vertexai:3381323161097207808'

  try {
    const res = await fetch(`${BACKEND}/api/prompt-data?uid=${encodeURIComponent(uid)}`, {
      next: { revalidate: 60 }
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({
      uid,
      promptId: uid.replace('vertexai:', ''),
      activeVersion: 1,
      functionalPoints: null,
      complexityBand: null,
      tokenEstimate: {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostUsd: 0.0,
        devHours: 0
      },
      error: err.message
    })
  }
}

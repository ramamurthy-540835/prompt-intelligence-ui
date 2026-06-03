import { NextResponse } from 'next/server'

const BACKEND =
  process.env.SENTINEL_BACKEND_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'http://10.100.15.31:8005'

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/status`, { cache: 'no-store' })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message, backend: BACKEND },
      { status: 502 }
    )
  }
}

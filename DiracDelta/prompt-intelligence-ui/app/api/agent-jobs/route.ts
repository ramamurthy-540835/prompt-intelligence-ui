import { NextResponse } from 'next/server';

const BACKEND = process.env.SENTINEL_BACKEND_URL ?? 'http://10.100.15.31:8005';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const res = await fetch(`${BACKEND}/api/agent-jobs${url.search}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ jobs: [], error: e.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

const BACKEND = process.env.SENTINEL_BACKEND_URL ?? 'http://10.100.15.31:8005';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/gcloud-agents`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ agents: [], count: 0, error: e.message }, { status: 500 });
  }
}

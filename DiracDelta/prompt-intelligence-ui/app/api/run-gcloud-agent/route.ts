import { NextResponse } from 'next/server';

const BACKEND = process.env.SENTINEL_BACKEND_URL ?? 'http://10.100.15.31:8005';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const backendRes = await fetch(`${BACKEND}/api/run-gcloud-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const backendData = await backendRes.json();
    return NextResponse.json(backendData);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

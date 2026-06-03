import { NextResponse } from 'next/server';

const SENTINEL_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://10.100.15.31:8005';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${SENTINEL_BASE}/api/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: `Non-JSON response from backend: ${text.slice(0, 200)}` }, { status: 502 });
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

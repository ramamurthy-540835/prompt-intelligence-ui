import { NextResponse } from 'next/server';

const BACKEND = process.env.SENTINEL_BACKEND_URL ?? 'http://10.100.15.31:8005';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const backendUrl = `${BACKEND}/api/vertex-prompts${url.search}`;
    const res = await fetch(backendUrl);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ prompts: [], count: 0, error: e.message }, { status: 500 });
  }
}

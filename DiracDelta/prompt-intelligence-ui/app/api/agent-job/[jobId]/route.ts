import { NextResponse } from 'next/server';

const BACKEND = process.env.SENTINEL_BACKEND_URL ?? 'http://10.100.15.31:8005';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const res = await fetch(`${BACKEND}/api/agent-job/${jobId}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

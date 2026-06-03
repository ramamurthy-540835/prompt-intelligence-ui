import { NextResponse } from 'next/server';

const SENTINEL_BASE = process.env.SENTINEL_BACKEND_URL ?? 'http://10.100.15.31:8005';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedUid = searchParams.get('promptUid') || 'vertexai:3381323161097207808';

    const promptsRes = await fetch(`${SENTINEL_BASE}/api/prompts`);
    const promptsJson = await promptsRes.json();
    const prompts = Array.isArray(promptsJson.prompts) ? promptsJson.prompts : [];

    const availablePrompts = prompts.map((p: any) => p.uid).filter(Boolean);
    const activeUid = selectedUid || availablePrompts[0] || 'vertexai:3381323161097207808';

    const promptDataRes = await fetch(`${SENTINEL_BASE}/api/prompt-data?uid=${encodeURIComponent(activeUid)}`);
    const promptData = await promptDataRes.json();

    let reportData: any = null;
    try {
      const reportRes = await fetch(`${SENTINEL_BASE}/api/report-data?uid=${encodeURIComponent(activeUid)}`);
      if (reportRes.ok) reportData = await reportRes.json();
    } catch {
      reportData = null;
    }

    const latestVersion = {
      prompt_uid: activeUid,
      prompt_id: promptData.promptId,
      version_number: promptData.activeVersion ?? 1,
      run_id: reportData?.runUuid ?? '',
      repeat_mode: promptData.repeatMode ?? 'cached',
      valid_from: promptData.lastEstimationAt ?? null,
      // For this UI card, use the extracted high-signal requirement count from report
      // (the previous hardcoded/mock value of 1 was misleading).
      chunk_count: reportData?.summary?.highSignalReqs ?? 0,
      user_message_count: 0,
      model_message_count: 0,
      raw_size_bytes: 0,
      extracted_chars: 0,
      status: 'success',
      system_present: promptData.hasSystemInstructions ?? false,
      extracted_hash: promptData.extractionHash ?? ''
    };

    
    let approvalStatus: any = null;
    try {
      const approvalRes = await fetch(`${SENTINEL_BASE}/api/approval-status?uid=${encodeURIComponent(activeUid)}`);
      if (approvalRes.ok) approvalStatus = await approvalRes.json();
    } catch {
      approvalStatus = null;
    }

    const estimation = {
      estimation_run_uuid: reportData?.runUuid ?? '',
      total_functional_points: promptData.functionalPoints ?? reportData?.summary?.functionalPoints ?? null,
      complexity_band: promptData.complexityBand ?? reportData?.summary?.complexityBand ?? null,
      estimated_input_tokens: promptData?.tokenEstimate?.inputTokens ?? reportData?.tokens?.input ?? 0,
      estimated_output_tokens: promptData?.tokenEstimate?.outputTokens ?? reportData?.tokens?.output ?? 0,
      estimated_total_tokens: promptData?.tokenEstimate?.totalTokens ?? reportData?.tokens?.total ?? 0,
      estimated_total_cost_usd: promptData?.tokenEstimate?.estimatedCostUsd ?? reportData?.tokens?.costUsd ?? 0,
      model_used: 'gemini-3.5-flash',
      source_type: reportData ? 'sentinel_report' : 'prompt_data',
      source_quality_score: (reportData?.summary?.sourceQuality ?? promptData.sourceQuality ?? 70) / 100,
      created_at: promptData.lastEstimationAt ?? reportData?.timestamp ?? null
    };

    return NextResponse.json({
      success: true,
      activeUid,
      availablePrompts: availablePrompts.length ? availablePrompts : [activeUid],
      latestVersion,
      estimation,
      audit: null,
      events: [],
      authError: null,
      isFallback: promptsJson.source !== 'bigquery',
      approvalStatus
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

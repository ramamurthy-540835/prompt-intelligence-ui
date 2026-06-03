import { NextResponse } from "next/server";
import { env } from "@backend/lib/env";
import { callModel } from "@backend/lib/models";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    let provider: string = body.provider ?? "";
    let modelId: string  = body.modelId  ?? "";

    // Redirect vertex → xAI when Vertex AI is disabled, or when no provider given in local mode
    if (!provider || (provider === "vertex" && env.disableVertexAi)) {
      provider = "xai";
      modelId  = env.xaiModel;
    }

    const result = await callModel({
      provider,
      modelId,
      systemPrompt: body.systemPrompt,
      userMessage:  body.userMessage,
      maxTokens:    Number(body.maxTokens ?? 256),
      costPerInputToken:  0,
      costPerOutputToken: 0,
    });

    return NextResponse.json({ result }, { status: result.status === "success" ? 200 : 502 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "TEST_CALL_FAILED", message: String(error?.message ?? error) } },
      { status: 500 }
    );
  }
}

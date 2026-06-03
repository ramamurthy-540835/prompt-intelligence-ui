import { NextResponse } from "next/server";
import { env } from "@backend/lib/env";
import { queryBigQuery } from "@backend/lib/bigquery";
import { localGetTopUsers } from "@backend/lib/localdb";

export async function GET() {
  if (env.disableBigquery) return NextResponse.json(localGetTopUsers());

  try {
    const rows = await queryBigQuery(`
      SELECT
        userId,
        taskType,
        COUNT(*) AS calls,
        SUM(inputTokens + outputTokens) AS tokens,
        ROUND(SUM(costUsd), 6) AS spend,
        COUNTIF(decision = 'stop') AS blocked
      FROM \`${env.projectId}.${env.dataset}.${env.usageTable}\`
      GROUP BY userId, taskType
      ORDER BY spend DESC
      LIMIT 20
    `);
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json([]);
  }
}

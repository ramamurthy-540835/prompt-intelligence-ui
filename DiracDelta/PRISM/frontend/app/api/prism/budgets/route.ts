import { NextResponse } from "next/server";
import { env } from "@backend/lib/env";
import { queryBigQuery } from "@backend/lib/bigquery";
import { localGetBudgets } from "@backend/lib/localdb";

export async function GET() {
  if (env.disableBigquery) return NextResponse.json(localGetBudgets());

  try {
    const rows = await queryBigQuery(
      `SELECT * FROM \`${env.projectId}.${env.dataset}.${env.budgetsTable}\``
    );
    return NextResponse.json(Array.isArray(rows) ? rows : []);
  } catch (error: any) {
    return NextResponse.json([]);
  }
}

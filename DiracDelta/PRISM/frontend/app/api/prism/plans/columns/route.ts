import { NextResponse } from "next/server";
import { env } from "@backend/lib/env";
import { queryBigQuery } from "@backend/lib/bigquery";
import { localGetTableColumns } from "@backend/lib/localdb";

export async function GET() {
  if (env.disableBigquery) {
    return NextResponse.json(localGetTableColumns("prism_plans"));
  }

  try {
    const rows = await queryBigQuery(`
      SELECT column_name, data_type
      FROM \`ctoteam.prism\`.INFORMATION_SCHEMA.COLUMNS
      WHERE table_name = 'prism_plans'
      ORDER BY ordinal_position
    `);
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String((e as any)?.message ?? e) }, { status: 500 });
  }
}

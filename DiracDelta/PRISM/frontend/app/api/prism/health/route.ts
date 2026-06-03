import { NextResponse } from "next/server";
import { env } from "@backend/lib/env";
import { queryBigQuery } from "@backend/lib/bigquery";
import { localGetDbInfo } from "@backend/lib/localdb";

export async function GET() {
  if (env.disableBigquery) {
    const info = localGetDbInfo();
    return NextResponse.json({ ...info, mode: "local-sqlite" });
  }

  try {
    await queryBigQuery("SELECT 1 AS ok FROM `ctoteam.prism.prism_usage` LIMIT 1");
    let tableCount = 0;
    try {
      const [countRow] = await queryBigQuery(
        "SELECT COUNT(*) AS tableCount FROM `ctoteam.prism`.INFORMATION_SCHEMA.TABLES"
      );
      tableCount = Number(countRow?.tableCount ?? 0);
    } catch {}
    return NextResponse.json({ status: "ok", project: "ctoteam", dataset: "prism", tableCount });
  } catch (e) {
    return NextResponse.json(
      { status: "error", message: String((e as any)?.message ?? e) },
      { status: 500 }
    );
  }
}

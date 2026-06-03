import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';
import fs from 'fs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const auditRunId = searchParams.get('auditRunId') || '';

  if (!auditRunId) {
    return NextResponse.json({
      success: false,
      error: 'Missing auditRunId parameter',
      findings: []
    }, { status: 400 });
  }

  const bqOptions: any = { projectId: 'ctoteam' };
  const adcPath = '/home/appadmin/.config/gcloud/application_default_credentials.json';
  if (fs.existsSync(adcPath)) {
    bqOptions.keyFilename = adcPath;
  }

  const bq = new BigQuery(bqOptions);

  try {
    const query = `
      SELECT
        finding_id,
        severity,
        category,
        file_path,
        line_number,
        finding_text,
        recommendation,
        owner_hint,
        created_at
      FROM \`ctoteam.prism_sentinel_audit.audit_findings\`
      WHERE audit_run_id = @audit_run_id
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'major' THEN 2
          WHEN 'minor' THEN 3
          WHEN 'info' THEN 4
        END,
        created_at DESC
      LIMIT 1000
    `;

    const [rows] = await bq.query({
      query,
      params: { audit_run_id: auditRunId }
    });

    return NextResponse.json({
      success: true,
      findings: rows || [],
      total_count: rows.length
    });
  } catch (error: any) {
    console.warn("BigQuery audit findings query failed:", error.message);
    return NextResponse.json({
      success: false,
      error: error.message,
      findings: []
    }, { status: 500 });
  }
}

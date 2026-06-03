import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const promptId = searchParams.get('promptId') || '';
  const reportType = searchParams.get('reportType') || 'requirement_scope';

  if (!promptId) {
    return NextResponse.json({
      success: false,
      error: 'Missing promptId parameter'
    }, { status: 400 });
  }

  const reportDir = `/home/appadmin/projects/Ram_Projects/DiracDelta/sentinel/reports/${promptId}`;

  // Map report type to filename
  let filename = '';
  switch (reportType) {
    case 'requirement_scope':
      filename = 'requirement_scope_clean.md';
      break;
    case 'scientific_estimation':
      filename = 'scientific_estimation.md';
      break;
    case 'audit_evidence':
      filename = 'audit_evidence_package.md';
      break;
    case 'gap_analysis':
      filename = 'gap_analysis.md';
      break;
    default:
      filename = 'requirement_scope_clean.md';
  }

  const filePath = path.join(reportDir, filename);

  try {
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: false,
        error: `Report file not found: ${filename}`
      }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    return NextResponse.json({
      success: true,
      content,
      format: 'markdown',
      source_file: filePath
    });
  } catch (error: any) {
    console.error("Failed to read report file:", error.message);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

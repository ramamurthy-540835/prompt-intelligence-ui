import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);
const BACKEND = process.env.SENTINEL_BACKEND_URL ?? 'http://10.100.15.31:8005';

export async function POST(request: Request) {
  const adcPath = '/home/appadmin/.config/gcloud/application_default_credentials.json';
  const hasADC = fs.existsSync(adcPath);

  try {
    const body = await request.json().catch(() => ({}));
    const { action, promptId, dryRun } = body;
    
    if (!promptId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing promptId parameter',
        authWarning: !hasADC ? 'GCP Application Default Credentials not found. Actions may fail without authentication.' : null
      }, { status: 400 });
    }
    
    const gcloudRunPath = '/home/appadmin/projects/Ram_Projects/DiracDelta/gcloud_run';

    // For 'estimate', prefer the real, proven Sentinel backend on 8005
    if (action === 'estimate') {
      try {
        const backendRes = await fetch(`${BACKEND}/estimate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt_id: promptId, dry_run: !!dryRun })
        });
        const backendData = await backendRes.json();

        return NextResponse.json({
          success: true,
          stdout: backendData.stdout || JSON.stringify(backendData, null, 2),
          stderr: backendData.stderr || '',
          authWarning: null,
          dryRun: !!dryRun
        });
      } catch (e: any) {
        return NextResponse.json({
          success: false,
          error: `Failed to call Sentinel backend at ${BACKEND}/estimate: ` + e.message,
          stdout: '',
          stderr: e.message
        }, { status: 500 });
      }
    }

    let command = '';
    if (action === 'refresh') {
      command = `./scripts/extract_store_prompt.sh ${promptId} --force`;
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid action specified',
        authWarning: !hasADC ? 'GCP ADC missing' : null
      }, { status: 400 });
    }

    // Note: The underlying Python scripts in gcloud_run or sentinel may themselves require ADC.
    // This route now surfaces the auth state.
    const { stdout, stderr } = await execAsync(command, {
      cwd: gcloudRunPath,
      env: { 
        ...process.env, 
        PATH: `${process.env.PATH}:/snap/bin:/usr/bin:/home/appadmin/projects/Ram_Projects/DiracDelta/gcloud_run/venv/bin`,
        // Ensure ADC path is visible to child processes if needed
        GOOGLE_APPLICATION_CREDENTIALS: hasADC ? adcPath : process.env.GOOGLE_APPLICATION_CREDENTIALS
      }
    });

    return NextResponse.json({
      success: true,
      stdout,
      stderr,
      authWarning: !hasADC 
        ? 'GCP Application Default Credentials were not detected when this action ran. Some backend operations may have used fallback behavior.'
        : null
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr,
      authWarning: !hasADC 
        ? 'GCP ADC missing at execution time. This may be the root cause of the failure.' 
        : null
    }, { status: 500 });
  }
}

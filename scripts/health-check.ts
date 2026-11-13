#!/usr/bin/env tsx
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ToolReport {
  name: string;
  status: 'ok' | 'warning' | 'missing';
  version?: string;
  path?: string;
  details?: string;
}

async function checkCommand(
  cmdName: string,
  versionFlag: string = '--version',
  customCheck?: () => Promise<string>
): Promise<ToolReport> {
  try {
    const { stdout: whichOut } = await execAsync(`which ${cmdName}`);
    const binPath = whichOut.trim();

    let versionStr = 'Found';
    if (customCheck) {
      versionStr = await customCheck();
    } else {
      const { stdout: verOut, stderr: verErr } = await execAsync(`${cmdName} ${versionFlag}`);
      versionStr = (verOut || verErr).trim().split('\n')[0];
    }

    return {
      name: cmdName,
      status: 'ok',
      version: versionStr,
      path: binPath,
    };
  } catch (err: any) {
    return {
      name: cmdName,
      status: 'missing',
      details: err?.message || 'Command not found in PATH',
    };
  }
}

async function runHealthCheck() {
  console.log('====================================================');
  console.log('  Visual AI Video Studio — Environment Health Check ');
  console.log('====================================================\n');

  const tools: ToolReport[] = [];

  // 1. Node.js
  tools.push({
    name: 'node',
    status: 'ok',
    version: process.version,
    path: process.execPath,
  });

  // 2. Antigravity CLI (Default model runner)
  const agy = await checkCommand('agy');
  tools.push(agy);

  // 3. Claude Code CLI
  const claude = await checkCommand('claude');
  tools.push(claude);

  // 4. Ollama
  const ollama = await checkCommand('ollama');
  tools.push(ollama);

  // 5. FFmpeg
  const ffmpeg = await checkCommand('ffmpeg', '-version');
  tools.push(ffmpeg);

  // 6. yt-dlp
  const ytdlp = await checkCommand('yt-dlp');
  tools.push(ytdlp);

  // 7. HyperFrames CLI
  try {
    const { stdout: hfOut } = await execAsync('npx --no-install hyperframes --version');
    tools.push({
      name: 'hyperframes',
      status: 'ok',
      version: hfOut.trim(),
      details: 'Available via npx hyperframes',
    });
  } catch (err: any) {
    try {
      const { stdout: hfOut2 } = await execAsync('npx hyperframes --version');
      tools.push({
        name: 'hyperframes',
        status: 'ok',
        version: hfOut2.trim(),
        details: 'Available via npx hyperframes',
      });
    } catch (e: any) {
      tools.push({
        name: 'hyperframes',
        status: 'warning',
        details: 'Run: npm install -g hyperframes or use npx hyperframes',
      });
    }
  }

  let hasMissingCritical = false;

  for (const tool of tools) {
    const icon = tool.status === 'ok' ? '✓' : tool.status === 'warning' ? '⚠' : '✗';
    const color = tool.status === 'ok' ? '\x1b[32m' : tool.status === 'warning' ? '\x1b[33m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(`${color}${icon} ${tool.name.padEnd(14)}${reset} ${tool.status.toUpperCase().padEnd(9)} ${tool.version ?? ''}`);
    if (tool.path) {
      console.log(`  └─ Path: ${tool.path}`);
    }
    if (tool.details) {
      console.log(`  └─ Note: ${tool.details}`);
    }
    if (tool.status === 'missing' && ['node', 'agy', 'ffmpeg'].includes(tool.name)) {
      hasMissingCritical = true;
    }
  }

  console.log('\n----------------------------------------------------');
  if (hasMissingCritical) {
    console.log('\x1b[31mStatus: FAILED. Missing critical tools.\x1b[0m');
    process.exit(1);
  } else {
    console.log('\x1b[32mStatus: HEALTHY. All core tools available for zero-API-key execution.\x1b[0m');
  }
  console.log('----------------------------------------------------\n');
}

runHealthCheck().catch((err) => {
  console.error('Health check crashed:', err);
  process.exit(1);
});

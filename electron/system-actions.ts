import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { isSystemAction, type SystemAction } from '../shared/model.js';

// Only bundled constants reach these OS tools. No button text, target, or renderer command
// is interpolated. SetSuspendState handles Windows' sleep privilege; false keeps wake events.
export const windowsSleepScript = `$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
if (-not [System.Windows.Forms.Application]::SetSuspendState([System.Windows.Forms.PowerState]::Suspend, $false, $false)) {
  throw 'Windows rejected the sleep request.'
}`;

export type SystemCommand = { file: string; args: string[] };
export function sleepCommand(
  platform: string,
  windowsRoot = process.env.SystemRoot,
): SystemCommand {
  if (platform === 'darwin') return { file: '/usr/bin/pmset', args: ['sleepnow'] };
  if (platform === 'win32') {
    if (!windowsRoot || !path.win32.isAbsolute(windowsRoot))
      throw Error('Windows could not locate its system tools. Restart KeePad and try again.');
    return {
      file: path.win32.join(windowsRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      args: [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-WindowStyle',
        'Hidden',
        '-Command',
        windowsSleepScript,
      ],
    };
  }
  throw Error('Sleep is available only on Windows and macOS.');
}

const runFile = promisify(execFile);
export async function executeSystemCommand(command: SystemCommand): Promise<void> {
  // No timeout: Windows may finish this call only after wake. A wall-clock timeout could
  // incorrectly report a successful sleep as failure on resume. Repeat requests are rejected.
  await runFile(command.file, command.args, { windowsHide: true, shell: false, maxBuffer: 16384 });
}

export function createSystemActionRunner(
  execute: (command: SystemCommand) => Promise<void> = executeSystemCommand,
  platform: string = process.platform,
  windowsRoot = process.env.SystemRoot,
) {
  let running = false;
  return async (action: SystemAction): Promise<void> => {
    if (!isSystemAction(action)) throw Error('Unsupported system action.');
    if (running) throw Error('A sleep request is already in progress.');
    const command = sleepCommand(platform, windowsRoot);
    running = true;
    try {
      await execute(command);
    } catch {
      throw Error(
        platform === 'win32'
          ? 'Could not put this computer to sleep. Check that Windows supports sleep and that Windows PowerShell and .NET are allowed by your system policy.'
          : 'Could not put this Mac to sleep. Check its power settings and try Sleep from the Apple menu.',
      );
    } finally {
      running = false;
    }
  };
}

// Object indirection lets the native suite replace execution without sleeping the test host.
// This is a main-process module, never exposed through preload or a runtime environment flag.
export const systemActions = { run: createSystemActionRunner() };

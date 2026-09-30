import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  createSystemActionRunner,
  sleepCommand,
  windowsSleepScript,
  type SystemCommand,
} from '../electron/system-actions.js';

test('sleep dispatch uses fixed OS operations and rejects unsupported actions', async () => {
  const calls: SystemCommand[] = [];
  for (const platform of ['win32', 'darwin']) {
    const run = createSystemActionRunner(
      async (command) => {
        calls.push(command);
      },
      platform,
      'C:\\Windows',
    );
    await run('sleep');
    await assert.rejects(run('lock' as 'sleep'), /Unsupported/);
    await assert.rejects(run('sleep; evil' as 'sleep'), /Unsupported/);
  }
  assert.equal(calls.length, 2);
  assert.equal(calls[0].file, 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
  assert.deepEqual(calls[0].args.slice(0, -1), [
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-WindowStyle',
    'Hidden',
    '-Command',
  ]);
  assert.equal(calls[0].args.at(-1), windowsSleepScript);
  assert.match(windowsSleepScript, /PowerState\]::Suspend, \$false, \$false/);
  assert.deepEqual(calls[1], { file: '/usr/bin/pmset', args: ['sleepnow'] });
  assert.throws(() => sleepCommand('linux'), /only on Windows and macOS/);
  assert.throws(() => sleepCommand('win32', 'relative'), /system tools/);
});

test('overlapping sleep requests are rejected and failure allows a later retry', async () => {
  let reject!: (error: Error) => void;
  let attempts = 0;
  const run = createSystemActionRunner(
    () => {
      attempts++;
      return attempts === 1
        ? new Promise<void>((_, fail) => {
            reject = fail;
          })
        : Promise.resolve();
    },
    'win32',
    'C:\\Windows',
  );
  const first = run('sleep');
  await assert.rejects(run('sleep'), /already in progress/);
  assert.equal(attempts, 1);
  reject(Error('Access denied'));
  await assert.rejects(first, /Windows PowerShell and .NET/);
  await run('sleep');
  assert.equal(attempts, 2);
  await assert.rejects(
    createSystemActionRunner(async () => {
      throw Error('denied');
    }, 'darwin')('sleep'),
    /Apple menu/,
  );
});

test(
  'Windows sleep script parses and its .NET method is available without invoking sleep',
  { skip: process.platform !== 'win32' },
  async () => {
    const command = sleepCommand('win32');
    // Compile/resolve only. Never invoke SetSuspendState in an unattended test.
    const check = `$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$tokens = $null; $errors = $null
[void][System.Management.Automation.Language.Parser]::ParseInput([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${Buffer.from(windowsSleepScript).toString('base64')}')), [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw 'Sleep script parse failed.' }
$method = [System.Windows.Forms.Application].GetMethod('SetSuspendState', [type[]]@([System.Windows.Forms.PowerState], [bool], [bool]))
if (-not $method) { throw 'Missing sleep method.' }
Write-Output 'Sleep method available; not invoked.'`;
    const result = await promisify(execFile)(command.file, [...command.args.slice(0, -1), check], {
      windowsHide: true,
      timeout: 30000,
    });
    assert.match(result.stdout, /Sleep method available; not invoked/);
  },
);

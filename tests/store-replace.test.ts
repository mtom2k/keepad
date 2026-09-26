import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { makeDefaultState } from '../shared/model.js';
import { Store, replaceFile } from '../electron/store.js';

const failure = (code: string) => Object.assign(new Error(code), { code });

test('atomic replacement retries transient Windows sharing errors only', async () => {
  const calls: string[] = [];
  const flaky = (codes: string[]) => async () => {
    const code = codes.shift();
    calls.push(code ?? 'ok');
    if (code) throw failure(code);
  };
  await replaceFile('a', 'b', flaky(['EPERM', 'EBUSY', 'EACCES']), [1, 1, 1]);
  assert.deepEqual(calls, ['EPERM', 'EBUSY', 'EACCES', 'ok']);

  calls.length = 0;
  await assert.rejects(replaceFile('a', 'b', flaky(['ENOENT']), [1, 1]), /ENOENT/);
  assert.deepEqual(calls, ['ENOENT'], 'non-transient errors are not retried');

  calls.length = 0;
  await assert.rejects(replaceFile('a', 'b', flaky(['EPERM', 'EPERM', 'EPERM']), [1, 1]), /EPERM/);
  assert.equal(calls.length, 3, 'a lasting lock still fails after bounded retries');
});

test(
  'store saves through a brief Windows lock without FILE_SHARE_DELETE',
  { skip: process.platform !== 'win32' },
  async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'keepad-lock-'));
    const file = path.join(dir, 'keepad.json');
    // Hold the file the way antivirus/indexers do: readable, but not replaceable.
    const lock = (ms: number) =>
      new Promise<() => Promise<void>>((resolve, reject) => {
        const child = spawn('powershell.exe', [
          '-NoProfile',
          '-Command',
          `$f=[IO.File]::Open('${file.replace(/'/g, "''")}','Open','Read','Read'); 'locked'; Start-Sleep -Milliseconds ${ms}; $f.Close()`,
        ]);
        const done = new Promise<void>((r) => child.on('exit', () => r()));
        child.stdout.on('data', (data) => {
          if (String(data).includes('locked')) resolve(() => done);
        });
        child.on('error', reject);
      });
    try {
      const store = new Store(file, makeDefaultState());
      await store.load();
      let released = await lock(1000);
      await writeFile(`${file}.probe`, '{}');
      await assert.rejects(rename(`${file}.probe`, file), { code: 'EPERM' }, 'lock is effective');
      await released();

      released = await lock(300);
      const next = {
        ...store.state,
        pads: [{ ...store.state.pads[0], name: 'Saved while locked' }],
      };
      next.activePadId = next.pads[0].id;
      await store.write(next);
      await released();
      assert.equal(JSON.parse(await readFile(file, 'utf8')).pads[0].name, 'Saved while locked');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
);

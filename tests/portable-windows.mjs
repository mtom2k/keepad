// The NSIS portable wrapper does not forward the inspector output Playwright Electron needs.
// Connect explicitly to the disposable instance's local debug endpoints instead. Never run Sleep.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const version = JSON.parse(await readFile('package.json', 'utf8')).version;
const exe = path.resolve(`release/KeePad-Portable-${version}.exe`);
const profile = await mkdtemp(path.join(os.tmpdir(), 'keepad-portable-smoke-'));
const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
await new Promise((resolve) => server.close(resolve));
let child, browser, socket;
const pause = () => new Promise((resolve) => setTimeout(resolve, 100));
async function until(read, label) {
  const end = Date.now() + 45000;
  while (Date.now() < end) {
    try {
      const value = await read();
      if (value) return value;
    } catch {}
    await pause();
  }
  throw Error(`Timed out: ${label}`);
}
const evaluate = (expression) =>
  new Promise((resolve, reject) => {
    const id = 1;
    const listener = (event) => {
      const result = JSON.parse(event.data);
      if (result.id !== id) return;
      socket.removeEventListener('message', listener);
      clearTimeout(timer);
      if (result.error || result.result.exceptionDetails) reject(Error(JSON.stringify(result)));
      else resolve(result.result.result.value);
    };
    const timer = setTimeout(() => {
      socket.removeEventListener('message', listener);
      reject(Error('Inspector request timed out'));
    }, 10000);
    socket.addEventListener('message', listener);
    socket.send(
      JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: { expression, returnByValue: true },
      }),
    );
  });
try {
  child = spawn(
    exe,
    [
      `--inspect=127.0.0.1:${port}`,
      '--remote-debugging-port=0',
      '--editor',
      `--user-data-dir=${profile}`,
    ],
    { windowsHide: true, stdio: 'ignore' },
  );
  let spawnError;
  child.on('error', (error) => {
    spawnError = error;
  });
  const targets = await until(async () => {
    if (spawnError) throw spawnError;
    return (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  }, 'portable inspector');
  socket = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const actualProfile = await evaluate(
    `process.getBuiltinModule('module').createRequire(process.execPath)('electron').app.getPath('userData')`,
  );
  assert.equal(actualProfile, profile);
  const activePort = await until(
    async () => (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0],
    'portable browser port',
  );
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${activePort}`);
  const page = await until(
    async () =>
      browser
        .contexts()[0]
        .pages()
        .find((p) => p.url().includes('mode=editor')),
    'portable editor',
  );
  await page.getByRole('heading', { name: 'Everyday', exact: true }).waitFor();
  const snapshot = await page.evaluate(() => window.keepad.load());
  assert.equal(snapshot.value.info.version, version);
  assert.equal(snapshot.value.info.packaged, true);
  assert.equal(snapshot.value.info.shortcutRegistered, true);
  const saved = await page.evaluate(async () => {
    const state = (await window.keepad.load()).value.state;
    Object.assign(state.pads[0].buttons[0], {
      type: 'sleep',
      target: '',
      icon: 'moon',
      label: 'Sleep fixture',
      description: 'Put this computer to sleep',
    });
    return window.keepad.save(state);
  });
  assert.equal(saved.ok, true);
  const disk = JSON.parse(await readFile(path.join(profile, 'keepad.json'), 'utf8'));
  assert.equal(disk.pads[0].buttons[0].type, 'sleep');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText(`KeePad · Version ${version}`, { exact: true }).waitFor();
  console.log(
    `Portable ${version} smoke passed: extracted app, isolated profile, shortcut, Sleep save, on-disk state, and version footer. No Sleep execution or startup changes.`,
  );
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    await evaluate(
      `setTimeout(() => process.getBuiltinModule('module').createRequire(process.execPath)('electron').app.quit(), 100); true`,
    ).catch(() => {});
    socket.close();
  }
  if (browser) await browser.close().catch(() => {});
  if (child) {
    await until(async () => child.exitCode !== null || child.signalCode !== null, 'portable exit');
  }
  await rm(profile, { recursive: true, force: true });
}

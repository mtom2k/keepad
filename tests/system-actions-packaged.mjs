// Smoke a packaged Windows build with a disposable profile. Sleep is always stubbed.
// Pass an unpacked/installed executable. The portable wrapper needs portable-windows.mjs.
import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const exe = path.resolve(process.argv[2] ?? 'release/win-unpacked/KeePad.exe');
if (/Portable/i.test(path.basename(exe)))
  throw Error('Use tests/portable-windows.mjs for the portable wrapper.');
const version = JSON.parse(await readFile('package.json', 'utf8')).version;
const profile = await mkdtemp(path.join(os.tmpdir(), 'keepad-sleep-package-'));
const launch = () =>
  electron.launch({
    executablePath: exe,
    args: ['--editor', `--user-data-dir=${profile}`],
    timeout: 60000,
  });
let app;
try {
  app = await launch();
  assert.equal(await app.evaluate(({ app }) => app.getPath('userData')), profile);
  const page = await app.firstWindow();
  await page.getByRole('heading', { name: 'Everyday', exact: true }).waitFor();
  const snapshot = await page.evaluate(() => window.keepad.load());
  assert.equal(snapshot.value.info.version, version);
  assert.equal(snapshot.value.info.packaged, true);
  assert.equal(snapshot.value.info.shortcutRegistered, true);
  assert.equal(await app.evaluate(({ Menu }) => Menu.getApplicationMenu()), null);
  await app.evaluate(({ app }) => {
    const require = process.getBuiltinModule('module').createRequire(process.execPath);
    const path = process.getBuiltinModule('path');
    const { systemActions } = require(
      path.join(app.getAppPath(), 'dist-electron/electron/system-actions.js'),
    );
    globalThis.packagedSleepCalls = 0;
    systemActions.run = async (action) => {
      if (action !== 'sleep') throw Error('Unexpected system action');
      globalThis.packagedSleepCalls++;
    };
  });
  const saved = await page.evaluate(async () => {
    const state = (await window.keepad.load()).value.state;
    Object.assign(state.pads[0].buttons[0], {
      type: 'sleep',
      target: '',
      label: 'Sleep fixture',
      icon: 'moon',
    });
    return window.keepad.save(state);
  });
  assert.equal(saved.ok, true);
  const result = await page.evaluate(() => window.keepad.run('everyday', 'everyday-0'));
  assert.deepEqual(result, { ok: true, value: 'Sleep requested' });
  assert.equal(await app.evaluate(() => globalThis.packagedSleepCalls), 1);
  assert.equal(
    (await readdir(profile)).filter((name) => name.includes('.before-system-actions-')).length,
    1,
  );
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText(`KeePad · Version ${version}`, { exact: true }).waitFor();
  await page.getByLabel('Theme', { exact: true }).selectOption('dark');
  await page.waitForFunction(() => document.documentElement.dataset.appearance === 'dark');
  await page.evaluate(() => window.keepad.editButton('everyday', 'everyday-0'));
  await page.getByRole('heading', { name: 'Edit button', exact: true }).waitFor();
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()
      .find((w) => w.webContents.getURL().includes('mode=editor'))
      .setSize(820, 600);
  });
  const save = page.getByRole('button', { name: 'Save button', exact: true });
  await save.scrollIntoViewIfNeeded();
  const box = await save.boundingBox();
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  assert.ok(
    box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= viewport.width &&
      box.y + box.height <= viewport.height,
  );
  await page.screenshot({ path: `test-results/sleep-${path.basename(exe)}-minimum-dark.png` });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await app.close();
  app = await launch();
  const reopened = await app.firstWindow();
  await reopened.getByRole('heading', { name: 'Everyday', exact: true }).waitFor();
  const next = await reopened.evaluate(async () => (await window.keepad.load()).value.state);
  assert.equal(next.pads[0].buttons[0].type, 'sleep');
  assert.equal(next.pads[0].buttons[0].target, '');
  assert.equal(next.pads[0].buttons[0].icon, 'moon');
  assert.equal(next.activePadId, 'everyday');
  console.log(
    `Packaged ${version} smoke passed: ${path.basename(exe)}; isolated profile, Sleep dispatch stub, recovery backup, restart persistence, version footer. No hardware sleep invoked.`,
  );
} finally {
  if (app) await app.close();
  await rm(profile, { recursive: true, force: true });
}

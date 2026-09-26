// Windows-only packaged check: the stored "Start with your computer" preference follows what
// Windows will actually launch. Run after `npm run package:dir` (or pass a KeePad.exe path).
// Uses a temporary profile; refuses to run if a real KeePad startup entry already exists.
import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

if (process.platform !== 'win32') {
  console.log('Skipped: Windows login-item check.');
  process.exit(0);
}
const exe = path.resolve(process.argv[2] ?? 'release/win-unpacked/KeePad.exe');
const name = 'electron.app.KeePad';
const run = String.raw`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`;
const approved = String.raw`HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run`;
const reg = (...args) => execFileSync('reg.exe', args, { encoding: 'utf8', stdio: 'pipe' });
const value = (key) => {
  try {
    return reg('query', key, '/v', name)
      .split('\n')
      .find((line) => line.includes(name))
      ?.trim();
  } catch {
    return undefined;
  }
};
const remove = (key) => {
  try {
    reg('delete', key, '/v', name, '/f');
  } catch {
    /* Already absent. */
  }
};
if (value(run)) {
  console.error(`A real ${name} startup entry exists; turn KeePad startup off before this check.`);
  process.exit(1);
}
const userData = await mkdtemp(path.join(os.tmpdir(), 'keepad-login-'));
const saved = async () =>
  JSON.parse(await readFile(path.join(userData, 'keepad.json'), 'utf8')).settings.launchAtLogin;
// Poll from Node: Playwright's waitForFunction does not re-check async predicates.
const until = async (check, message) => {
  const end = Date.now() + 10000;
  while (!(await check())) {
    if (Date.now() > end) throw Error(`Timed out: ${message}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};
const launch = () =>
  electron.launch({ executablePath: exe, args: ['--editor', `--user-data-dir=${userData}`] });
let app;
try {
  app = await launch();
  let window = await app.firstWindow();
  await window.getByRole('heading', { name: 'Everyday', exact: true }).waitFor();
  await window.getByRole('button', { name: 'Settings', exact: true }).click();
  const checkbox = window.getByLabel('Start with your computer', { exact: true });
  const willLaunch = () =>
    app.evaluate(({ app }) => app.getLoginItemSettings().executableWillLaunchAtLogin);
  const stored = () =>
    window.evaluate(async () => (await window.keepad.load()).value.state.settings.launchAtLogin);

  await checkbox.click();
  await until(async () => (await stored()) === true, 'startup preference saved');
  assert.equal(await willLaunch(), true);
  assert.match(value(run), new RegExp(exe.replace(/\\/g, '\\\\'), 'i'));

  // Task Manager → Disable writes a StartupApproved flag whose first byte is 03.
  reg('add', approved, '/v', name, '/t', 'REG_BINARY', '/d', '030000000000000000000000', '/f');
  assert.equal(await willLaunch(), false);
  const before = await window.evaluate(
    async () => (await window.keepad.load()).value.state.revision,
  );
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => w.webContents.getURL().includes('mode=editor'))
      .emit('focus'),
  );
  await until(async () => (await stored()) === false, 'disabled startup item reconciled');
  assert.equal(await checkbox.isChecked(), false, 'checkbox shows the disabled startup item');
  assert.equal(
    await window.evaluate(async () => (await window.keepad.load()).value.state.revision),
    before + 1,
    'reconciliation is an ordinary revisioned save',
  );

  // Turning it back on re-approves the entry for Task Manager/Windows Settings.
  await checkbox.click();
  await until(async () => (await stored()) === true, 'startup preference saved');
  assert.equal(await willLaunch(), true);
  // Electron re-approves by removing the disabled flag; absent or 02 both mean enabled.
  assert.ok(!value(approved) || /REG_BINARY\s+02/i.test(value(approved)), value(approved));

  // An entry removed while KeePad was closed is reconciled at the next start.
  await app.close();
  remove(run);
  app = await launch();
  window = await app.firstWindow();
  await window.getByRole('heading', { name: 'Everyday', exact: true }).waitFor();
  assert.equal(await saved(), false);

  // A matching entry that exists without the stored preference is adopted at start as well.
  await app.close();
  reg('add', run, '/v', name, '/t', 'REG_SZ', '/d', `"${exe}"`, '/f');
  remove(approved);
  app = await launch();
  window = await app.firstWindow();
  await window.getByRole('heading', { name: 'Everyday', exact: true }).waitFor();
  assert.equal(await saved(), true);
  console.log(
    'Windows login-item checks passed: enable, Task Manager disable, re-enable, removal, adoption.',
  );
} finally {
  await app?.close().catch(() => {});
  remove(run);
  remove(approved);
  await rm(userData, { recursive: true, force: true });
}

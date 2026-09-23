import { _electron as electron } from 'playwright';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { makeDefaultState } from '../dist-electron/shared/model.js';

const userData = await mkdtemp(path.join(os.tmpdir(), 'keepad-docs-'));
const output = path.resolve('docs/screenshots');
await mkdir(output, { recursive: true });
const sample = makeDefaultState({ home: userData, downloads: userData, documents: userData });
sample.settings.theme = 'light';
// Use sample destinations inside the disposable profile, never the user's real data.
await writeFile(path.join(userData, 'keepad.json'), JSON.stringify(sample));
let app;
async function capture(page, name) {
  await page.mouse.move(0, 0);
  await page.locator('.toast').waitFor({ state: 'hidden' });
  await page.locator('[role="tooltip"]').waitFor({ state: 'hidden' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.screenshot({ path: path.join(output, `${name}.png`), scale: 'css' });
}
try {
  app = await electron.launch({
    args: ['.', '--editor'],
    env: { ...process.env, KEEPAD_TEST_DATA: userData },
  });
  const editor = await app.firstWindow();
  await editor.getByRole('heading', { name: 'Everyday', exact: true }).waitFor();
  const snapshot = await editor.evaluate(() => window.keepad.load());
  if (!snapshot.ok) throw Error(snapshot.error);
  if (!snapshot.value.info.shortcutRegistered)
    throw Error(
      'The default shortcut is in use. Quit competing KeePad copies, then regenerate screenshots.',
    );
  await capture(editor, 'editor');
  await editor.getByLabel('Pad Theme', { exact: true }).selectOption('graphite');
  const opened = app.waitForEvent('window');
  await editor.getByRole('button', { name: 'Preview pad on screen', exact: true }).click();
  const launcher = await opened;
  await launcher.getByRole('button', { name: 'Run Gmail', exact: true }).waitFor();
  await launcher.waitForFunction(() => document.activeElement?.classList.contains('launcher'));
  await capture(launcher, 'launcher');
  await editor.evaluate(() => window.keepad.showEditor());
  await editor.getByRole('button', { name: 'Edit Quick reply', exact: true }).click();
  await editor.getByRole('heading', { name: 'Edit button', exact: true }).waitFor();
  await capture(editor, 'button-editor');
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
  await editor.getByRole('button', { name: 'Settings', exact: true }).click();
  await editor.getByLabel('Theme', { exact: true }).selectOption('dark');
  await editor.waitForFunction(() => document.documentElement.dataset.appearance === 'dark');
  await capture(editor, 'settings-dark');

  console.log(
    'Captured sample-data editor, launcher, button editor, and Dark settings in docs/screenshots. Review them before committing.',
  );
} finally {
  if (app) await app.close();
  await rm(userData, { recursive: true, force: true });
}

import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const userData = await mkdtemp(path.join(os.tmpdir(), 'keepad-desktop-'));
await mkdir('test-results', { recursive: true });
let app;
let originalClipboard;
try {
  app = await electron.launch({
    args: ['.', '--editor'],
    env: { ...process.env, KEEPAD_TEST_DATA: userData },
  });
  await app.evaluate(async ({ clipboard, ClipboardItem }) => {
    const items = await clipboard.read();
    globalThis.keepadClipboard = await Promise.all(
      items.map(async (item) => {
        const entries = await Promise.all(
          item.types.map(async (type) => [type, await item.getType(type)]),
        );
        return new ClipboardItem(Object.fromEntries(entries));
      }),
    );
  });
  originalClipboard = true;
  const window = await app.firstWindow();
  const errors = [];
  window.on('pageerror', (e) => errors.push(e.message));
  await window.getByRole('heading', { name: 'Everyday', exact: true }).waitFor();
  const setLayoutStep = async (label, columns, rows) => {
    await window.getByRole('button', { name: label, exact: true }).click();
    await window.waitForFunction(
      ({ columns, rows }) =>
        document.querySelector('output[aria-label="Columns count"]')?.textContent ===
          String(columns) &&
        document.querySelector('output[aria-label="Rows count"]')?.textContent === String(rows),
      { columns, rows },
    );
    assert.equal(await window.locator('.pad-grid .macro-key').count(), columns * rows);
  };
  await setLayoutStep('Increase columns', 5, 3);
  assert.equal(
    await window.getByRole('button', { name: 'Increase columns', exact: true }).isDisabled(),
    true,
  );
  await setLayoutStep('Decrease columns', 4, 3);
  await setLayoutStep('Increase rows', 4, 4);
  assert.equal(
    await window.getByRole('button', { name: 'Increase rows', exact: true }).isDisabled(),
    true,
  );
  await setLayoutStep('Decrease rows', 4, 3);
  await setLayoutStep('Decrease rows', 4, 2);
  assert.equal(
    await window.getByRole('button', { name: 'Decrease rows', exact: true }).isDisabled(),
    true,
  );
  assert.equal(
    await window.getByRole('button', { name: 'Decrease columns', exact: true }).isDisabled(),
    true,
    'A smaller layout must not hide existing actions',
  );
  await setLayoutStep('Increase rows', 4, 3);
  await setLayoutStep('Decrease columns', 3, 3);
  assert.equal(
    await window.getByRole('button', { name: 'Decrease columns', exact: true }).isDisabled(),
    true,
  );
  await setLayoutStep('Increase columns', 4, 3);
  const resizedState = await window.evaluate(async () => (await window.keepad.load()).value.state);
  assert.equal(resizedState.pads[0].buttons.length, 8, 'Resizing preserves actions');
  await window.screenshot({ path: 'test-results/editor.png' });
  if (process.platform === 'darwin')
    assert.equal(await app.evaluate(({ app }) => app.dock?.isVisible()), false);
  const status = await window.evaluate(() => window.keepad.load());
  assert.equal(status.ok, true);
  assert.equal(status.value.info.desktop, true);
  await window.getByRole('button', { name: 'New pad', exact: true }).click();
  await window.getByLabel('Pad name', { exact: true }).fill('Test workspace');
  await window.getByRole('button', { name: 'Create pad', exact: true }).click();
  await window.getByRole('heading', { name: 'Test workspace' }).waitFor();
  const currentActive = async () =>
    window.evaluate(async () => (await window.keepad.load()).value.state.activePadId);
  assert.equal(await currentActive(), 'everyday', 'Creating a pad must not activate it');
  await window.getByRole('button', { name: 'Deep work', exact: true }).click();
  assert.equal(await currentActive(), 'everyday', 'Browsing pads must not activate them');
  await window.getByRole('button', { name: 'Deep work', exact: true }).dblclick();
  await window.waitForFunction(() =>
    document.querySelector('.pad-nav-item.selected .active-badge'),
  );
  assert.equal(await currentActive(), 'focus', 'Double-click activates the selected pad');
  await window.getByRole('button', { name: 'Everyday', exact: true }).dblclick();
  await window.waitForFunction(() =>
    document.querySelector('.pad-nav-item.selected .active-badge'),
  );
  assert.equal(await currentActive(), 'everyday');
  await window.getByRole('button', { name: 'Test workspace', exact: true }).click();
  await window.getByRole('button', { name: 'Add button 1', exact: true }).click();
  await window.getByLabel('Button name', { exact: true }).fill('Test snippet');
  await window.getByLabel('Action', { exact: true }).selectOption('text');
  await window.getByLabel('Text to copy').fill('KeePad native clipboard test');
  await window
    .getByLabel('Hover hint')
    .fill('A custom tooltip that must stay within the viewport.');
  await window.getByRole('button', { name: 'Save button', exact: true }).click();
  await window.getByRole('button', { name: 'Edit Test snippet', exact: true }).waitFor();
  await window.getByRole('button', { name: 'Edit Test snippet', exact: true }).click();
  await app.evaluate(({ dialog }, imagePath) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [imagePath] });
  }, path.resolve('assets/icon.png'));
  await window.getByRole('button', { name: 'Choose image…', exact: true }).click();
  await window.getByRole('button', { name: 'Replace image', exact: true }).waitFor();
  await window.screenshot({ path: 'test-results/button-editor.png' });
  await window.getByRole('button', { name: 'Save button', exact: true }).click();
  await window.getByRole('button', { name: 'Edit Test snippet', exact: true }).waitFor();
  await window.getByLabel('Theme', { exact: true }).selectOption('graphite');
  await window.getByRole('button', { name: 'Preview pad on screen', exact: true }).hover();
  await window.getByRole('tooltip', { name: 'Preview pad on screen' }).waitFor();
  const launcherReady = app.waitForEvent('window');
  await window.getByRole('button', { name: 'Preview pad on screen', exact: true }).click();
  const launcher = await launcherReady;
  await launcher.waitForFunction(() => document.activeElement?.classList.contains('launcher'));
  const position = await app.evaluate(({ BrowserWindow, screen }) => {
    const win = BrowserWindow.getAllWindows().find((w) =>
      w.webContents.getURL().includes('mode=launcher'),
    );
    return {
      bounds: win.getBounds(),
      area: screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea,
    };
  });
  assert.ok(
    Math.abs(
      position.bounds.x - (position.area.x + (position.area.width - position.bounds.width) / 2),
    ) <= 1,
  );
  assert.ok(
    Math.abs(
      position.bounds.y - (position.area.y + (position.area.height - position.bounds.height) / 2),
    ) <= 1,
  );
  assert.equal(await currentActive(), 'everyday', 'Previewing a pad must not activate it');
  await launcher.getByRole('button', { name: 'Run Test snippet', exact: true }).waitFor();
  await launcher.getByRole('button', { name: 'Run Test snippet', exact: true }).hover();
  await launcher.getByRole('tooltip').waitFor();
  const box = await launcher.getByRole('tooltip').boundingBox(),
    view = await launcher.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  assert.ok(box.x >= 0 && box.y >= 0);
  assert.ok(box.x + box.width <= view.width && box.y + box.height <= view.height);
  await launcher.screenshot({ path: 'test-results/launcher.png' });
  await launcher.getByRole('button', { name: 'Run Test snippet', exact: true }).click();
  assert.equal(
    await app.evaluate(({ clipboard }) => clipboard.readText()),
    'KeePad native clipboard test',
  );
  // A normal summon restores the active pad, rather than the last preview.
  await window.evaluate(() => window.keepad.showLauncher());
  await launcher.getByRole('button', { name: 'Run Gmail', exact: true }).waitFor();
  await launcher.waitForFunction(() => document.activeElement?.classList.contains('launcher'));
  for (const control of ['Manage pads', 'Hide KeePad']) {
    await launcher.getByRole('button', { name: control, exact: true }).focus();
    await launcher.keyboard.press('Enter');
    await window.evaluate(() => window.keepad.showLauncher());
    await launcher.waitForFunction(() => document.activeElement?.classList.contains('launcher'));
    assert.equal(
      await launcher.locator('button:focus-visible').count(),
      0,
      'No restored control highlight',
    );
    await launcher.keyboard.press('Tab');
    assert.equal(
      await launcher
        .getByRole('button', { name: 'Manage pads' })
        .evaluate((el) => el === document.activeElement && el.matches(':focus-visible')),
      true,
      'Keyboard focus remains visible',
    );
  }
  await window.evaluate(() => window.keepad.showEditor());
  await window.getByRole('button', { name: 'Make Active', exact: true }).click();
  await window.waitForFunction(
    () => document.querySelector('.pad-nav-item.selected .active-badge')?.textContent === 'ACTIVE',
  );
  const activatedId = await currentActive();
  assert.notEqual(activatedId, 'everyday');
  assert.equal(await window.locator('.active-badge').count(), 1);
  // Exposed edit / duplicate / delete controls preserve active-pad state.
  await window.getByRole('button', { name: 'Edit Pad', exact: true }).click();
  await window.getByRole('button', { name: 'Save changes', exact: true }).click();
  await window.getByRole('button', { name: 'Duplicate Pad', exact: true }).click();
  await window.getByRole('heading', { name: 'Test workspace copy', exact: true }).waitFor();
  assert.equal(await currentActive(), activatedId);
  await window.getByRole('button', { name: 'Delete Pad', exact: true }).click();
  await window.getByRole('dialog').getByRole('button', { name: 'Delete pad', exact: true }).click();
  await window.getByRole('heading', { name: 'Test workspace', exact: true }).waitFor();
  assert.equal(await currentActive(), activatedId, 'Deleting an inactive pad keeps the active pad');
  await window.screenshot({ path: 'test-results/active-pad.png' });
  await window.getByRole('button', { name: 'Settings', exact: true }).click();
  await window.getByRole('heading', { name: 'Settings', exact: true }).waitFor();
  await window.screenshot({ path: 'test-results/settings.png' });
  const before = await window.evaluate(async () => (await window.keepad.load()).value.state);
  await app.evaluate(({ globalShortcut }) =>
    globalShortcut.register('CommandOrControl+Alt+9', () => {}),
  );
  const conflict = await window.evaluate(async () => {
    const {
      value: { state },
    } = await window.keepad.load();
    state.settings.shortcut = 'CommandOrControl+Alt+9';
    return window.keepad.save(state);
  });
  assert.equal(conflict.ok, false);
  assert.match(conflict.error, /unavailable/);
  const after = await window.evaluate(async () => (await window.keepad.load()).value.state);
  assert.equal(after.settings.shortcut, before.settings.shortcut);
  const stale = await window.evaluate(async () => {
    const {
      value: { state },
    } = await window.keepad.load();
    state.revision = 0;
    return window.keepad.save(state);
  });
  assert.equal(stale.ok, false);
  const invalid = await window.evaluate(async () => {
    const {
      value: { state },
    } = await window.keepad.load();
    state.pads[0].buttons[0].target = 'javascript:alert(1)';
    return window.keepad.save(state);
  });
  assert.equal(invalid.ok, false);
  // Native image normalization, file picking, opening dispatch, and missing-path recovery.
  const imageState = await window.evaluate(async () => (await window.keepad.load()).value.state);
  assert.match(imageState.pads.at(-1).buttons[0].image, /^data:image\/png;base64,/);
  const fixture = path.join(userData, 'sample.txt');
  await writeFile(fixture, 'KeePad file action test');
  await app.evaluate(({ shell }) => {
    globalThis.keepadOpened = [];
    shell.openPath = async (target) => {
      globalThis.keepadOpened.push(target);
      return '';
    };
    shell.openExternal = async (target) => {
      globalThis.keepadOpened.push(target);
    };
  });
  await window.evaluate(
    async (fixture) => {
      const {
        value: { state },
      } = await window.keepad.load();
      const pad = state.pads.find((p) => p.id === state.activePadId);
      const base = pad.buttons[0];
      pad.buttons.push(
        { ...base, id: 'test-file', slot: 1, label: 'File', type: 'file', target: fixture },
        {
          ...base,
          id: 'test-folder',
          slot: 2,
          label: 'Folder',
          type: 'folder',
          target: fixture.slice(0, fixture.lastIndexOf('/')),
        },
      );
      return window.keepad.save(state);
    },
    fixture.replaceAll('\\', '/'),
  );
  let current = await window.evaluate(async () => (await window.keepad.load()).value.state);
  for (const id of ['test-file', 'test-folder'])
    assert.equal(
      (await window.evaluate(([pad, id]) => window.keepad.run(pad, id), [current.activePadId, id]))
        .ok,
      true,
    );
  assert.equal((await window.evaluate(() => window.keepad.run('everyday', 'everyday-0'))).ok, true);
  assert.equal((await app.evaluate(() => globalThis.keepadOpened)).length, 3);
  await rm(fixture);
  const missing = await window.evaluate(
    (pad) => window.keepad.run(pad, 'test-file'),
    current.activePadId,
  );
  assert.equal(missing.ok, false);
  assert.match(missing.error, /missing/);
  const exportFile = path.join(userData, 'backup.json');
  await app.evaluate(({ dialog }, file) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: file });
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] });
  }, exportFile);
  assert.equal((await window.evaluate(() => window.keepad.exportPads())).value, true);
  const backup = JSON.parse(await readFile(exportFile, 'utf8'));
  assert.equal(backup.pads.length, 4);
  assert.equal((await window.evaluate(() => window.keepad.importPads())).ok, true);
  current = await window.evaluate(async () => (await window.keepad.load()).value.state);
  assert.equal(current.pads.length, 8);
  assert.equal(new Set(current.pads.map((p) => p.id)).size, 8);
  const saved = JSON.parse(await readFile(path.join(userData, 'keepad.json'), 'utf8'));
  assert.equal(saved.pads.find((p) => p.id === saved.activePadId).name, 'Test workspace');
  assert.equal(saved.pads.find((p) => p.id === saved.activePadId).theme, 'graphite');
  if (originalClipboard)
    await app.evaluate(({ clipboard }) => clipboard.write(globalThis.keepadClipboard));
  originalClipboard = false;
  await app.close();
  app = await electron.launch({
    args: ['.', '--editor'],
    env: { ...process.env, KEEPAD_TEST_DATA: userData },
  });
  const reopened = await app.firstWindow();
  await reopened.getByRole('heading', { name: 'Test workspace' }).waitFor();
  await reopened.getByRole('button', { name: 'Edit Test snippet' }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    'Desktop checks passed: editor, pad/button creation, theme, layout steppers and resize limits, double-click activation, centered launcher, explicit activation, independent preview, exposed pad controls, launcher focus reset, keyboard focus, native clipboard, launcher, unclipped tooltip, shortcut conflict, stale writes, unsafe URLs, image upload, backup export/import, native open dispatch, missing-file recovery, and restart persistence.',
  );
} finally {
  if (app) {
    if (originalClipboard)
      await app
        .evaluate(({ clipboard }) => clipboard.write(globalThis.keepadClipboard))
        .catch(() => {});
    await app.close();
  }
  await rm(userData, { recursive: true, force: true });
}

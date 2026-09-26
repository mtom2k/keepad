import assert from 'node:assert/strict';
import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { waitForSaved } from './saved-state.mjs';

export async function checkButtonInteractions(app, editor, profile) {
  const initial = await editor.evaluate(async () => (await window.keepad.load()).value.state);
  const load = () => editor.evaluate(async () => (await window.keepad.load()).value.state);
  const waitCount = (count) =>
    waitForSaved(editor, (state) => state.pads[0].buttons.length === count, `${count} buttons`);
  const rightClick = (name) =>
    editor.getByRole('button', { name, exact: true }).click({ button: 'right' });
  const choose = (name) => editor.getByRole('menuitem', { name, exact: true }).click();
  const remove = async (name) => {
    await rightClick(name);
    await choose('Delete…');
    await editor.getByRole('button', { name: 'Delete button', exact: true }).click();
  };
  await app.evaluate(({ shell }) => {
    globalThis.keepadOriginalOpen = shell.openExternal;
    globalThis.keepadOriginalOpenPath = shell.openPath;
    globalThis.keepadContextRuns = 0;
    shell.openExternal = async () => {
      globalThis.keepadContextRuns++;
    };
    shell.openPath = async () => {
      globalThis.keepadContextRuns++;
      return '';
    };
  });
  try {
    await rightClick('Edit Gmail');
    assert.equal(await editor.getByRole('menuitem').count(), 4);
    await editor.screenshot({ path: 'test-results/button-menu.png' });
    await editor.keyboard.press('Escape');
    assert.equal(await editor.getByRole('menu').count(), 0);
    assert.equal(
      await editor
        .getByRole('button', { name: 'Edit Gmail', exact: true })
        .evaluate((b) => b === document.activeElement),
      true,
    );
    await editor.keyboard.press('Shift+F10');
    await editor.keyboard.press('End');
    assert.equal(
      await editor
        .getByRole('menuitem', { name: 'Delete…' })
        .evaluate((b) => b === document.activeElement),
      true,
    );
    await editor.keyboard.press('Escape');
    await editor.getByRole('button', { name: 'Edit Gmail', exact: true }).evaluate((button) => {
      button.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          clientX: innerWidth - 1,
          clientY: innerHeight - 1,
        }),
      );
    });
    const bounds = await editor.getByRole('menu').boundingBox();
    const viewport = await editor.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    assert.ok(
      bounds.x >= 0 &&
        bounds.y >= 0 &&
        bounds.x + bounds.width <= viewport.width &&
        bounds.y + bounds.height <= viewport.height,
    );
    await choose('Duplicate');
    await waitCount(9);
    const copy = (await load()).pads[0].buttons.find(
      (b) => b.label === 'Gmail' && b.id !== initial.pads[0].buttons[0].id,
    );
    assert.ok(copy);
    await editor
      .getByRole('button', { name: 'Edit Gmail', exact: true })
      .last()
      .click({ button: 'right' });
    await choose('Move to another pad…');
    await editor.getByLabel('Pad', { exact: true }).selectOption('focus');
    await editor.getByRole('button', { name: 'Move button', exact: true }).click();
    await waitCount(8);
    assert.equal((await load()).activePadId, initial.activePadId);
    await editor.getByRole('button', { name: 'Deep work', exact: true }).click();
    await remove('Edit Gmail');
    await editor.getByRole('button', { name: 'Everyday ACTIVE', exact: true }).click();
    await rightClick('Edit Gmail');
    await choose('Delete…');
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal((await load()).pads[0].buttons.length, 8);
    await rightClick('Edit Gmail');
    await choose('Edit…');
    await editor.getByRole('heading', { name: 'Edit button', exact: true }).waitFor();
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click();

    const file = path.join(profile, 'Dropped note.txt');
    await writeFile(file, 'Sample drop');
    const other = path.join(profile, 'Other note.txt');
    await writeFile(other, 'Other sample');
    // File-input File objects retain real native paths through Electron's bridge.
    await editor.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.id = 'drop-fixture';
      input.hidden = true;
      document.body.append(input);
    });
    const drop = async (files, label) => {
      await editor.locator('#drop-fixture').setInputFiles(files);
      await editor.getByRole('button', { name: label, exact: true }).evaluate((element) => {
        const data = new DataTransfer();
        for (const file of document.querySelector('#drop-fixture').files) data.items.add(file);
        element.dispatchEvent(
          new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: data }),
        );
        element.dispatchEvent(
          new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }),
        );
      });
    };
    await drop([file, other], 'Add button 12');
    await editor
      .getByText('Drop one file, folder, or application at a time.', { exact: true })
      .waitFor();
    assert.equal((await load()).pads[0].buttons.length, 8);
    await drop(file, 'Add button 12');
    await waitCount(9);
    assert.equal((await load()).pads[0].buttons.find((b) => b.slot === 11).target, file);
    await drop(other, 'Edit Dropped note.txt');
    await editor.getByRole('heading', { name: 'Replace button action?', exact: true }).waitFor();
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal((await load()).pads[0].buttons.find((b) => b.slot === 11).target, file);
    await drop(other, 'Edit Dropped note.txt');
    await editor.getByRole('button', { name: 'Replace action', exact: true }).click();
    await waitForSaved(
      editor,
      (state) => state.pads[0].buttons.find((b) => b.slot === 11)?.target === other,
      'replaced dropped destination',
    );
    const saved = JSON.parse(await readFile(path.join(profile, 'keepad.json'), 'utf8'));
    assert.equal(saved.pads[0].buttons.find((b) => b.slot === 11).label, 'Dropped note.txt');
    // A constructed browser File has no native path and cannot create a binding.
    const forged = await editor.evaluate(() =>
      window.keepad.describeFile(new File(['x'], 'fake.txt')),
    );
    assert.equal(forged.ok, false);
    await drop(file, 'Edit Dropped note.txt');
    await editor.getByRole('heading', { name: 'Replace button action?', exact: true }).waitFor();
    await editor.evaluate(async () => {
      const state = (await window.keepad.load()).value.state;
      const result = await window.keepad.save({
        ...state,
        settings: { ...state.settings, theme: 'light' },
      });
      if (!result.ok) throw Error(result.error);
    });
    await editor.getByRole('button', { name: 'Replace action', exact: true }).click();
    await editor.getByText('This pad changed. Drop the file again.', { exact: true }).waitFor();
    assert.equal((await load()).pads[0].buttons.find((b) => b.slot === 11).target, other);
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()
        .find((w) => w.webContents.getURL().includes('mode=editor'))
        .setSize(820, 600);
    });
    await editor.evaluate(async () => {
      const state = (await window.keepad.load()).value.state;
      const result = await window.keepad.save({
        ...state,
        settings: { ...state.settings, theme: 'dark' },
      });
      if (!result.ok) throw Error(result.error);
    });
    await editor.waitForFunction(() => document.documentElement.dataset.appearance === 'dark');
    await rightClick('Edit Dropped note.txt');
    await editor.screenshot({ path: 'test-results/button-menu-dark.png' });
    await editor.keyboard.press('Escape');
    await drop(file, 'Edit Dropped note.txt');
    await editor.getByRole('heading', { name: 'Replace button action?', exact: true }).waitFor();
    await editor.screenshot({ path: 'test-results/file-replacement-dark.png' });
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()
        .find((w) => w.webContents.getURL().includes('mode=editor'))
        .setSize(980, 720);
    });
    await remove('Edit Dropped note.txt');
    await waitCount(8);
    await editor.locator('#drop-fixture').evaluate((input) => input.remove());

    const opened = app.waitForEvent('window');
    await editor.evaluate(() => window.keepad.showLauncher());
    const launcher = await opened;
    await launcher.getByRole('button', { name: 'Run Gmail', exact: true }).waitFor();
    await launcher
      .getByRole('button', { name: 'Run Gmail', exact: true })
      .click({ button: 'right' });
    await launcher.getByRole('menu').waitFor();
    await launcher.keyboard.press('Escape');
    assert.equal(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.webContents.getURL().includes('mode=launcher'))
          .isVisible(),
      ),
      true,
    );
    await launcher
      .getByRole('button', { name: 'Run Gmail', exact: true })
      .click({ button: 'right' });
    await launcher.getByRole('menuitem', { name: 'Edit…', exact: true }).click();
    await editor.getByRole('heading', { name: 'Edit button', exact: true }).waitFor();
    assert.equal(await editor.getByLabel('Button name', { exact: true }).inputValue(), 'Gmail');
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(
      await app.evaluate(() => globalThis.keepadContextRuns),
      0,
      'Context menus never run the action',
    );
    // Existing suite expects to create its own launcher window later.
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((w) => w.webContents.getURL().includes('mode=launcher'))
        .destroy(),
    );
  } finally {
    await app.evaluate(({ shell }) => {
      shell.openExternal = globalThis.keepadOriginalOpen;
      shell.openPath = globalThis.keepadOriginalOpenPath;
    });
    await editor.evaluate(async (initial) => {
      const current = (await window.keepad.load()).value.state;
      const result = await window.keepad.save({ ...initial, revision: current.revision });
      if (!result.ok) throw Error(result.error);
    }, initial);
  }
}

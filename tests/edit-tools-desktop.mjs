import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { waitForSaved } from './saved-state.mjs';

export async function checkEditTools(app, editor, profile) {
  const load = () => editor.evaluate(async () => (await window.keepad.load()).value);
  const save = (state) => editor.evaluate((s) => window.keepad.save(s), state);
  const initial = await load();
  assert.equal(initial.canUndo, false);
  assert.equal(await editor.getByRole('button', { name: 'Undo pad edit' }).isDisabled(), true);
  const file = path.join(profile, 'Sample résumé.txt');
  await writeFile(file, 'Harmless fixture');
  const application = path.join(
    profile,
    process.platform === 'darwin' ? 'Sample.app' : 'Sample.exe',
  );
  if (process.platform === 'darwin') await mkdir(application);
  else await writeFile(application, 'Harmless fixture, never executed');
  await app.evaluate(({ shell }) => {
    globalThis.editToolsShell = {
      reveal: shell.showItemInFolder,
      open: shell.openPath,
      external: shell.openExternal,
    };
    globalThis.editToolsRevealed = [];
    globalThis.editToolsExecuted = 0;
    shell.showItemInFolder = (p) => globalThis.editToolsRevealed.push(p);
    shell.openPath = async () => {
      globalThis.editToolsExecuted++;
      return '';
    };
    shell.openExternal = async () => {
      globalThis.editToolsExecuted++;
    };
  });
  try {
    const fixture = structuredClone(initial.state);
    Object.assign(fixture.pads[0].buttons[0], { type: 'file', target: file });
    Object.assign(fixture.pads[0].buttons[1], { type: 'app', target: application });
    assert.equal((await save(fixture)).ok, true);
    const revealLabel = process.platform === 'darwin' ? 'Show in Finder' : 'Show in File Explorer';
    await editor
      .getByRole('button', { name: 'Edit Gmail', exact: true })
      .click({ button: 'right' });
    assert.equal(await editor.getByRole('menuitem').count(), 6);
    await editor.getByRole('menuitem', { name: revealLabel }).click();
    await editor
      .getByRole('status')
      .filter({ hasText: /Shown in/ })
      .waitFor();
    assert.deepEqual(await app.evaluate(() => globalThis.editToolsRevealed), [file]);
    const destination = async (buttonId, operation, revision) => {
      revision ??= (await load()).state.revision;
      return editor.evaluate(
        ({ buttonId, operation, revision }) =>
          window.keepad.buttonDestination('everyday', buttonId, revision, operation),
        { buttonId, operation, revision },
      );
    };
    assert.equal((await destination('everyday-1', 'reveal')).ok, true);
    assert.equal((await destination('everyday-4', 'reveal')).ok, true);
    assert.equal((await destination('everyday-2', 'reveal')).ok, false); // website
    assert.equal((await destination('everyday-7', 'copy')).ok, false); // snippet
    assert.equal((await destination('missing', 'copy')).ok, false);
    assert.equal((await destination('everyday-0', 'execute')).ok, false);
    assert.equal((await destination('everyday-0', 'copy', -1)).ok, false);
    await editor
      .getByRole('button', { name: 'Edit Gmail', exact: true })
      .click({ button: 'right' });
    await editor.getByRole('menuitem', { name: 'Copy destination' }).click();
    await editor.getByRole('status').filter({ hasText: 'Destination copied' }).waitFor();
    assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), file);
    const beforeUndo = await load();
    await editor.getByRole('button', { name: 'Undo pad edit' }).click();
    await waitForSaved(editor, (s) => s.pads[0].buttons[0].type === 'url', 'Undo fixture');
    assert.deepEqual((await load()).state.pads, initial.state.pads);
    assert.equal((await destination('everyday-0', 'copy', beforeUndo.state.revision)).ok, false);
    assert.equal((await load()).canUndo, false);

    // Saved editor changes undo by keyboard; native text undo must not consume pad history.
    await editor.getByRole('button', { name: 'Edit Gmail', exact: true }).click();
    await editor.getByLabel('Button name', { exact: true }).fill('Renamed Gmail');
    await editor.getByRole('button', { name: 'Save button', exact: true }).click();
    await waitForSaved(
      editor,
      (s) => s.pads[0].buttons.find((b) => b.id === 'everyday-0').label === 'Renamed Gmail',
      'Rename',
    );
    await editor.getByRole('button', { name: 'Edit Renamed Gmail', exact: true }).click();
    const name = editor.getByLabel('Button name', { exact: true });
    await name.focus();
    await editor.keyboard.press('End');
    await editor.keyboard.type(' extra');
    await editor.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    assert.equal(
      (await load()).state.pads[0].buttons.find((b) => b.id === 'everyday-0').label,
      'Renamed Gmail',
    );
    assert.equal((await load()).canUndo, true);
    assert.equal(await name.inputValue(), 'Renamed Gmail');
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
    await editor.getByRole('button', { name: 'Undo pad edit' }).focus();
    await editor.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await waitForSaved(
      editor,
      (s) => s.pads[0].buttons.find((b) => b.id === 'everyday-0').label === 'Gmail',
      'Keyboard pad undo',
    );

    // A stale request and failed disk write leave state/history intact for retry.
    const changed = (await load()).state;
    changed.pads[0].buttons.splice(0, 1);
    assert.equal((await save(changed)).ok, true);
    const deleted = await load();
    const stale = await editor.evaluate((r) => window.keepad.undo(r), changed.revision);
    assert.equal(stale.ok, false);
    await app.evaluate(() => {
      const require = process.getBuiltinModule('module').createRequire(process.execPath);
      const { Store } = require(process.cwd() + '/dist-electron/electron/store.js');
      globalThis.editToolsStore = Store;
      globalThis.editToolsWrite = Store.prototype.write;
      Store.prototype.write = async () => {
        throw Error('Simulated write failure');
      };
    });
    try {
      const failed = await editor.evaluate((r) => window.keepad.undo(r), deleted.state.revision);
      assert.equal(failed.ok, false);
      assert.deepEqual(await load(), deleted);
    } finally {
      await app.evaluate(() => {
        globalThis.editToolsStore.prototype.write = globalThis.editToolsWrite;
      });
    }
    assert.equal(
      (await editor.evaluate((r) => window.keepad.undo(r), deleted.state.revision)).ok,
      true,
    );
    assert.deepEqual((await load()).state.pads, initial.state.pads);

    // Imports and native repairs share the same history, while settings/activation don't.
    const backup = path.join(profile, 'undo-import.json');
    await writeFile(backup, JSON.stringify(initial.state));
    await app.evaluate(({ dialog }) => {
      globalThis.editToolsPicker = dialog.showOpenDialog;
    });
    try {
      await app.evaluate(({ dialog }, backup) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [backup] });
      }, backup);
      const imported = await editor.evaluate(() => window.keepad.importPads());
      assert.equal(imported.ok, true);
      assert.equal(imported.value.state.pads.length, initial.state.pads.length * 2);
      const preferences = imported.value.state;
      preferences.settings.theme = 'dark';
      preferences.activePadId = 'focus';
      assert.equal((await save(preferences)).ok, true);
      assert.equal(
        (
          await editor.evaluate(async () =>
            window.keepad.undo((await window.keepad.load()).value.state.revision),
          )
        ).ok,
        true,
      );
      assert.deepEqual((await load()).state.pads, initial.state.pads);
      assert.equal((await load()).state.settings.theme, 'dark');
      assert.equal((await load()).state.activePadId, 'focus');
      const repairFixture = (await load()).state;
      Object.assign(repairFixture.pads[0].buttons[0], {
        type: 'file',
        target: path.join(profile, 'missing.txt'),
      });
      assert.equal((await save(repairFixture)).ok, true);
      await app.evaluate(({ dialog }, file) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] });
      }, file);
      const repaired = await editor.evaluate(async () =>
        window.keepad.repairDestination(
          'everyday',
          'everyday-0',
          (await window.keepad.load()).value.state.revision,
        ),
      );
      assert.equal(repaired.ok, true);
      assert.equal(repaired.value.state.pads[0].buttons[0].target, file);
      assert.equal(
        (await editor.evaluate((r) => window.keepad.undo(r), repaired.value.state.revision)).ok,
        true,
      );
      assert.equal(
        (await load()).state.pads[0].buttons[0].target,
        repairFixture.pads[0].buttons[0].target,
      );
    } finally {
      await app.evaluate(({ dialog }) => {
        dialog.showOpenDialog = globalThis.editToolsPicker;
      });
    }

    // Foreign/missing paths can be copied for repair but cannot be revealed.
    for (const target of [
      path.join(profile, 'missing.txt'),
      process.platform === 'win32' ? '/foreign/file' : 'C:\\foreign\\file',
    ]) {
      const next = (await load()).state;
      Object.assign(next.pads[0].buttons[0], { type: 'file', target });
      assert.equal((await save(next)).ok, true);
      assert.equal((await destination('everyday-0', 'reveal')).ok, false);
      assert.equal((await destination('everyday-0', 'copy')).ok, true);
      assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), target);
    }
    assert.equal(await app.evaluate(() => globalThis.editToolsExecuted), 0);
    // Restore fixtures without using any real user data.
    assert.equal(
      (await save({ ...initial.state, revision: (await load()).state.revision })).ok,
      true,
    );
  } finally {
    await app.evaluate(({ shell }) => {
      shell.showItemInFolder = globalThis.editToolsShell.reveal;
      shell.openPath = globalThis.editToolsShell.open;
      shell.openExternal = globalThis.editToolsShell.external;
    });
  }
}

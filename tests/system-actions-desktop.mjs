import assert from 'node:assert/strict';
import path from 'node:path';
import { waitForSaved } from './saved-state.mjs';

export async function checkSystemActions(app, editor, launcher) {
  const initial = await editor.evaluate(async () => (await window.keepad.load()).value.state);
  const selected = await editor.locator('.pad-nav-item.selected .pad-nav-name').textContent();
  const modulePath = path.resolve('dist-electron/electron/system-actions.js');
  // Install the stub before creating any Sleep button. No real OS power operation is run.
  await app.evaluate((_, file) => {
    const require = process.getBuiltinModule('module').createRequire(process.execPath);
    const { systemActions } = require(file);
    globalThis.keepadOriginalSystemRun = systemActions.run;
    globalThis.keepadSystemRuns = [];
    globalThis.keepadSystemFailure = false;
    systemActions.run = async (action) => {
      globalThis.keepadSystemRuns.push(action);
      if (globalThis.keepadSystemFailure) throw Error('Sleep fixture: system policy denied sleep.');
    };
  }, modulePath);
  try {
    await editor.evaluate(() => window.keepad.showEditor());
    // Edit an existing button via the same source-aware route used by launcher menus.
    const pad = initial.pads[1];
    const button = pad.buttons[0];
    await editor.evaluate(([p, b]) => window.keepad.editButton(p, b), [pad.id, button.id]);
    await editor.getByRole('heading', { name: 'Edit button', exact: true }).waitFor();
    await editor.getByLabel('Button name', { exact: true }).fill('Sleep fixture');
    await editor.getByLabel('Action', { exact: true }).selectOption('sleep');
    assert.equal(await editor.locator('#action-target').count(), 0);
    assert.equal(await editor.getByRole('button', { name: 'Browse…', exact: true }).count(), 0);
    assert.equal(
      await editor.getByRole('option', { name: 'Lock computer', exact: true }).count(),
      0,
    );
    await editor.getByRole('button', { name: 'Save button', exact: true }).click();
    await waitForSaved(
      editor,
      (state) =>
        state.pads.find((p) => p.id === pad.id)?.buttons.find((b) => b.id === button.id)?.type ===
        'sleep',
      'Sleep save',
    );
    assert.deepEqual(await app.evaluate(() => globalThis.keepadSystemRuns), []);
    const saved = await editor.evaluate(async () => (await window.keepad.load()).value.state);
    const savedButton = saved.pads
      .find((p) => p.id === pad.id)
      .buttons.find((b) => b.id === button.id);
    assert.equal(savedButton.target, '');
    assert.equal(savedButton.icon, 'moon');
    // Mouse execution from a preview leaves active-pad identity intact.
    await editor.evaluate((id) => window.keepad.showLauncher(id), pad.id);
    await launcher.getByRole('button', { name: 'Run Sleep fixture', exact: true }).click();
    await app.evaluate(() => {
      if (globalThis.keepadSystemRuns.length !== 1) throw Error('Missing Sleep dispatch');
    });
    // Search invokes the saved source IDs, even though the source pad is inactive.
    await editor.evaluate(() => window.keepad.showLauncher());
    await launcher.getByRole('combobox', { name: 'Search all buttons' }).fill('Sleep fixture');
    await launcher.getByRole('option').first().waitFor();
    await launcher.keyboard.press('Enter');
    await launcher.getByText('Sleep requested', { exact: true }).waitFor({ state: 'attached' });
    assert.deepEqual(await app.evaluate(() => globalThis.keepadSystemRuns), ['sleep', 'sleep']);
    assert.equal(
      (await editor.evaluate(async () => (await window.keepad.load()).value.state)).activePadId,
      initial.activePadId,
    );
    const invalid = await editor.evaluate(
      async ([p, b]) => {
        const state = (await window.keepad.load()).value.state;
        state.pads.find((pad) => pad.id === p).buttons.find((button) => button.id === b).target =
          'arbitrary command';
        return window.keepad.save(state);
      },
      [pad.id, button.id],
    );
    assert.equal(invalid.ok, false);
    assert.equal((await editor.evaluate(() => window.keepad.run('missing', 'sleep'))).ok, false);
    assert.deepEqual(await app.evaluate(() => globalThis.keepadSystemRuns), ['sleep', 'sleep']);
    // OS failures surface in the launcher and leave the saved action untouched.
    await app.evaluate(() => {
      globalThis.keepadSystemFailure = true;
    });
    await editor.evaluate((id) => window.keepad.showLauncher(id), pad.id);
    await launcher.getByRole('button', { name: 'Run Sleep fixture', exact: true }).click();
    await launcher
      .getByText('Sleep fixture: system policy denied sleep.', { exact: true })
      .waitFor();
    assert.equal(
      (await editor.evaluate(async () => (await window.keepad.load()).value.state)).pads
        .find((p) => p.id === pad.id)
        .buttons.find((b) => b.id === button.id).type,
      'sleep',
    );
    await editor.evaluate(([p, b]) => window.keepad.editButton(p, b), [pad.id, button.id]);
    await editor.getByRole('heading', { name: 'Edit button', exact: true }).waitFor();
    await editor.getByLabel('Action', { exact: true }).selectOption('text');
    await editor.getByLabel('Text to copy', { exact: true }).waitFor();
    assert.equal(await editor.getByLabel('Text to copy', { exact: true }).inputValue(), '');
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
  } finally {
    if (await editor.getByRole('dialog').isVisible())
      await editor.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    await app.evaluate((_, file) => {
      const require = process.getBuiltinModule('module').createRequire(process.execPath);
      require(file).systemActions.run = globalThis.keepadOriginalSystemRun;
    }, modulePath);
    await editor.evaluate(async (initial) => {
      const current = (await window.keepad.load()).value.state;
      const result = await window.keepad.save({ ...initial, revision: current.revision });
      if (!result.ok) throw Error(result.error);
      await window.keepad.showEditor();
    }, initial);
    // Restore the editor selection expected by the surrounding suite.
    if (selected)
      await editor
        .locator('.pad-nav-item')
        .filter({ has: editor.getByText(selected, { exact: true }) })
        .click();
  }
}

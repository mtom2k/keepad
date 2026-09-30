import assert from 'node:assert/strict';

export async function checkLauncherSearch(app, editor, launcher) {
  const initial = await editor.evaluate(async () => (await window.keepad.load()).value.state);
  const field = launcher.getByRole('combobox', { name: 'Search all buttons' });
  // Two pads with identical labels, different descriptions, and harmless clipboard actions.
  const fixtures = initial.pads.slice(0, 2).map((pad, i) => ({
    ...pad,
    buttons: [
      {
        ...initial.pads[0].buttons[0],
        id: 'search-fixture',
        slot: 0,
        label: 'Search fixture',
        description: i ? 'Second café action' : 'First café action',
        type: 'text',
        target: i ? 'second-secret' : 'first-secret',
      },
    ],
  }));
  try {
    await editor.evaluate(async (pads) => {
      const state = (await window.keepad.load()).value.state;
      const result = await window.keepad.save({
        ...state,
        pads: [...pads, ...state.pads.slice(2)],
      });
      if (!result.ok) throw Error(result.error);
      await window.keepad.showLauncher();
    }, fixtures);
    await launcher.waitForFunction(
      () => document.hasFocus() && document.activeElement?.id === 'launcher-search',
    );
    await launcher.keyboard.type('cafe');
    assert.equal(await field.inputValue(), 'cafe', 'Summon is ready for immediate typing');
    await launcher.getByRole('option').first().waitFor();
    assert.equal(await launcher.getByRole('option').count(), 2);
    assert.equal(
      await launcher.getByRole('option').nth(1).getAttribute('aria-label'),
      'Run Search fixture — Deep work',
    );
    await launcher.keyboard.press('ArrowDown');
    assert.equal(await launcher.getByRole('option').nth(1).getAttribute('aria-selected'), 'true');
    await launcher.keyboard.press('Enter');
    assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), 'second-secret');
    assert.equal(
      await editor.evaluate(async () => (await window.keepad.load()).value.state.activePadId),
      initial.activePadId,
    );
    await editor.evaluate(() => window.keepad.showLauncher());
    await launcher.waitForFunction(
      () =>
        document.hasFocus() &&
        document.activeElement?.id === 'launcher-search' &&
        document.querySelector('#launcher-search').value === '',
    );
    await field.fill('first-secret');
    await launcher.getByText('No matching buttons', { exact: true }).waitFor();
    await launcher.keyboard.press('Enter');
    assert.equal(
      await app.evaluate(({ clipboard }) => clipboard.readText()),
      'second-secret',
      'No result must not run an action',
    );
    await launcher.keyboard.press('Escape');
    assert.equal(await field.inputValue(), '');
    // Destination menus resolve the result's source IDs across pads, not the active pad.
    await editor.evaluate(async () => {
      const state = (await window.keepad.load()).value.state;
      Object.assign(state.pads[1].buttons[0], {
        type: 'url',
        target: 'https://example.com/second',
      });
      const saved = await window.keepad.save(state);
      if (!saved.ok) throw Error(saved.error);
    });
    await field.fill('second');
    await launcher.getByRole('option').click({ button: 'right' });
    await launcher.getByRole('menuitem', { name: 'Copy destination' }).click();
    await launcher.getByRole('status').filter({ hasText: 'Destination copied' }).waitFor();
    assert.equal(
      await app.evaluate(({ clipboard }) => clipboard.readText()),
      'https://example.com/second',
    );
    // Undo from the other window restores the latest saved edit and leaves the query intact.
    await launcher.getByRole('button', { name: 'Undo pad edit' }).click();
    await launcher.getByRole('status').filter({ hasText: 'Pad edit undone' }).waitFor();
    const undone = await editor.evaluate(async () => (await window.keepad.load()).value.state);
    assert.equal(undone.pads[1].buttons[0].type, 'text');
    assert.equal(undone.activePadId, initial.activePadId);
    assert.equal(await field.inputValue(), 'second');
    await field.fill('');
    await app.evaluate(({ clipboard }) => clipboard.writeText('second-secret'));
    assert.equal(await launcher.getByRole('listbox').count(), 0);
    await launcher.keyboard.press('Escape');
    await app.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows().find((w) =>
        w.webContents.getURL().includes('mode=launcher'),
      );
      for (let i = 0; i < 40 && win.isVisible(); i++)
        await new Promise((resolve) => setTimeout(resolve, 25));
    });
    assert.equal(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.webContents.getURL().includes('mode=launcher'))
          .isVisible(),
      ),
      false,
    );
    await editor.evaluate(() => window.keepad.showLauncher());
    await launcher.waitForFunction(
      () => document.hasFocus() && document.activeElement?.id === 'launcher-search',
    );
    await field.fill('second');
    await launcher.keyboard.press('Shift+F10');
    await launcher.getByRole('menu').waitFor();
    await launcher.keyboard.press('Escape');
    assert.equal(await field.inputValue(), 'second', 'Menu dismissal preserves the query');
    await launcher.getByRole('option').click({ button: 'right' });
    await launcher.getByRole('menuitem', { name: 'Edit…', exact: true }).click();
    await editor.getByRole('heading', { name: 'Edit button', exact: true }).waitFor();
    assert.equal(await editor.getByLabel('Hover hint').inputValue(), 'Second café action');
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
    await editor.evaluate(async () => {
      const state = (await window.keepad.load()).value.state;
      const saved = await window.keepad.save({
        ...state,
        settings: { ...state.settings, hideAfterAction: false },
      });
      if (!saved.ok) throw Error(saved.error);
      await window.keepad.showLauncher();
    });
    await launcher.waitForFunction(
      () => document.hasFocus() && document.activeElement?.id === 'launcher-search',
    );
    await field.fill('first');
    await field.evaluate((input) => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }),
      );
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }),
      );
    });
    assert.equal(await field.inputValue(), 'first');
    assert.equal(
      await app.evaluate(({ clipboard }) => clipboard.readText()),
      'second-secret',
      'IME keys must not execute',
    );
    await launcher.getByRole('option').click();
    assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), 'first-secret');
    assert.equal(
      await field.inputValue(),
      'first',
      'Keep-open mode retains the query after running',
    );
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()
        .find((w) => w.webContents.getURL().includes('mode=editor'))
        .focus();
    });
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()
        .find((w) => w.webContents.getURL().includes('mode=launcher'))
        .focus();
    });
    await launcher.waitForFunction(() => document.hasFocus());
    assert.equal(await field.inputValue(), 'first', 'Native refocus preserves the query');
    await launcher.getByRole('option').click({ button: 'right' });
    await launcher.getByRole('menuitem', { name: 'Delete…', exact: true }).click();
    await launcher.getByRole('heading', { name: 'Delete button?', exact: true }).waitFor();
    await launcher.evaluate(() => window.keepad.hide());
    await editor.evaluate(() => window.keepad.showLauncher());
    await launcher.waitForFunction(
      () =>
        document.hasFocus() &&
        document.activeElement?.id === 'launcher-search' &&
        !document.querySelector('dialog[open]'),
    );
    assert.equal(await field.inputValue(), '');
  } catch (error) {
    console.error(
      'Search diagnostics',
      await launcher.evaluate(() => ({
        focus: document.activeElement?.outerHTML,
        hasFocus: document.hasFocus(),
        dialogs: document.querySelectorAll('dialog[open]').length,
        query: document.querySelector('#launcher-search')?.value,
      })),
    );
    throw error;
  } finally {
    await editor.evaluate(async (initial) => {
      const current = (await window.keepad.load()).value.state;
      const result = await window.keepad.save({ ...initial, revision: current.revision });
      if (!result.ok) throw Error(result.error);
    }, initial);
    await editor.getByRole('button', { name: 'Test workspace', exact: true }).click();
  }
}

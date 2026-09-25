import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function checkDestinationRepair(app, editor, profile) {
  const initial = await editor.evaluate(async () => (await window.keepad.load()).value.state);
  const file = path.join(profile, 'repaired.txt'),
    folder = path.join(profile, 'destination-folder');
  await writeFile(file, 'sample');
  await mkdir(folder);
  let pickerCalls = 0;
  await app.evaluate(({ dialog, shell }) => {
    globalThis.destinationDialog = dialog.showOpenDialog;
    globalThis.destinationOpenPath = shell.openPath;
    globalThis.destinationOpenExternal = shell.openExternal;
    globalThis.destinationOpenCalls = 0;
    shell.openPath = async () => {
      globalThis.destinationOpenCalls++;
      return '';
    };
    shell.openExternal = async () => {
      globalThis.destinationOpenCalls++;
    };
  });
  const picker = async (target) => {
    pickerCalls++;
    await app.evaluate(({ dialog }, target) => {
      dialog.showOpenDialog = async () => ({
        canceled: !target,
        filePaths: target ? [target] : [],
      });
    }, target);
  };
  try {
    await editor.evaluate(
      async ({ profile, folder }) => {
        const state = (await window.keepad.load()).value.state;
        state.pads = state.pads.map((pad, i) => ({
          ...pad,
          buttons: [
            {
              ...pad.buttons[0],
              type: i === 2 ? 'url' : i === 1 ? 'folder' : 'file',
              target: i === 2 ? 'https://example.com' : i === 1 ? folder : `${profile}/missing.txt`,
              label: i === 0 ? 'Missing report' : i === 1 ? 'Available folder' : 'Website',
            },
          ],
        }));
        const result = await window.keepad.save(state);
        if (!result.ok) throw Error(result.error);
      },
      { profile, folder },
    );
    await editor.getByRole('button', { name: 'Settings', exact: true }).click();
    await editor.getByRole('button', { name: 'Check destinations', exact: true }).click();
    await editor
      .getByText('1 of 2 destinations available · 1 needs attention.', { exact: true })
      .waitFor();
    const report = await editor.evaluate(
      async () => (await window.keepad.checkDestinations()).value,
    );
    assert.equal(report.issues[0].status, 'missing');
    const originalTarget = report.issues[0].target;
    const repair = editor.getByRole('button', {
      name: 'Repair Missing report on Everyday',
      exact: true,
    });
    const originalBounds = await app.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows().find((w) =>
        w.webContents.getURL().includes('mode=editor'),
      );
      const bounds = window.getBounds();
      window.setSize(820, 600);
      return bounds;
    });
    await repair.hover();
    await editor.getByRole('tooltip').waitFor();
    const tooltip = await editor.getByRole('tooltip').boundingBox();
    const view = await editor.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    assert.ok(
      tooltip.x >= 0 &&
        tooltip.y >= 0 &&
        tooltip.x + tooltip.width <= view.width &&
        tooltip.y + tooltip.height <= view.height,
    );
    await app.evaluate(
      ({ BrowserWindow }, bounds) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.webContents.getURL().includes('mode=editor'))
          .setBounds(bounds),
      originalBounds,
    );
    await picker(null);
    await repair.click();
    await editor.waitForFunction(
      async () => (await window.keepad.load()).value.deviceTargets.length === 0,
    );
    await editor.waitForFunction(
      () =>
        !document.querySelector('button[aria-label="Repair Missing report on Everyday"]')?.disabled,
    );
    await picker(folder);
    await repair.click();
    await editor.getByRole('alert').filter({ hasText: 'Wrong destination type' }).waitFor();
    await picker(file);
    await repair.click();
    await editor.getByText('2 of 2 destinations available.', { exact: true }).waitFor();
    const after = await editor.evaluate(async () => (await window.keepad.load()).value);
    assert.equal(after.state.pads[0].buttons[0].target, originalTarget);
    assert.equal(after.deviceTargets[0].target, file);
    assert.equal(after.state.activePadId, initial.activePadId);
    assert.equal(await app.evaluate(() => globalThis.destinationOpenCalls), 0);
    // Old scan revisions and deleted/changed actions cannot be repaired silently.
    const stale = await editor.evaluate(
      (report) =>
        window.keepad.repairDestination(
          report.issues[0].padId,
          report.issues[0].buttonId,
          report.revision,
        ),
      report,
    );
    assert.equal(stale.ok, false);
    assert.match(stale.error, /changed/);
    await editor.evaluate(async () => {
      const s = (await window.keepad.load()).value.state;
      s.pads[0].name = 'Changed';
      await window.keepad.save(s);
    });
    await editor
      .getByText('Your pads changed. Check again before repairing.', { exact: true })
      .waitFor();
    await editor.getByRole('button', { name: 'Check again', exact: true }).click();
    await editor.getByText('2 of 2 destinations available.', { exact: true }).waitFor();
    await editor.getByRole('button', { name: 'Close', exact: true }).click();
    assert.ok(pickerCalls === 3);
    // A library edit while the native picker is open must not be overwritten.
    await app.evaluate(({ dialog, ipcMain }, replacement) => {
      dialog.showOpenDialog = async () => {
        await new Promise((resolve) => ipcMain.once('test:destination-picker-release', resolve));
        return { canceled: false, filePaths: [replacement] };
      };
    }, file);
    const pendingRepair = editor.evaluate(async () => {
      const s = (await window.keepad.load()).value.state;
      return window.keepad.repairDestination(s.pads[0].id, s.pads[0].buttons[0].id, s.revision);
    });
    await app.evaluate(async ({ ipcMain }) => {
      const until = Date.now() + 3000;
      while (!ipcMain.listenerCount('test:destination-picker-release')) {
        if (Date.now() > until) throw Error('Repair picker did not open');
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    });
    await editor.evaluate(async () => {
      const s = (await window.keepad.load()).value.state;
      s.pads[0].buttons[0].description = 'Edit made while repairing';
      await window.keepad.save(s);
    });
    await app.evaluate(({ ipcMain }) => ipcMain.emit('test:destination-picker-release'));
    const raced = await pendingRepair;
    assert.equal(raced.ok, false);
    assert.match(raced.error, /changed/);
    assert.equal(
      (await editor.evaluate(async () => (await window.keepad.load()).value.state)).pads[0]
        .buttons[0].description,
      'Edit made while repairing',
    );
  } finally {
    await app.evaluate(({ dialog, shell }) => {
      dialog.showOpenDialog = globalThis.destinationDialog;
      shell.openPath = globalThis.destinationOpenPath;
      shell.openExternal = globalThis.destinationOpenExternal;
    });
    await editor.evaluate(async (initial) => {
      const s = (await window.keepad.load()).value.state;
      const result = await window.keepad.save({ ...initial, revision: s.revision });
      if (!result.ok) throw Error(result.error);
    }, initial);
    await editor.getByRole('button', { name: 'Everyday ACTIVE', exact: true }).click();
  }
}

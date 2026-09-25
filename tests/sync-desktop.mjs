import assert from 'node:assert/strict';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { Store } from '../dist-electron/electron/store.js';
import { SyncEngine } from '../dist-electron/electron/sync.js';
import { makeDefaultState } from '../dist-electron/shared/model.js';

export async function checkSync(app, editor, profile) {
  const initial = await editor.evaluate(async () => (await window.keepad.load()).value.state);
  const folder = path.join(profile, 'shared');
  await mkdir(folder);
  const remoteStore = new Store(
    path.join(profile, 'simulated-windows', 'keepad.json'),
    makeDefaultState(),
  );
  await remoteStore.load();
  const remote = new SyncEngine(remoteStore, 'win32');
  const load = () => editor.evaluate(async () => (await window.keepad.load()).value);
  const refresh = () =>
    editor.evaluate(async () => {
      const result = await window.keepad.refreshSync();
      if (!result.ok) throw Error(result.error);
      return result.value;
    });
  const settings = async () => {
    await editor.getByRole('button', { name: 'Settings', exact: true }).click();
  };
  await app.evaluate(({ dialog, shell }) => {
    globalThis.syncDialog = dialog.showOpenDialog;
    globalThis.syncOpenPath = shell.openPath;
    shell.openPath = async (target) => {
      globalThis.syncOpened = target;
      return '';
    };
  });
  const picker = (file) =>
    app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] });
    }, file);
  try {
    await settings();
    await picker(folder);
    await editor.getByRole('button', { name: 'Choose sync folder…' }).click();
    await editor.getByRole('heading', { name: 'Create shared library?' }).waitFor();
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal((await load()).sync.folder, undefined);
    await editor.getByRole('button', { name: 'Choose sync folder…' }).click();
    await editor.getByRole('button', { name: 'Create shared library', exact: true }).click();
    await editor.getByRole('button', { name: 'Disconnect…' }).waitFor();
    assert.equal((await load()).sync.folder, folder);
    assert.equal(
      (await editor.evaluate(() => window.keepad.connectSync('not-a-picker-token'))).ok,
      false,
    );
    await remote.connect(folder, (await remote.inspect(folder)).fingerprint);
    const next = structuredClone(remoteStore.state);
    next.pads.find((p) => p.id === 'focus').name = 'From Windows';
    next.revision++;
    await remote.save(next);
    await remote.tick();
    await editor.getByRole('button', { name: 'Check folder', exact: true }).click();
    await editor.getByRole('button', { name: 'From Windows', exact: true }).waitFor();
    assert.equal((await load()).state.activePadId, initial.activePadId);
    assert.deepEqual((await load()).state.settings, initial.settings);

    const sharedFile = path.join(profile, 'shared-target.txt'),
      localFile = path.join(profile, 'local-target.txt');
    await writeFile(sharedFile, 'sample');
    await writeFile(localFile, 'device sample');
    await editor.evaluate(async (target) => {
      const state = (await window.keepad.load()).value.state;
      const button = state.pads
        .find((p) => p.id === 'everyday')
        .buttons.find((b) => b.label === 'Gmail');
      button.type = 'file';
      button.target = target;
      const saved = await window.keepad.save(state);
      if (!saved.ok) throw Error(saved.error);
    }, sharedFile);
    await refresh();
    await editor.getByRole('button', { name: 'Everyday ACTIVE', exact: true }).click();
    await editor.getByRole('button', { name: 'Edit Gmail', exact: true }).click();
    await picker(localFile);
    await editor.getByRole('button', { name: 'Choose…', exact: true }).click();
    await editor.getByRole('button', { name: 'Save button', exact: true }).click();
    await editor
      .getByRole('heading', { name: 'Edit button', exact: true })
      .waitFor({ state: 'hidden' });
    const state = await load(),
      button = state.state.pads
        .find((p) => p.id === 'everyday')
        .buttons.find((b) => b.label === 'Gmail');
    assert.equal(button.target, sharedFile);
    assert.equal(state.deviceTargets[0].target, localFile);
    const ran = await editor.evaluate(({ padId, buttonId }) => window.keepad.run(padId, buttonId), {
      padId: 'everyday',
      buttonId: button.id,
    });
    assert.equal(ran.ok, true);
    assert.equal(await app.evaluate(() => globalThis.syncOpened), localFile);
    await refresh();
    await remote.tick();
    assert.equal(remoteStore.device.targets.length, 0);
    assert.equal(
      remoteStore.state.pads
        .find((p) => p.id === 'everyday')
        .buttons.find((b) => b.label === 'Gmail').target,
      sharedFile,
    );

    // Remote arrival must not let an already-open editor overwrite a newer button.
    await editor.getByRole('button', { name: 'Edit Gmail', exact: true }).click();
    await editor.getByLabel('Button name', { exact: true }).fill('Stale draft');
    const incoming = structuredClone(remoteStore.state);
    incoming.pads
      .find((p) => p.id === 'everyday')
      .buttons.find((b) => b.label === 'Gmail').description = 'Remote change';
    incoming.revision++;
    await remote.save(incoming);
    await remote.tick();
    await refresh();
    await editor.getByRole('button', { name: 'Save button', exact: true }).click();
    await editor.getByRole('alert').filter({ hasText: 'library changed' }).waitFor();
    assert.equal(
      (await load()).state.pads
        .find((p) => p.id === 'everyday')
        .buttons.find((b) => b.label === 'Gmail').label,
      'Gmail',
    );
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click();

    // Both writes start from the same known history; neither edit can erase the other.
    await editor.evaluate(async () => {
      const state = (await window.keepad.load()).value.state;
      state.pads.find((p) => p.id === 'everyday').name = 'Mac version';
      const saved = await window.keepad.save(state);
      if (!saved.ok) throw Error(saved.error);
    });
    const competing = structuredClone(remoteStore.state);
    competing.pads.find((p) => p.id === 'everyday').name = 'Windows version';
    competing.revision++;
    await remote.save(competing);
    await remote.tick();
    await refresh();
    await editor.getByRole('button', { name: 'Sync needs attention', exact: true }).click();
    await editor.getByRole('button', { name: 'Keep both as pads', exact: true }).waitFor();
    const blocked = await editor.evaluate(
      ({ padId, buttonId }) => window.keepad.run(padId, buttonId),
      { padId: 'everyday', buttonId: button.id },
    );
    assert.equal(blocked.ok, false);
    assert.match(blocked.error, /conflicting versions/);
    const blockedRepair = await editor.evaluate(async (buttonId) => {
      const state = (await window.keepad.load()).value.state;
      return window.keepad.repairDestination('everyday', buttonId, state.revision);
    }, button.id);
    assert.equal(blockedRepair.ok, false);
    assert.match(blockedRepair.error, /conflicting versions/);
    const bounds = await app.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows().find((w) =>
        w.webContents.getURL().includes('mode=editor'),
      );
      const bounds = window.getBounds();
      window.setSize(820, 600);
      return bounds;
    });
    await editor
      .getByRole('button', { name: 'Keep both as pads', exact: true })
      .scrollIntoViewIfNeeded();
    await editor.mouse.move(0, 0);
    await editor.locator('.toast').waitFor({ state: 'hidden' });
    await editor.screenshot({ path: 'test-results/sync-conflict.png', scale: 'css' });
    await editor.getByRole('button', { name: 'Review', exact: true }).first().click();
    await editor.getByRole('button', { name: 'Close review', exact: true }).waitFor();
    await editor.screenshot({ path: 'test-results/sync-review.png', scale: 'css' });
    await editor.getByRole('button', { name: 'Close review', exact: true }).click();
    await app.evaluate(({ BrowserWindow }, bounds) => {
      BrowserWindow.getAllWindows()
        .find((w) => w.webContents.getURL().includes('mode=editor'))
        .setBounds(bounds);
    }, bounds);
    await editor.getByRole('button', { name: 'Keep both as pads', exact: true }).click();
    await editor
      .getByRole('button', { name: 'Keep both as pads', exact: true })
      .waitFor({ state: 'hidden' });
    assert.equal((await load()).state.pads.length, initial.pads.length + 1);
    await remote.tick();
    assert.equal(remote.status().conflicts.length, 0);
    await editor.getByRole('button', { name: 'Disconnect…' }).click();
    await editor.getByRole('button', { name: 'Keep local copy', exact: true }).click();
    await editor.getByRole('button', { name: 'Choose sync folder…' }).waitFor();
    assert.equal((await load()).sync.folder, undefined);
    assert.ok((await readdir(profile)).some((file) => file.includes('before-sync')));
  } finally {
    await app.evaluate(({ dialog, shell }) => {
      dialog.showOpenDialog = globalThis.syncDialog;
      shell.openPath = globalThis.syncOpenPath;
    });
    await editor.evaluate(async (initial) => {
      if ((await window.keepad.load()).value.sync.folder) await window.keepad.disconnectSync();
      const current = (await window.keepad.load()).value.state;
      const saved = await window.keepad.save({ ...initial, revision: current.revision });
      if (!saved.ok) throw Error(saved.error);
    }, initial);
    await editor.getByRole('button', { name: 'Everyday ACTIVE', exact: true }).click();
  }
}

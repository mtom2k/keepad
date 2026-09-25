import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink, chmod } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  inspectDestination,
  checkDestinations,
  createDestinationInspector,
} from '../electron/destinations.js';
import { makeDefaultState } from '../shared/model.js';
import { Store } from '../electron/store.js';

test('destination inspection distinguishes missing, wrong-type, and foreign paths without opening them', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'keepad-destinations-'));
  try {
    const file = path.join(root, 'report.txt'),
      app = path.join(root, 'Sample.app');
    await writeFile(file, 'sample');
    await mkdir(app);
    assert.equal(await inspectDestination(file, 'file'), 'available');
    assert.equal(await inspectDestination(root, 'folder'), 'available');
    assert.equal(await inspectDestination(file, 'folder'), 'wrong-type');
    assert.equal(await inspectDestination(root, 'file'), 'wrong-type');
    assert.equal(await inspectDestination(app, 'app', 'darwin'), 'available');
    assert.equal(await inspectDestination(root, 'app', 'darwin'), 'wrong-type');
    assert.equal(await inspectDestination(path.join(root, 'missing'), 'file'), 'missing');
    assert.equal(await inspectDestination(path.join(file, 'nested'), 'file'), 'missing');
    assert.equal(
      await inspectDestination('C:\\Users\\Sample\\report.txt', 'file', 'darwin'),
      'foreign',
    );
    assert.equal(await inspectDestination('/Users/Sample/report.txt', 'file', 'win32'), 'foreign');
    if (process.platform !== 'win32') {
      const link = path.join(root, 'dangling');
      await symlink(path.join(root, 'missing'), link);
      assert.equal(await inspectDestination(link, 'file'), 'missing');
      if (process.getuid?.() !== 0) {
        await chmod(file, 0);
        assert.equal(await inspectDestination(file, 'file'), 'denied');
        await chmod(file, 0o600);
      }
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('scan spans pads, uses only matching device overrides, skips text/URLs, and does not modify data', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'keepad-destinations-'));
  try {
    const file = path.join(root, 'report.txt');
    await writeFile(file, 'sample');
    const state = makeDefaultState();
    const first = state.pads[0].buttons[0];
    first.type = 'file';
    first.target = path.join(root, 'old');
    const second = state.pads[1].buttons[0];
    second.type = 'folder';
    second.target = path.join(root, 'missing');
    const store = new Store(path.join(root, 'keepad.json'), state);
    store.device.targets = [
      {
        padId: state.pads[0].id,
        buttonId: first.id,
        type: 'file',
        original: first.target,
        target: file,
      },
      {
        padId: state.pads[1].id,
        buttonId: second.id,
        type: 'folder',
        original: 'outdated',
        target: root,
      },
    ];
    const before = JSON.stringify({ state, device: store.device });
    const report = await checkDestinations(state, store.device);
    assert.equal(report.total, 2);
    assert.equal(report.available, 1);
    assert.equal(report.issues[0].buttonId, second.id);
    assert.equal(report.issues[0].status, 'missing');
    assert.equal(report.issues[0].local, false);
    assert.equal(JSON.stringify({ state, device: store.device }), before);
    await rm(file);
    const missingOverride = await checkDestinations(state, store.device);
    assert.equal(missingOverride.issues[0].local, true);
    assert.equal(missingOverride.issues[0].target, file);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('slow probes time out without releasing native concurrency slots or accumulating duplicate calls', async () => {
  const releases: (() => void)[] = [];
  const inspect = createDestinationInspector(
    () => new Promise((resolve) => releases.push(() => resolve('available'))),
    10,
  );
  const paths = Array.from({ length: 4 }, (_, i) => `/Sample/blocked-${i}`);
  const first = paths.map((p) => inspect(p, 'file', 'darwin'));
  const duplicate = inspect(paths[0], 'file', 'darwin');
  assert.equal(await inspect('/Sample/extra', 'file', 'darwin'), 'not-checked');
  assert.deepEqual(await Promise.all(first), Array(4).fill('unavailable'));
  assert.equal(await duplicate, 'unavailable');
  assert.equal(releases.length, 4);
  assert.equal(await inspect('/Sample/extra', 'file', 'darwin'), 'not-checked');
  releases.forEach((resolve) => resolve());
  await new Promise((resolve) => setImmediate(resolve));
  const resumed = inspect('/Sample/extra', 'file', 'darwin');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(releases.length, 5);
  releases[4]();
  assert.equal(await resumed, 'available');
});

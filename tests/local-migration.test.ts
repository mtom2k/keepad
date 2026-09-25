import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, writeFile, mkdir, rm, chmod } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../electron/store.js';
import { makeDefaultState } from '../shared/model.js';

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'keepad-local-'));
  const file = path.join(root, 'keepad.json');
  const state = makeDefaultState();
  state.pads[0].name = 'Latest local edits';
  state.settings.theme = 'dark';
  state.revision = 41;
  const button = state.pads[0].buttons[0];
  button.type = 'file';
  button.target = '/Old/report.txt';
  const target = {
    padId: state.pads[0].id,
    buttonId: button.id,
    type: button.type,
    original: button.target,
    target: '/Local/report.txt',
  };
  const raw = {
    ...state,
    device: {
      version: 1,
      folder: path.join(root, 'former-folder'),
      heads: [{ padId: state.pads[0].id, ids: ['conflict-a', 'conflict-b'] }],
      pending: [{ historical: 'preserve verbatim' }],
      targets: [target],
    },
  };
  await mkdir(raw.device.folder);
  await writeFile(path.join(raw.device.folder, 'sentinel'), 'Never modify this folder');
  const save = () => writeFile(file, JSON.stringify(raw));
  await save();
  return { root, file, state, raw, save, store: new Store(file, makeDefaultState()) };
}

for (const target of ['/Users/Sample/report.txt', 'C:\\Users\\Sample\\report.txt']) {
  test(`migration preserves effective destinations and local edits: ${target}`, async () => {
    const f = await fixture();
    try {
      f.raw.device.targets[0].target = target;
      await f.save();
      const original = await readFile(f.file, 'utf8');
      const expected = structuredClone(f.state);
      expected.pads[0].buttons[0].target = target;
      expected.revision++;
      assert.deepEqual(await f.store.load(), expected);
      const persisted = JSON.parse(await readFile(f.file, 'utf8'));
      assert.deepEqual(persisted, expected);
      assert.equal(persisted.device, undefined);
      const backups = (await readdir(f.root)).filter((n) => n.includes('.before-local-'));
      assert.equal(backups.length, 1);
      assert.equal(await readFile(path.join(f.root, backups[0]), 'utf8'), original);
      assert.deepEqual(await readdir(f.raw.device.folder), ['sentinel']);
      assert.equal(
        await readFile(path.join(f.raw.device.folder, 'sentinel'), 'utf8'),
        'Never modify this folder',
      );
      const restarted = new Store(f.file, makeDefaultState());
      assert.deepEqual(await restarted.load(), expected);
      assert.equal(restarted.warning, undefined);
      assert.equal((await readdir(f.root)).filter((n) => n.includes('.before-local-')).length, 1);
    } finally {
      await rm(f.root, { recursive: true, force: true });
    }
  });
}

test('outdated or unrelated device destinations do not overwrite current actions', async () => {
  const f = await fixture();
  try {
    f.raw.device.targets[0].original = '/Outdated/file';
    f.raw.device.targets.push({ ...f.raw.device.targets[0], buttonId: 'deleted-button' });
    await f.save();
    assert.deepEqual(await f.store.load(), { ...f.state, revision: 42 });
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('unsupported metadata and invalid replacement paths fail without rewriting valid pads', async () => {
  const f = await fixture();
  try {
    for (const malformed of ['version', 'relative-path']) {
      f.raw.device.version = malformed === 'version' ? 2 : 1;
      f.raw.device.targets[0].target =
        malformed === 'relative-path' ? 'relative.txt' : '/Local/report.txt';
      await f.save();
      const original = await readFile(f.file, 'utf8');
      await assert.rejects(f.store.load());
      assert.equal(await readFile(f.file, 'utf8'), original);
      assert.deepEqual(f.store.state, f.state);
    }
    assert.equal((await readdir(f.root)).filter((n) => n.includes('.before-local-')).length, 2);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('failed migration writes leave the original and recovery copy intact and can be retried', async () => {
  const f = await fixture();
  try {
    const original = await readFile(f.file, 'utf8');
    await mkdir(`${f.file}.tmp`);
    await assert.rejects(f.store.load());
    assert.equal(await readFile(f.file, 'utf8'), original);
    assert.deepEqual(f.store.state, f.state);
    const backup = (await readdir(f.root)).find((n) => n.includes('.before-local-'))!;
    assert.equal(await readFile(path.join(f.root, backup), 'utf8'), original);
    await rm(`${f.file}.tmp`, { recursive: true });
    assert.equal((await f.store.load()).pads[0].buttons[0].target, '/Local/report.txt');
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test(
  'backup failure stops migration before any overwrite',
  { skip: process.platform === 'win32' || process.getuid?.() === 0 },
  async () => {
    const f = await fixture();
    try {
      const original = await readFile(f.file, 'utf8');
      await chmod(f.root, 0o500);
      await assert.rejects(f.store.load());
      assert.equal(await readFile(f.file, 'utf8'), original);
      assert.deepEqual(f.store.state, f.state);
    } finally {
      await chmod(f.root, 0o700);
      await rm(f.root, { recursive: true, force: true });
    }
  },
);

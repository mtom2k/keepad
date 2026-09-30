import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ButtonSchema, makeDefaultState, mergeImported, StateSchema } from '../shared/model.js';
import { Store } from '../electron/store.js';
import { checkDestinations } from '../electron/destinations.js';

test('sleep has no destination; original action validation and import rules remain intact', async () => {
  const state = makeDefaultState();
  const base = state.pads[0].buttons[0];
  const sleep = { ...base, type: 'sleep', target: '', icon: 'moon' };
  assert.equal(ButtonSchema.safeParse(sleep).success, true);
  for (const target of [' ', 'sleep', '/tmp/file', 'powershell evil'])
    assert.equal(ButtonSchema.safeParse({ ...sleep, target }).success, false);
  for (const type of ['url', 'file', 'folder', 'app', 'text', 'lock', 'command'])
    assert.equal(ButtonSchema.safeParse({ ...sleep, type }).success, false);
  state.pads[0].buttons = [ButtonSchema.parse(sleep)];
  assert.equal(StateSchema.parse(state).schemaVersion, 1);
  let id = 0;
  const imported = mergeImported(makeDefaultState(), state, () => `sleep-${++id}`);
  assert.equal(imported.pads[3].buttons[0].type, 'sleep');
  assert.equal(imported.pads[3].buttons[0].target, '');
  assert.equal(imported.activePadId, 'everyday');
  const report = await checkDestinations({ ...state, pads: [state.pads[0]] });
  assert.equal(report.total, 0);
});

test('legacy files load unchanged and first Sleep or moon save preserves exact recovery bytes', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'keepad-sleep-store-'));
  try {
    for (const feature of ['sleep', 'button-icon', 'pad-icon']) {
      const file = path.join(dir, `${feature}.json`);
      const old = makeDefaultState();
      const bytes = JSON.stringify(old, null, 4) + '\n';
      await writeFile(file, bytes);
      const store = new Store(file, makeDefaultState());
      assert.deepEqual(await store.load(), old);
      assert.equal(await readFile(file, 'utf8'), bytes);
      const next = structuredClone(old);
      next.revision++;
      if (feature === 'sleep')
        Object.assign(next.pads[0].buttons[0], { type: 'sleep', target: '' });
      else if (feature === 'button-icon') next.pads[0].buttons[0].icon = 'moon';
      else next.pads[0].icon = 'moon';
      await store.write(next);
      const copies = () =>
        readdir(dir).then((files) =>
          files.filter((name) => name.startsWith(`${feature}.json.before-system-actions-`)),
        );
      assert.equal((await copies()).length, 1);
      assert.equal(await readFile(path.join(dir, (await copies())[0]), 'utf8'), bytes);
      const reopened = new Store(file, makeDefaultState());
      assert.deepEqual(await reopened.load(), next);
      await reopened.write({ ...next, revision: next.revision + 1 });
      assert.equal((await copies()).length, 1, 'ordinary saves/restarts do not repeat the backup');
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('failed pre-feature backup or replacement cannot overwrite the previous pads', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'keepad-sleep-failure-'));
  try {
    const file = path.join(dir, 'keepad.json');
    const store = new Store(file, makeDefaultState());
    await store.load();
    const original = await readFile(file, 'utf8');
    const old = structuredClone(store.state);
    const next = structuredClone(old);
    Object.assign(next.pads[0].buttons[0], { type: 'sleep', target: '' });
    // Inject a backup denial independently of host filesystem permission semantics.
    const backup = mock.method(
      store as unknown as { backup: (kind: string) => Promise<string> },
      'backup',
      async () => {
        throw Object.assign(Error('backup denied'), { code: 'EACCES' });
      },
    );
    await assert.rejects(store.write(next), /backup denied/);
    assert.equal(await readFile(file, 'utf8'), original);
    assert.deepEqual(store.state, old);
    backup.mock.restore();
    await mkdir(`${file}.tmp`);
    await assert.rejects(store.write(next));
    assert.equal(await readFile(file, 'utf8'), original);
    assert.deepEqual(store.state, old);
    const copy = (await readdir(dir)).find((name) => name.includes('.before-system-actions-'))!;
    assert.equal(await readFile(path.join(dir, copy), 'utf8'), original);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

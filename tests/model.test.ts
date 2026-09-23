import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { makeDefaultState, StateSchema, ButtonSchema, mergeImported } from '../shared/model.js';
import { Store } from '../electron/store.js';
test('legacy settings gain System appearance without resetting existing data', async () => {
  const original = makeDefaultState();
  const legacy = JSON.parse(JSON.stringify(original));
  delete legacy.settings.theme;
  const dir = await mkdtemp(path.join(os.tmpdir(), 'keepad-legacy-theme-'));
  try {
    const file = path.join(dir, 'keepad.json');
    await writeFile(file, JSON.stringify(legacy));
    const store = new Store(file, makeDefaultState());
    assert.deepEqual(await store.load(), original);
    assert.equal(store.warning, undefined);
    assert.deepEqual(await readdir(dir), ['keepad.json']);
    const next = structuredClone(store.state);
    next.settings.theme = 'dark';
    next.pads[0].icon = 'none';
    await store.write(next);
    assert.deepEqual(await new Store(file, makeDefaultState()).load(), next);
    let counter = 0;
    const imported = mergeImported(next, legacy, () => `legacy-${counter++}`);
    assert.equal(imported.settings.theme, 'dark');
    assert.equal(imported.pads.length, next.pads.length + legacy.pads.length);
    const roundTrip = mergeImported(original, next, () => `new-${counter++}`);
    assert.equal(roundTrip.pads[original.pads.length].icon, 'none');
    assert.equal(roundTrip.settings.theme, 'system');
    assert.equal(
      StateSchema.safeParse({ ...next, settings: { ...next.settings, theme: 'invalid' } }).success,
      false,
    );
    assert.equal(
      ButtonSchema.safeParse({ ...next.pads[0].buttons[0], icon: 'none' }).success,
      false,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test('starter pads validate on both operating systems', () => {
  for (const home of ['/Users/test', 'C:\\Users\\test'])
    assert.equal(
      StateSchema.safeParse(
        makeDefaultState({ home, downloads: `${home}/Downloads`, documents: `${home}/Documents` }),
      ).success,
      true,
    );
});
test('only HTTP and HTTPS destinations can reach the OS URL handler', () => {
  const b = makeDefaultState().pads[0].buttons[0];
  for (const target of [
    'file:///etc/passwd',
    'javascript:alert(1)',
    'data:text/html,test',
    'ms-settings:test',
    'example.com',
    'https://',
  ])
    assert.equal(ButtonSchema.safeParse({ ...b, target }).success, false, target);
  for (const target of ['https://example.com/a?q=test', 'http://localhost:3000'])
    assert.equal(ButtonSchema.safeParse({ ...b, target }).success, true);
});
test('path actions require absolute destinations', () => {
  const b = makeDefaultState().pads[0].buttons[0];
  for (const target of ['../private', 'relative/file', 'C:relative', '/test\0file'])
    assert.equal(ButtonSchema.safeParse({ ...b, type: 'file', target }).success, false);
  for (const target of ['/Users/test/file', 'C:\\Users\\test\\file', '\\\\server\\share\\file'])
    assert.equal(ButtonSchema.safeParse({ ...b, type: 'file', target }).success, true);
});
test('rejects ambiguous positions, invalid active pads, and destructive resizing', () => {
  let state = makeDefaultState();
  state.pads[0].buttons[1].slot = 0;
  assert.equal(StateSchema.safeParse(state).success, false);
  state = makeDefaultState();
  state.activePadId = 'missing';
  assert.equal(StateSchema.safeParse(state).success, false);
  state = makeDefaultState();
  state.pads[0].columns = 3;
  state.pads[0].rows = 2;
  assert.equal(StateSchema.safeParse(state).success, false);
  state = makeDefaultState();
  state.pads = [];
  assert.equal(StateSchema.safeParse(state).success, false);
});
test('images cannot load remote content or SVG scripts', () => {
  const button = makeDefaultState().pads[0].buttons[0];
  for (const image of [
    'https://example.com/tracker.png',
    'data:image/svg+xml;base64,abcd',
    'file:///private/photo.png',
  ])
    assert.equal(ButtonSchema.safeParse({ ...button, image }).success, false);
});
test('import merges with fresh IDs without changing local preferences', () => {
  const current = makeDefaultState();
  let n = 0;
  const result = mergeImported(current, current, () => `new-${++n}`);
  assert.equal(result.pads.length, 6);
  assert.equal(result.activePadId, current.activePadId);
  assert.deepEqual(result.settings, current.settings);
  assert.notEqual(result.pads[3].id, current.pads[0].id);
  assert.notEqual(result.pads[3].buttons[0].id, current.pads[0].buttons[0].id);
  assert.equal(result.pads[0].buttons.length, 8);
});
test('atomic store survives reload, rejects invalid writes, preserves corrupt data', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'keepad-unit-'));
  try {
    const file = path.join(dir, 'keepad.json');
    const store = new Store(file, makeDefaultState());
    await store.load();
    const next = { ...store.state, activePadId: 'focus', revision: 1 };
    await store.write(next);
    const reopened = new Store(file, makeDefaultState());
    await reopened.load();
    assert.equal(reopened.state.activePadId, 'focus');
    await assert.rejects(() => store.write({ ...next, pads: [] }));
    assert.equal(JSON.parse(await readFile(file, 'utf8')).activePadId, 'focus');
    await writeFile(file, 'broken original data');
    const recovered = new Store(file, makeDefaultState());
    await recovered.load();
    assert.match(recovered.warning ?? '', /recovery copy/);
    const backup = (await readdir(dir)).find((n) => n.includes('.recovery-'))!;
    assert.equal(await readFile(path.join(dir, backup), 'utf8'), 'broken original data');
    assert.equal(recovered.state.activePadId, 'everyday');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

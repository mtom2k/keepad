import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { makeDefaultState, StateSchema } from '../shared/model.js';
import { copyOrMoveButton, emptySlot } from '../src/button-actions.js';
import { describeFile } from '../electron/file-binding.js';

test('duplicate and cross-pad move preserve actions, source state, and active pad', () => {
  const original = makeDefaultState();
  const before = structuredClone(original);
  const source = original.pads[0],
    target = original.pads[1],
    button = source.buttons[0];
  const duplicate = copyOrMoveButton(original, source.id, button.id, source.id, true, 'copy');
  assert.equal(duplicate.pads[0].buttons.length, source.buttons.length + 1);
  assert.deepEqual(duplicate.pads[0].buttons.at(-1), {
    ...button,
    id: 'copy',
    slot: emptySlot(source),
  });
  const moved = copyOrMoveButton(duplicate, source.id, 'copy', target.id, false, 'unused');
  assert.equal(
    moved.pads[0].buttons.some((b) => b.id === 'copy'),
    false,
  );
  assert.equal(moved.pads[1].buttons.at(-1)?.target, button.target);
  assert.equal(moved.activePadId, original.activePadId);
  assert.equal(StateSchema.safeParse(moved).success, true);
  assert.deepEqual(original, before);
});

test('full pads reject insertion without losing buttons; move resolves ID collisions', () => {
  const state = makeDefaultState();
  const source = state.pads[0],
    target = state.pads[1];
  target.buttons = [{ ...source.buttons[0], slot: 0 }];
  const moved = copyOrMoveButton(
    state,
    source.id,
    source.buttons[0].id,
    target.id,
    false,
    'unique',
  );
  assert.equal(moved.pads[1].buttons.at(-1)?.id, 'unique');
  assert.equal(StateSchema.safeParse(moved).success, true);
  target.buttons = Array.from({ length: target.columns * target.rows }, (_, slot) => ({
    ...source.buttons[0],
    id: `full-${slot}`,
    slot,
  }));
  const before = structuredClone(state);
  assert.equal(emptySlot(target), undefined);
  assert.throws(
    () => copyOrMoveButton(state, source.id, source.buttons[0].id, target.id, false, 'new'),
    /no empty/,
  );
  assert.deepEqual(state, before);
});

test('file drops inspect real destinations and reject non-file or invalid paths', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'keepad-binding-'));
  try {
    const file = path.join(dir, 'Notes.txt');
    await writeFile(file, 'sample');
    assert.deepEqual(await describeFile(file), {
      target: file,
      type: 'file',
      icon: 'file',
      label: 'Notes.txt',
    });
    assert.equal((await describeFile(dir)).type, 'folder');
    if (process.platform === 'darwin') {
      const app = path.join(dir, 'Example.app');
      await mkdir(app);
      assert.equal((await describeFile(app)).type, 'app');
    }
    if (process.platform === 'win32') {
      const app = path.join(dir, 'Example.exe');
      await writeFile(app, 'fixture, never executed');
      assert.equal((await describeFile(app)).type, 'app');
    }
    for (const invalid of [
      '',
      'relative',
      'https://example.com',
      null,
      `${file}\0`,
      path.join(dir, 'missing'),
    ])
      await assert.rejects(describeFile(invalid));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

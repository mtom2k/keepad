import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeDefaultState, PadSchema } from '../shared/model.js';
import { placeButton } from '../src/pad-layout.js';

test('moves and swaps preserve every action and leave the original pad untouched', () => {
  const pad = makeDefaultState().pads[0];
  const before = structuredClone(pad);
  const source = pad.buttons[0];
  for (const slot of [0, 1, 11]) {
    const result = placeButton(pad, { ...source, slot }, source.slot);
    assert.equal(PadSchema.safeParse(result).success, true);
    assert.equal(result.buttons.length, pad.buttons.length);
    for (const original of pad.buttons) {
      const moved = result.buttons.find((b) => b.id === original.id)!;
      assert.deepEqual({ ...moved, slot: original.slot }, original);
    }
    assert.equal(result.buttons.find((b) => b.id === source.id)?.slot, slot);
    if (slot === 1) assert.equal(result.buttons.find((b) => b.id === pad.buttons[1].id)?.slot, 0);
  }
  assert.deepEqual(pad, before);
});

test('new button at an occupied destination relocates the occupant into its empty origin', () => {
  const pad = makeDefaultState().pads[0];
  const draft = { ...pad.buttons[0], id: 'new-button', label: 'New action', slot: 1 };
  const result = placeButton(pad, draft, 11);
  assert.equal(PadSchema.safeParse(result).success, true);
  assert.equal(result.buttons.length, pad.buttons.length + 1);
  assert.equal(result.buttons.find((b) => b.id === pad.buttons[1].id)?.slot, 11);
  for (const slot of [-1, 12, 0.5]) assert.throws(() => placeButton(pad, { ...draft, slot }, 11));
});

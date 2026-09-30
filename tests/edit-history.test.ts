import test from 'node:test';
import assert from 'node:assert/strict';
import { EditHistory } from '../electron/edit-history.js';
import { makeDefaultState } from '../shared/model.js';

test('pad history restores edits without rolling back settings, revisions, or valid activation', () => {
  const history = new EditHistory();
  const before = makeDefaultState();
  const edited = structuredClone(before);
  edited.pads[0].buttons.splice(0, 1);
  history.record(before, edited);
  edited.revision = 12;
  edited.settings.theme = 'dark';
  edited.activePadId = 'focus';
  const restored = history.restore(edited);
  assert.deepEqual(restored.pads, before.pads);
  assert.equal(restored.settings.theme, 'dark');
  assert.equal(restored.activePadId, 'focus');
  assert.equal(restored.revision, 12);
  // Merely preparing an undo must not discard retry history on a failed write.
  assert.deepEqual(history.restore(edited), restored);
  history.consume();
  assert.equal(history.canUndo, false);
  assert.throws(() => history.restore(edited), /No pad edits/);
});

test('preferences and activation alone do not consume history', () => {
  const history = new EditHistory();
  const before = makeDefaultState();
  const next = structuredClone(before);
  next.settings.theme = 'dark';
  next.activePadId = 'focus';
  next.revision++;
  history.record(before, next);
  assert.equal(history.canUndo, false);
});

test('undoing an activated pad creation falls back to the prior valid active pad', () => {
  const history = new EditHistory();
  const before = makeDefaultState();
  const next = structuredClone(before);
  next.pads.push({ ...structuredClone(next.pads[0]), id: 'new' });
  history.record(before, next);
  next.activePadId = 'new';
  assert.equal(history.restore(next).activePadId, before.activePadId);
});

test('history isolates saved data and retains only the newest twenty edits', () => {
  const history = new EditHistory();
  let current = makeDefaultState();
  for (let i = 1; i <= 25; i++) {
    const next = structuredClone(current);
    next.pads[0].name = `Edit ${i}`;
    history.record(current, next);
    current.pads[0].name = 'Mutated input';
    current = next;
  }
  for (let i = 24; i >= 5; i--) {
    current = history.restore(current);
    assert.equal(current.pads[0].name, `Edit ${i}`);
    history.consume();
  }
  assert.equal(history.canUndo, false);
  assert.equal(new EditHistory().canUndo, false);
});

test('image memory budget evicts oldest entries and cannot skip an oversized latest edit', () => {
  const before = makeDefaultState();
  const bytes = new TextEncoder().encode(JSON.stringify(before.pads)).byteLength;
  const history = new EditHistory(20, bytes + 20);
  const changed = structuredClone(before);
  changed.pads[0].name = 'Changed';
  history.record(before, changed);
  history.record(changed, before);
  assert.deepEqual(history.restore(before).pads, changed.pads);
  history.consume();
  assert.equal(history.canUndo, false);
  history.record(before, changed);
  changed.pads[0].buttons[0].image = `data:image/png;base64,${'a'.repeat(bytes)}`;
  history.record(changed, before);
  assert.equal(history.canUndo, false);
});

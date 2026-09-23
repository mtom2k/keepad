import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeDefaultState } from '../shared/model';
import { searchButtons } from '../src/search';

test('search covers every pad, ranks names before descriptions and keeps duplicate names distinct', () => {
  const state = makeDefaultState();
  const base = state.pads[0].buttons[0];
  state.pads[0].buttons = [
    { ...base, id: 'description', label: 'Read', description: 'mail inbox', slot: 0 },
    { ...base, id: 'partial', label: 'Gmail', description: '', slot: 1 },
    { ...base, id: 'prefix', label: 'Mail inbox', description: '', slot: 2 },
  ];
  state.pads[1].buttons = [{ ...base, id: 'exact', label: 'Mail', description: '', slot: 0 }];
  state.pads[2].buttons = [{ ...base, id: 'exact', label: 'Mail', description: '', slot: 0 }];
  const before = structuredClone(state);
  const results = searchButtons(state.pads, 'MAIL');
  assert.deepEqual(
    results.map((r) => r.button.id),
    ['exact', 'exact', 'prefix', 'partial', 'description'],
  );
  assert.notEqual(results[0].pad.id, results[1].pad.id);
  assert.deepEqual(state, before);
});

test('all terms must match names/descriptions; accents and whitespace normalize; targets stay private', () => {
  const state = makeDefaultState();
  const base = state.pads[0].buttons[0];
  state.pads = [
    {
      ...state.pads[0],
      buttons: [
        {
          ...base,
          id: 'cafe',
          label: 'Café Notes',
          description: 'Weekly planning',
          target: 'https://private.example/secret',
        },
      ],
    },
  ];
  assert.equal(searchButtons(state.pads, '  CAFE   weekly ').length, 1);
  for (const query of ['', '   ', 'cafe missing', 'secret', 'private.example', state.pads[0].name])
    assert.deepEqual(searchButtons(state.pads, query), []);
});

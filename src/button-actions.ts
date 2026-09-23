import type { Pad, State } from '../shared/model';
export function emptySlot(pad: Pad): number | undefined {
  return Array.from({ length: pad.columns * pad.rows }, (_, slot) => slot).find(
    (slot) => !pad.buttons.some((button) => button.slot === slot),
  );
}
export function copyOrMoveButton(
  state: State,
  fromId: string,
  buttonId: string,
  toId: string,
  copy: boolean,
  newId: string,
): State {
  const from = state.pads.find((pad) => pad.id === fromId);
  const to = state.pads.find((pad) => pad.id === toId);
  const button = from?.buttons.find((item) => item.id === buttonId);
  if (!from || !to || !button) throw Error('This button or pad no longer exists.');
  if (!copy && fromId === toId) return state;
  const slot = emptySlot(to);
  if (slot === undefined) throw Error('That pad has no empty positions.');
  const id = copy || to.buttons.some((item) => item.id === button.id) ? newId : button.id;
  return {
    ...state,
    pads: state.pads.map((pad) => ({
      ...pad,
      buttons: [
        ...pad.buttons.filter((item) => copy || pad.id !== fromId || item.id !== buttonId),
        ...(pad.id === toId ? [{ ...button, id, slot }] : []),
      ],
    })),
  };
}

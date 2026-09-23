import type { MacroButton, Pad } from '../shared/model';

/** Place a draft or existing button, preserving any displaced action at its origin. */
export function placeButton(pad: Pad, button: MacroButton, origin: number): Pad {
  const capacity = pad.columns * pad.rows;
  if (
    ![origin, button.slot].every((slot) => Number.isInteger(slot) && slot >= 0 && slot < capacity)
  )
    throw new Error('This position is outside the pad.');
  const occupant = pad.buttons.find((item) => item.slot === button.slot && item.id !== button.id);
  return {
    ...pad,
    buttons: [
      ...pad.buttons
        .filter((item) => item.id !== button.id)
        .map((item) => (item.id === occupant?.id ? { ...item, slot: origin } : item)),
      button,
    ],
  };
}

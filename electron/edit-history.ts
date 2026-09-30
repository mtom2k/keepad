import type { State } from '../shared/model.js';

// Session-only pad history. Serialized snapshots isolate entries from later edits and bound
// retained image data. Settings and ordinary activation changes are deliberately not history.
export class EditHistory {
  private entries: { pads: string; activePadId: string; bytes: number }[] = [];
  private bytes = 0;
  constructor(
    private limit = 20,
    private byteLimit = 32 * 1024 * 1024,
  ) {}

  get canUndo() {
    return this.entries.length > 0;
  }

  record(previous: State, next: State) {
    const pads = JSON.stringify(previous.pads);
    if (pads === JSON.stringify(next.pads)) return;
    const bytes = new TextEncoder().encode(pads).byteLength;
    // If the newest edit cannot be retained, don't allow undo to skip over it.
    if (bytes > this.byteLimit) {
      this.entries = [];
      this.bytes = 0;
      return;
    }
    this.entries.push({ pads, activePadId: previous.activePadId, bytes });
    this.bytes += bytes;
    while (this.entries.length > this.limit || this.bytes > this.byteLimit)
      this.bytes -= this.entries.shift()!.bytes;
  }

  restore(current: State): State {
    const entry = this.entries.at(-1);
    if (!entry) throw Error('No pad edits to undo.');
    const pads: State['pads'] = JSON.parse(entry.pads);
    return {
      ...current,
      pads,
      activePadId: pads.some((p) => p.id === current.activePadId)
        ? current.activePadId
        : entry.activePadId,
    };
  }

  // Consume only after the atomic write succeeds; a failed undo can be retried.
  consume() {
    const entry = this.entries.pop();
    if (entry) this.bytes -= entry.bytes;
  }
}

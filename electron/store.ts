import { readFile, writeFile, rename, mkdir, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { StateSchema, type State } from '../shared/model.js';

// Read-only compatibility with the retired device envelope. No external folder is accessed.
const LegacyDestinations = z.object({
  version: z.literal(1),
  targets: z
    .array(
      z.object({
        padId: z.string().min(1).max(80),
        buttonId: z.string().min(1).max(80),
        type: z.enum(['file', 'folder', 'app']),
        original: z.string().max(20000),
        target: z.string().min(1).max(20000),
      }),
    )
    .max(600),
});

// Windows refuses to replace a file that antivirus, indexing, or backup software briefly holds
// open. Retry those transient errors; anything else, or a lasting lock, still fails the save.
export async function replaceFile(
  from: string,
  to: string,
  move: (from: string, to: string) => Promise<void> = rename,
  delays = [20, 40, 80, 160, 320, 640],
) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await move(from, to);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (attempt >= delays.length || !['EPERM', 'EACCES', 'EBUSY'].includes(code ?? ''))
        throw error;
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}
export class Store {
  state: State;
  warning: string | undefined;
  constructor(
    readonly file: string,
    defaults: State,
  ) {
    this.state = defaults;
  }
  private async backup(kind: string) {
    const backup = `${this.file}.${kind}-${Date.now()}-${randomUUID()}`;
    await copyFile(this.file, backup, constants.COPYFILE_EXCL);
    return backup;
  }
  async load() {
    await mkdir(path.dirname(this.file), { recursive: true });
    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(this.file, 'utf8'));
      this.state = StateSchema.parse(raw);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        const backup = await this.backup('recovery');
        this.warning = `Your previous settings could not be read. A recovery copy was saved to ${backup}. Starter pads have been loaded.`;
      }
      await this.write(this.state);
      return this.state;
    }
    // Migration failures must never enter corrupt-file recovery and replace valid pads.
    if (raw && typeof raw === 'object' && 'device' in raw) {
      const backup = await this.backup('before-local');
      const legacy = LegacyDestinations.safeParse(raw.device);
      if (!legacy.success)
        throw Error(
          `KeePad could not safely convert the previous device destinations. Your original settings are unchanged; a recovery copy is at ${backup}.`,
        );
      const next = StateSchema.parse({
        ...this.state,
        revision: this.state.revision + 1,
        pads: this.state.pads.map((p) => ({
          ...p,
          buttons: p.buttons.map((b) => {
            const override = legacy.data.targets.find(
              (t) =>
                t.padId === p.id &&
                t.buttonId === b.id &&
                t.type === b.type &&
                t.original === b.target,
            );
            return override ? { ...b, target: override.target } : b;
          }),
        })),
      });
      await this.write(next);
      this.warning = `KeePad now stores everything locally. Your pads and device destinations were kept. Previous settings were backed up to ${backup}. Former sync folders were left untouched.`;
    }
    return this.state;
  }
  async write(next: State) {
    const valid = StateSchema.parse(next);
    const temp = `${this.file}.tmp`;
    await writeFile(temp, JSON.stringify(valid, null, 2), { mode: 0o600 });
    await replaceFile(temp, this.file);
    this.state = valid;
  }
}

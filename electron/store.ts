import { readFile, writeFile, rename, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { StateSchema, type State } from '../shared/model.js';
export class Store {
  state: State;
  warning: string | undefined;
  constructor(
    readonly file: string,
    defaults: State,
  ) {
    this.state = defaults;
  }
  async load() {
    await mkdir(path.dirname(this.file), { recursive: true });
    try {
      this.state = StateSchema.parse(JSON.parse(await readFile(this.file, 'utf8')));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        const backup = `${this.file}.recovery-${Date.now()}`;
        // Never overwrite unreadable data unless a recovery copy exists.
        await copyFile(this.file, backup);
        this.warning = `Your previous settings could not be read. A recovery copy was saved to ${backup}. Starter pads have been loaded.`;
      }
      await this.write(this.state);
    }
    return this.state;
  }
  async write(next: State) {
    const valid = StateSchema.parse(next);
    const temp = `${this.file}.tmp`;
    await writeFile(temp, JSON.stringify(valid, null, 2), { mode: 0o600 });
    await rename(temp, this.file);
    this.state = valid;
  }
}

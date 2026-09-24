import { readFile, writeFile, rename, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DeviceSchema, type Device } from '../shared/sync.js';
import { StateSchema, type State } from '../shared/model.js';
export class Store {
  state: State;
  warning: string | undefined;
  device: Device = { version: 1, id: randomUUID(), heads: [], pending: [], targets: [] };
  constructor(
    readonly file: string,
    defaults: State,
  ) {
    this.state = defaults;
  }
  async load() {
    await mkdir(path.dirname(this.file), { recursive: true });
    try {
      const raw = JSON.parse(await readFile(this.file, 'utf8'));
      this.state = StateSchema.parse(raw);
      if (raw.device !== undefined) {
        const device = DeviceSchema.safeParse(raw.device);
        if (device.success) this.device = device.data;
        else {
          await copyFile(this.file, `${this.file}.recovery-${Date.now()}`);
          this.warning =
            'Sync settings were invalid. A recovery copy was saved; your local pads were kept and synchronization was disconnected.';
        }
      }
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
  async write(next: State, device: Device = this.device) {
    const local = DeviceSchema.parse(device);
    const valid = StateSchema.parse(next);
    const temp = `${this.file}.tmp`;
    await writeFile(temp, JSON.stringify({ ...valid, device: local }, null, 2), { mode: 0o600 });
    await rename(temp, this.file);
    this.state = valid;
    this.device = local;
  }
}

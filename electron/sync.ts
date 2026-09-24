import { createHash, randomUUID } from 'node:crypto';
import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  lstat,
  stat,
  rename,
  copyFile,
} from 'node:fs/promises';
import path from 'node:path';
import {
  ChangeSchema,
  type Change,
  type Device,
  type SyncStatus,
  TargetUpdateSchema,
  type TargetUpdate,
} from '../shared/sync.js';
import { StateSchema, type State, type Pad, type MacroButton } from '../shared/model.js';
import { Store } from './store.js';

const directory = 'keepad-library';
const marker = '{"format":"keepad-library","version":1}';
const maxRecord = 32 * 1024 * 1024;
const maxBytes = 512 * 1024 * 1024;
const maxRecords = 2000;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = (error: unknown) =>
  error instanceof Error
    ? error.name === 'ZodError'
      ? 'A library change is invalid or uses an unsupported format. Local pads were kept.'
      : error.message
    : String(error);
export function nativePath(value: string, platform = process.platform): boolean {
  return (
    !value.includes('\0') &&
    (platform === 'win32'
      ? /^(?:[a-z]:[\\/]|\\\\[^\\]+\\[^\\]+)/i.test(value)
      : value.startsWith('/'))
  );
}
export function destination(
  device: Device,
  padId: string,
  button: MacroButton,
  platform = process.platform,
): string {
  const target =
    device.targets.find(
      (t) =>
        t.padId === padId &&
        t.buttonId === button.id &&
        t.type === button.type &&
        t.original === button.target,
    )?.target ?? button.target;
  if (!nativePath(target, platform))
    throw Error('Choose a destination for this computer in Edit button → This device.');
  return target;
}
export function makeChange(
  device: Device,
  padId: string,
  pad: Pad | null,
  order: number,
  parents: string[],
  platform: 'darwin' | 'win32' | 'linux',
): Change {
  const body = {
    format: 1 as const,
    nonce: randomUUID(),
    device: device.id,
    platform,
    created: new Date().toISOString(),
    padId,
    order,
    parents: [...parents].sort(),
    pad,
  };
  return ChangeSchema.parse({ id: digest(body), body });
}
export function headsOf(changes: Change[]): Map<string, Change[]> {
  const byId = new Map(changes.map((c) => [c.id, c]));
  const referenced = new Set<string>();
  for (const change of byId.values())
    for (const parent of change.body.parents) {
      const ancestor = byId.get(parent);
      if (!ancestor || ancestor.body.padId !== change.body.padId || parent === change.id)
        throw Error(
          'Waiting for complete library history. Check the folder sync application; no local pads were replaced.',
        );
      referenced.add(parent);
    }
  const heads = new Map<string, Change[]>();
  for (const change of byId.values())
    if (!referenced.has(change.id)) {
      const group = heads.get(change.body.padId) ?? [];
      group.push(change);
      heads.set(change.body.padId, group);
    }
  for (const group of heads.values())
    group.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return heads;
}
async function readLibrary(folder: string): Promise<Change[] | null> {
  const root = path.join(folder, directory);
  try {
    if (!(await lstat(root)).isDirectory())
      throw Error('The KeePad library must be a regular folder.');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
  const signature = path.join(root, 'format.json');
  if (!(await lstat(signature)).isFile() || (await lstat(signature)).size > 1024)
    throw Error('Invalid KeePad library marker.');
  const format = JSON.parse(
    await readFile(signature, { encoding: 'utf8', signal: AbortSignal.timeout(5000) }),
  );
  if (format.format !== 'keepad-library' || format.version !== 1)
    throw Error('This library format is not supported by this KeePad version.');
  const records = path.join(root, 'changes');
  if (!(await lstat(records)).isDirectory())
    throw Error('The library changes folder is unavailable.');
  const files = (await readdir(records)).filter((name) => name.endsWith('.json')).sort();
  if (files.length > maxRecords)
    throw Error('Library history limit reached. Export a backup and start a new library folder.');
  let bytes = 0;
  const unique = new Map<string, Change>();
  for (const name of files) {
    const file = path.join(records, name),
      metadata = await lstat(file);
    bytes += metadata.size;
    if (!metadata.isFile() || metadata.size > maxRecord || bytes > maxBytes)
      throw Error(
        'Library history is too large or contains an unsupported file. Local pads were kept.',
      );
    const change = ChangeSchema.parse(
      JSON.parse(await readFile(file, { encoding: 'utf8', signal: AbortSignal.timeout(5000) })),
    );
    if (digest(change.body) !== change.id)
      throw Error(
        'A library change failed its integrity check. Restore it using your folder provider’s version history.',
      );
    unique.set(change.id, change);
  }
  return [...unique.values()];
}
async function publish(folder: string, change: Change) {
  const root = path.join(folder, directory, 'changes');
  const file = path.join(root, `${change.id}.json`),
    contents = JSON.stringify(change);
  try {
    const existing = await readFile(file, { encoding: 'utf8', signal: AbortSignal.timeout(5000) });
    if (!same(ChangeSchema.parse(JSON.parse(existing)), change))
      throw Error('A library change was unexpectedly overwritten.');
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const temp = path.join(root, `${change.id}-${randomUUID()}.tmp`);
  await writeFile(temp, contents, { flag: 'wx', mode: 0o600 });
  await rename(temp, file);
}
function materialize(heads: Map<string, Change[]>, state: State): State {
  const pads = [...heads.values()]
    .map((group) => group.find((change) => change.body.pad !== null) ?? group[0])
    .filter((c) => c.body.pad !== null)
    .sort(
      (a, b) =>
        a.body.order - b.body.order ||
        (a.body.padId < b.body.padId ? -1 : a.body.padId > b.body.padId ? 1 : 0),
    )
    .map((c) => c.body.pad!);
  if (!pads.length)
    throw Error(
      'The shared library has no pads. Your local copy was kept; create a new pad to resume synchronization.',
    );
  if (pads.length > 30)
    throw Error(
      'The combined library exceeds 30 pads. Remove unneeded pads on a connected device to resume.',
    );
  return StateSchema.parse({
    ...state,
    pads,
    activePadId: pads.some((p) => p.id === state.activePadId) ? state.activePadId : pads[0].id,
  });
}

/** All methods run inside main's serialized mutation queue. Local state + outbox commit together. */
export class SyncEngine {
  private heads = new Map<string, Change[]>();
  private error: string | undefined;
  private checked: string | undefined;
  constructor(
    readonly store: Store,
    readonly platform: 'darwin' | 'win32' | 'linux' = process.platform as
      'darwin' | 'win32' | 'linux',
  ) {}
  status(): SyncStatus {
    return {
      folder: this.store.device.folder,
      pending: this.store.device.pending.length,
      error: this.error,
      checked: this.checked,
      conflicts: [...this.heads.entries()]
        .filter(([, group]) => group.length > 1)
        .map(([padId, group]) => ({
          padId,
          versions: group.map((c) => ({
            id: c.id,
            name: c.body.pad?.name ?? 'Deleted pad',
            deleted: c.body.pad === null,
            buttons: c.body.pad?.buttons.length ?? 0,
            platform: c.body.platform,
            created: c.body.created,
          })),
        })),
    };
  }
  async inspect(folder: string) {
    if (!nativePath(folder) || !(await stat(folder)).isDirectory())
      throw Error('Choose an existing local folder.');
    const changes = await readLibrary(folder);
    if (changes && !changes.length)
      throw Error(
        'This library has not arrived completely. Wait for your folder provider to finish syncing.',
      );
    const heads = changes ? headsOf(changes) : new Map<string, Change[]>();
    const pads = changes
      ? materialize(heads, this.store.state).pads.length
      : this.store.state.pads.length;
    return {
      existing: changes !== null,
      pads,
      fingerprint: digest(changes?.map((c) => c.id).sort() ?? null),
    };
  }
  async backup() {
    await copyFile(
      this.store.file,
      `${this.store.file}.before-sync-${Date.now()}-${randomUUID()}.json`,
    );
  }
  async connect(folder: string, fingerprint: string) {
    if (this.store.device.folder)
      throw Error('Disconnect the current library before choosing another folder.');
    if ((await this.inspect(folder)).fingerprint !== fingerprint)
      throw Error('The library changed. Choose the folder again to review it.');
    await this.backup();
    let changes = await readLibrary(folder);
    let device: Device = { ...this.store.device, folder, heads: [], pending: [] };
    let next = this.store.state;
    if (changes) {
      this.heads = headsOf(changes);
      next = materialize(this.heads, next);
      device.heads = [...this.heads].map(([padId, group]) => ({
        padId,
        ids: group.map((c) => c.id),
      }));
    } else {
      const root = path.join(folder, directory);
      await mkdir(root);
      await mkdir(path.join(root, 'changes'));
      await writeFile(path.join(root, 'format.json'), marker, { flag: 'wx', mode: 0o600 });
      device.pending = next.pads.map((pad, order) =>
        makeChange(device, pad.id, pad, order, [], this.platform),
      );
      device.heads = device.pending.map((c) => ({ padId: c.body.padId, ids: [c.id] }));
    }
    await this.store.write({ ...next, revision: this.store.state.revision + 1 }, device);
    await this.tick();
  }
  async disconnect() {
    await this.backup();
    await this.store.write(
      { ...this.store.state, revision: this.store.state.revision + 1 },
      { ...this.store.device, folder: undefined, heads: [], pending: [] },
    );
    this.heads.clear();
    this.error = undefined;
    this.checked = undefined;
  }
  async save(next: State, target?: TargetUpdate) {
    let device = structuredClone(this.store.device);
    if (target !== undefined) {
      target = TargetUpdateSchema.parse(target);
      const button = next.pads
        .find((p) => p.id === target!.padId)
        ?.buttons.find((b) => b.id === target!.buttonId);
      if (!button || !['file', 'folder', 'app'].includes(button.type))
        throw Error('Device destinations require a file, folder, or application button.');
      if (target.target !== null && !nativePath(target.target, this.platform))
        throw Error('Choose an absolute path on this computer.');
      device.targets = device.targets.filter(
        (t) => t.padId !== target!.padId || t.buttonId !== target!.buttonId,
      );
      if (target.target !== null)
        device.targets.push({
          padId: target.padId,
          buttonId: target.buttonId,
          type: button.type as 'file' | 'folder' | 'app',
          original: button.target,
          target: target.target,
        });
    }
    device.targets = device.targets.filter((t) =>
      next.pads.some(
        (p) =>
          p.id === t.padId &&
          p.buttons.some(
            (b) => b.id === t.buttonId && b.type === t.type && b.target === t.original,
          ),
      ),
    );
    if (device.folder) {
      const ids = new Set([...this.store.state.pads, ...next.pads].map((p) => p.id));
      for (const padId of ids) {
        const before = this.store.state.pads.find((p) => p.id === padId),
          after = next.pads.find((p) => p.id === padId);
        if (same(before, after)) continue;
        if ((device.heads.find((h) => h.padId === padId)?.ids.length ?? 0) > 1)
          throw Error(
            'Resolve this pad’s conflicting versions in Settings → Synchronization before editing it.',
          );
        const change = makeChange(
          device,
          padId,
          after ?? null,
          Math.max(
            0,
            next.pads.findIndex((p) => p.id === padId),
          ),
          device.heads.find((h) => h.padId === padId)?.ids ?? [],
          this.platform,
        );
        device.pending.push(change);
        device.heads = [
          ...device.heads.filter((h) => h.padId !== padId),
          { padId, ids: [change.id] },
        ];
      }
    }
    await this.store.write(next, device);
  }
  async tick() {
    const device = this.store.device;
    if (!device.folder) return;
    try {
      if (!nativePath(device.folder)) throw Error('Choose a library folder on this computer.');
      if (device.pending.some((change) => digest(change.body) !== change.id))
        throw Error(
          'A pending local change failed its integrity check. Keep the local recovery copy and reconnect using a fresh library folder.',
        );
      const remote = await readLibrary(device.folder);
      if (!remote)
        throw Error(
          'The library folder is unavailable. Your local changes are kept and will retry automatically.',
        );
      const changes = [...new Map([...remote, ...device.pending].map((c) => [c.id, c])).values()];
      if (
        changes.length > maxRecords ||
        changes.reduce((n, c) => n + Buffer.byteLength(JSON.stringify(c)), 0) > maxBytes
      )
        throw Error(
          'Library history limit reached. Export a backup and start a new library folder.',
        );
      const ids = new Set(changes.map((c) => c.id));
      if (device.heads.some((h) => h.ids.some((id) => !ids.has(id))))
        throw Error('Waiting for missing library changes. No local pads were replaced.');
      const heads = headsOf(changes);
      const next = materialize(heads, this.store.state);
      for (const change of device.pending) await publish(device.folder, change);
      const local = {
        ...device,
        pending: [],
        heads: [...heads].map(([padId, group]) => ({ padId, ids: group.map((c) => c.id) })),
      };
      const changed =
        !same(next.pads, this.store.state.pads) ||
        next.activePadId !== this.store.state.activePadId;
      if (changed || !same(local, device))
        await this.store.write(
          { ...next, revision: this.store.state.revision + (changed ? 1 : 0) },
          local,
        );
      this.heads = heads;
      this.error = undefined;
      this.checked = new Date().toISOString();
    } catch (error) {
      this.error = `Synchronization paused: ${fail(error)}`;
    }
  }
  preview(padId: string, versionId: string): Pad | null {
    const version = this.heads.get(padId)?.find((c) => c.id === versionId);
    if (!version) throw Error('This version changed. Refresh the library before reviewing it.');
    return version.body.pad;
  }
  async resolve(padId: string, expected: string[], choice: string) {
    await this.tick();
    if (this.error) throw Error(this.error);
    const group = this.heads.get(padId);
    if (!group || group.length < 2 || !same(group.map((c) => c.id).sort(), [...expected].sort()))
      throw Error('These versions changed. Review the latest conflict and try again.');
    const chosen =
      choice === 'both' ? group.filter((c) => c.body.pad) : group.filter((c) => c.id === choice);
    if (!chosen.length) throw Error('Choose a saved version.');
    const device = structuredClone(this.store.device);
    const first = chosen[0];
    const resolution = makeChange(
      device,
      padId,
      first.body.pad,
      first.body.order,
      expected,
      this.platform,
    );
    device.pending.push(resolution);
    device.heads = [
      ...device.heads.filter((h) => h.padId !== padId),
      { padId, ids: [resolution.id] },
    ];
    let pads = this.store.state.pads.filter((p) => p.id !== padId);
    if (first.body.pad) pads.push(first.body.pad);
    for (const version of chosen.slice(1)) {
      const pad = {
        ...version.body.pad!,
        id: randomUUID(),
        name: `${version.body.pad!.name.slice(0, 25)} (copy)`,
      };
      pads.push(pad);
      const change = makeChange(
        device,
        pad.id,
        pad,
        Math.min(pads.length - 1, 30),
        [],
        this.platform,
      );
      device.pending.push(change);
      device.heads.push({ padId: pad.id, ids: [change.id] });
    }
    const next = StateSchema.parse({
      ...this.store.state,
      pads,
      activePadId: pads.some((p) => p.id === this.store.state.activePadId)
        ? this.store.state.activePadId
        : pads[0]?.id,
      revision: this.store.state.revision + 1,
    });
    await this.store.write(next, device);
    await this.tick();
  }
}

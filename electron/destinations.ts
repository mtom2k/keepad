import { stat, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import type { State } from '../shared/model.js';
import type { DestinationReport, DestinationStatus, PathAction } from '../shared/destinations.js';
import { nativePath } from './paths.js';

type Probe = (
  target: string,
  type: PathAction,
  platform: NodeJS.Platform,
) => Promise<DestinationStatus>;
async function probePath(
  target: string,
  type: PathAction,
  platform: NodeJS.Platform,
): Promise<DestinationStatus> {
  const details = await stat(target);
  const matches =
    type === 'folder'
      ? details.isDirectory()
      : type === 'file'
        ? details.isFile()
        : platform === 'darwin'
          ? details.isDirectory() && /\.app\/?$/i.test(target)
          : platform === 'win32'
            ? details.isFile() && /\.(exe|lnk)$/i.test(target)
            : details.isFile();
  if (!matches) return 'wrong-type';
  await access(
    target,
    constants.R_OK | (details.isDirectory() && platform !== 'win32' ? constants.X_OK : 0),
  );
  return 'available';
}

// Keep timed-out native calls counted until they actually settle. The factory lets
// tests exercise blocked filesystem calls without touching a real network mount.
export function createDestinationInspector(probe: Probe = probePath, waitMs = 2500) {
  const pending = new Map<string, Promise<DestinationStatus>>();
  return async (
    target: string,
    type: PathAction,
    platform = process.platform,
  ): Promise<DestinationStatus> => {
    if (!nativePath(target, platform)) return 'foreign';
    const key = JSON.stringify([target, type, platform]);
    let work = pending.get(key);
    if (!work) {
      if (pending.size >= 4) return 'not-checked';
      work = Promise.resolve()
        .then(() => probe(target, type, platform))
        .catch((error): DestinationStatus => {
          const code = (error as NodeJS.ErrnoException).code;
          return code === 'ENOENT' || code === 'ENOTDIR'
            ? 'missing'
            : code === 'EACCES' || code === 'EPERM'
              ? 'denied'
              : 'unavailable';
        });
      pending.set(key, work);
      void work.finally(() => pending.delete(key));
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        work,
        new Promise<DestinationStatus>((resolve) => {
          timer = setTimeout(() => resolve('unavailable'), waitMs);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  };
}
export const inspectDestination = createDestinationInspector();

export async function checkDestinations(state: State): Promise<DestinationReport> {
  const entries = state.pads.flatMap((pad) =>
    pad.buttons.flatMap((button) => {
      if (!['file', 'folder', 'app'].includes(button.type)) return [];
      return [
        {
          padId: pad.id,
          buttonId: button.id,
          padName: pad.name,
          buttonName: button.label,
          type: button.type as PathAction,
          target: button.target,
        },
      ];
    }),
  );
  const results: DestinationStatus[] = [];
  let index = 0;
  const deadline = Date.now() + 10000;
  await Promise.all(
    Array.from({ length: Math.min(4, entries.length) }, async () => {
      while (index < entries.length) {
        const at = index++,
          entry = entries[at];
        results[at] =
          Date.now() >= deadline
            ? 'not-checked'
            : await inspectDestination(entry.target, entry.type);
      }
    }),
  );
  return {
    revision: state.revision,
    total: entries.length,
    available: results.filter((status) => status === 'available').length,
    issues: entries.flatMap((entry, i) =>
      results[i] === 'available'
        ? []
        : [{ ...entry, status: results[i] as Exclude<DestinationStatus, 'available'> }],
    ),
  };
}

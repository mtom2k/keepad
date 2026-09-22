import {
  makeDefaultState,
  StateSchema,
  type KeePadAPI,
  type Result,
  type Snapshot,
} from '../shared/model';
declare global {
  interface Window {
    keepad?: KeePadAPI;
  }
}
const key = 'keepad-browser-preview-v1';
const info = {
  platform: navigator.platform.includes('Mac') ? 'darwin' : 'win32',
  version: '0.1.0',
  shortcutRegistered: false,
  desktop: false,
  packaged: false,
};
function read() {
  try {
    return StateSchema.parse(JSON.parse(localStorage.getItem(key) || 'null'));
  } catch {
    return makeDefaultState();
  }
}
const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const unavailable = async (): Promise<Result<never>> => ({
  ok: false,
  error: 'This action is available in the KeePad desktop app. Run npm run dev to try it.',
});
const launcherPadId = new URLSearchParams(location.search).get('pad') ?? undefined;
const preview: KeePadAPI = {
  load: async () => ok({ state: read(), info, launcherPadId }),
  save: async (state) => {
    try {
      const current = read();
      if (current.revision !== state.revision)
        throw Error('Your pads changed. Reload and try again.');
      const next = StateSchema.parse({ ...state, revision: state.revision + 1 });
      localStorage.setItem(key, JSON.stringify(next));
      return ok({ state: next, info, launcherPadId });
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
  run: async (p, b) => {
    const button = read()
      .pads.find((pad) => pad.id === p)
      ?.buttons.find((btn) => btn.id === b);
    if (button?.type === 'text') {
      await navigator.clipboard.writeText(button.target);
      return ok('Copied to clipboard');
    }
    return unavailable();
  },
  pickPath: unavailable,
  pickImage: unavailable,
  showEditor: async (page) => {
    location.href = `/?mode=editor#${page || 'pads'}`;
    return ok(undefined);
  },
  showLauncher: async (padId) => {
    location.href = `/?mode=launcher${padId ? `&pad=${encodeURIComponent(padId)}` : ''}`;
    return ok(undefined);
  },
  hide: unavailable,
  exportPads: unavailable,
  importPads: unavailable,
  onLauncherShown: (callback) => {
    window.addEventListener('focus', callback);
    return () => window.removeEventListener('focus', callback);
  },
  onChange: (callback) => {
    const listener = () => callback({ state: read(), info, launcherPadId });
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  },
};
export const api = window.keepad ?? preview;
export async function unwrap<T>(promise: Promise<Result<T>>): Promise<T> {
  const result = await promise;
  if (!result.ok) throw Error(result.error);
  return result.value;
}
export type { Snapshot };

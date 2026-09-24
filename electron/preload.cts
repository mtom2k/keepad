import { contextBridge, ipcRenderer, webUtils } from 'electron';
const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld('keepad', {
  load: () => invoke('state:load'),
  save: (s: unknown, target?: unknown) => invoke('state:save', s, target),
  chooseSyncFolder: () => invoke('sync:choose'),
  connectSync: (token: string) => invoke('sync:connect', token),
  disconnectSync: () => invoke('sync:disconnect'),
  refreshSync: () => invoke('sync:refresh'),
  previewSync: (padId: string, versionId: string) => invoke('sync:preview', padId, versionId),
  resolveSync: (padId: string, heads: string[], choice: string) =>
    invoke('sync:resolve', padId, heads, choice),
  run: (p: string, b: string) => invoke('action:run', p, b),
  pickPath: (t: string) => invoke('dialog:path', t),
  pickImage: () => invoke('dialog:image'),
  describeFile: async (file: File) => {
    try {
      return await invoke('file:describe', webUtils.getPathForFile(file));
    } catch {
      return { ok: false, error: 'Drop a file from Finder or File Explorer.' };
    }
  },
  editButton: (padId: string, buttonId: string) => invoke('window:edit-button', padId, buttonId),
  showEditor: (p?: string) => invoke('window:editor', p),
  showLauncher: (padId?: string) => invoke('window:launcher', padId),
  hide: () => invoke('window:hide'),
  exportPads: () => invoke('data:export'),
  importPads: () => invoke('data:import'),
  onLauncherShown: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('launcher:shown', listener);
    return () => ipcRenderer.removeListener('launcher:shown', listener);
  },
  onChange: (callback: (s: unknown) => void) => {
    const listener = (_event: unknown, s: unknown) => callback(s);
    ipcRenderer.on('state:changed', listener);
    return () => ipcRenderer.removeListener('state:changed', listener);
  },
});

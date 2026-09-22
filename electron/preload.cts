import { contextBridge, ipcRenderer } from 'electron';
const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld('keepad', {
  load: () => invoke('state:load'),
  save: (s: unknown) => invoke('state:save', s),
  run: (p: string, b: string) => invoke('action:run', p, b),
  pickPath: (t: string) => invoke('dialog:path', t),
  pickImage: () => invoke('dialog:image'),
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

import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  globalShortcut,
  ipcMain,
  dialog,
  shell,
  clipboard,
  nativeImage,
  screen,
} from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import {
  StateSchema,
  makeDefaultState,
  mergeImported,
  type State,
  type Snapshot,
} from '../shared/model.js';
import { Store } from './store.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const devUrl = app.isPackaged ? undefined : process.env.KEEPAD_DEV_URL;
if (devUrl && devUrl !== 'http://127.0.0.1:5173') throw Error('Unexpected development server.');
if (process.env.KEEPAD_TEST_DATA && !app.isPackaged)
  app.setPath('userData', process.env.KEEPAD_TEST_DATA);
app.setName('KeePad');
let tray: Tray,
  launcher: BrowserWindow | undefined,
  editor: BrowserWindow | undefined,
  quitting = false,
  shortcutRegistered = false;
let store: Store;
// Preview selection is transient; tray/hotkey invocation always uses the active pad.
let previewPadId: string | undefined;
let mutation: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const result = mutation.then(fn);
  mutation = result.catch(() => {});
  return result;
}
const snapshot = (): Snapshot => ({
  state: store.state,
  launcherPadId: previewPadId ?? store.state.activePadId,
  info: {
    platform: process.platform,
    version: app.getVersion(),
    shortcutRegistered,
    storageWarning: store.warning,
    desktop: true,
    packaged: app.isPackaged,
  },
});
function broadcast() {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('state:changed', snapshot());
}
function windowFor(mode: 'launcher' | 'editor') {
  const win = new BrowserWindow({
    width: mode === 'launcher' ? 550 : 980,
    height: mode === 'launcher' ? 560 : 720,
    minWidth: mode === 'launcher' ? 460 : 820,
    minHeight: mode === 'launcher' ? 400 : 600,
    show: false,
    frame: mode === 'editor',
    resizable: mode === 'editor',
    skipTaskbar: true,
    alwaysOnTop: mode === 'launcher',
    backgroundColor: '#f4f4f4',
    title: 'KeePad',
    webPreferences: {
      preload: path.join(root, 'dist-electron/electron/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.on('close', (e) => {
    if (!quitting) {
      e.preventDefault();
      win.hide();
    }
  });
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.key === 'Escape' && mode === 'launcher') win.hide();
  });
  if (mode === 'launcher') {
    win.on('show', () => win.webContents.send('launcher:shown'));
    win.on('focus', () => win.webContents.send('launcher:shown'));
    win.on('blur', () => {
      if (!process.env.KEEPAD_TEST_DATA && store.state.settings.hideAfterAction) win.hide();
    });
  }
  if (devUrl) void win.loadURL(`${devUrl}/?mode=${mode}`);
  else void win.loadFile(path.join(root, 'dist/index.html'), { query: { mode } });
  return win;
}
function showEditor(page = 'pads') {
  if (!editor || editor.isDestroyed()) editor = windowFor('editor');
  const show = () => {
    editor!.show();
    editor!.focus();
    editor!.webContents.send('state:changed', snapshot());
  };
  if (editor.webContents.isLoading()) editor.webContents.once('did-finish-load', show);
  else show();
  // The hash is local navigation only; no remote content is allowed.
  void editor.webContents
    .executeJavaScript(`location.hash=${JSON.stringify(page)}`)
    .catch(() => {});
  launcher?.hide();
}
function showLauncher(padId?: string) {
  if (padId !== undefined && !store.state.pads.some((p) => p.id === padId))
    throw Error('This pad no longer exists.');
  previewPadId = padId;
  broadcast();
  if (!launcher || launcher.isDestroyed()) launcher = windowFor('launcher');
  const pad = store.state.pads.find((p) => p.id === (previewPadId ?? store.state.activePadId))!;
  const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  const width = Math.min(580, area.width - 24),
    height = Math.min(180 + pad.rows * 108, area.height - 24);
  const x = area.x + (area.width - width) / 2,
    y = area.y + (area.height - height) / 2;
  launcher.setBounds({
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  });
  if (launcher.webContents.isLoading())
    launcher.webContents.once('did-finish-load', () => {
      launcher!.show();
      launcher!.focus();
    });
  else {
    launcher.show();
    launcher.focus();
  }
}
function toggleLauncher() {
  if (launcher?.isVisible()) launcher.hide();
  else showLauncher();
}
function registerShortcut(value: string) {
  try {
    return globalShortcut.register(value, () => toggleLauncher());
  } catch {
    return false;
  }
}
async function commit(raw: unknown) {
  const next = StateSchema.parse(raw),
    previous = store.state;
  if (next.revision !== previous.revision)
    throw Error(
      'This pad changed in another window. Your view has been refreshed; please try again.',
    );
  const changed = next.settings.shortcut !== previous.settings.shortcut;
  if (next.settings.launchAtLogin !== previous.settings.launchAtLogin && !app.isPackaged)
    throw Error('Install the packaged KeePad app before enabling launch at login.');
  if (changed && !registerShortcut(next.settings.shortcut))
    throw Error('That shortcut is unavailable or already in use. Try a different combination.');
  const loginChanged = next.settings.launchAtLogin !== previous.settings.launchAtLogin;
  let loginApplied = false;
  try {
    if (loginChanged) {
      app.setLoginItemSettings({ openAtLogin: next.settings.launchAtLogin });
      loginApplied = true;
    }
    await store.write({ ...next, revision: previous.revision + 1 });
  } catch (e) {
    if (changed) globalShortcut.unregister(next.settings.shortcut);
    if (loginApplied) {
      try {
        app.setLoginItemSettings({ openAtLogin: previous.settings.launchAtLogin });
      } catch {
        store.warning =
          'Check Login Items or Startup Apps in system settings; startup preferences could not be restored.';
      }
    }
    throw e;
  }
  if (changed) {
    globalShortcut.unregister(previous.settings.shortcut);
    shortcutRegistered = true;
  }
  if (next.activePadId !== previous.activePadId || !next.pads.some((p) => p.id === previewPadId))
    previewPadId = undefined;
  broadcast();
  return snapshot();
}
function trayMenu() {
  return Menu.buildFromTemplate([
    { label: 'Open KeePad', click: () => showLauncher() },
    { type: 'separator' },
    ...store.state.pads.map((p) => ({
      label: p.name,
      type: 'radio' as const,
      checked: p.id === store.state.activePadId,
      click: () => {
        void serial(async () => {
          await commit({ ...store.state, activePadId: p.id });
          showLauncher();
        }).catch(showError);
      },
    })),
    { type: 'separator' },
    { label: 'Manage pads…', click: () => showEditor() },
    { label: 'Settings…', click: () => showEditor('settings') },
    { label: `Version ${app.getVersion()}`, enabled: false },
    { type: 'separator' },
    { label: 'Quit KeePad', click: () => app.quit() },
  ]);
}
function showError(error: unknown) {
  dialog.showErrorBox(
    'KeePad',
    error instanceof Error ? error.message : 'Something went wrong. Please try again.',
  );
}
function trust(event: IpcMainInvokeEvent) {
  const allowed = BrowserWindow.getAllWindows().some((w) => w.webContents === event.sender);
  const url = event.senderFrame?.url ?? '';
  const expected = devUrl ? `${devUrl}/` : pathToFileURL(path.join(root, 'dist/index.html')).href;
  if (
    !allowed ||
    event.senderFrame !== event.sender.mainFrame ||
    !(url === expected || url.startsWith(`${expected}?`))
  )
    throw Error('Request rejected.');
}
function handle(channel: string, fn: (event: IpcMainInvokeEvent, ...args: any[]) => unknown) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      trust(event);
      return { ok: true, value: await fn(event, ...args) };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete this action.';
      return {
        ok: false,
        error: message.startsWith('[')
          ? 'These settings are invalid. Check names, actions, and button positions.'
          : message,
      };
    }
  });
}
function setupIPC() {
  handle('state:load', () => snapshot());
  handle('state:save', (_e, raw) => serial(() => commit(raw)));
  handle('window:editor', (_e, page) => showEditor(page === 'settings' ? 'settings' : 'pads'));
  handle('window:launcher', (_e, padId) => {
    if (padId !== undefined && typeof padId !== 'string') throw Error('Invalid pad.');
    showLauncher(padId);
  });
  handle('window:hide', (e) => BrowserWindow.fromWebContents(e.sender)?.hide());
  handle('action:run', async (_e, padId, buttonId) => {
    const button = store.state.pads
      .find((p) => p.id === padId)
      ?.buttons.find((b) => b.id === buttonId);
    if (!button) throw Error('This button no longer exists.');
    if (button.type === 'text') await clipboard.writeText(button.target);
    else if (button.type === 'url') await shell.openExternal(button.target);
    else {
      let details;
      try {
        details = await stat(button.target);
      } catch {
        throw Error(
          'This destination is missing or cannot be accessed. Edit the button and choose it again. If macOS asks for access, allow access to that folder in System Settings → Privacy & Security → Files and Folders.',
        );
      }
      if (button.type === 'folder' && !details.isDirectory())
        throw Error('This destination is no longer a folder. Choose it again.');
      const error = await shell.openPath(button.target);
      if (error)
        throw Error(
          `Could not open this destination. Check its permissions and default application. ${error}`,
        );
    }
    if (store.state.settings.hideAfterAction) launcher?.hide();
    return button.type === 'text' ? 'Copied to clipboard' : `Opened ${button.label}`;
  });
  handle('dialog:path', async (e, type) => {
    if (!['file', 'folder', 'app'].includes(type)) throw Error('Unsupported picker.');
    const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender)!, {
      title: `Choose ${type === 'app' ? 'an application' : `a ${type}`}`,
      properties: [type === 'folder' ? 'openDirectory' : 'openFile'],
      ...(type === 'app'
        ? {
            defaultPath: process.platform === 'darwin' ? '/Applications' : process.env.ProgramFiles,
            filters:
              process.platform === 'win32'
                ? [{ name: 'Applications', extensions: ['exe', 'lnk'] }]
                : undefined,
          }
        : {}),
    });
    return result.canceled ? null : result.filePaths[0];
  });
  handle('dialog:image', async (e) => {
    const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender)!, {
      title: 'Choose a button image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });
    if (result.canceled) return null;
    const file = result.filePaths[0];
    if ((await stat(file)).size > 10 * 1024 * 1024)
      throw Error('Choose an image smaller than 10 MB.');
    const img = nativeImage.createFromPath(file);
    if (img.isEmpty()) throw Error('This image could not be read. Try PNG or JPEG.');
    return img.resize({ width: 256, height: 256, quality: 'best' }).toDataURL();
  });
  handle('data:export', async (e) => {
    const result = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender)!, {
      defaultPath: 'KeePad-backup.json',
      filters: [{ name: 'KeePad backup', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return false;
    await writeFile(result.filePath, JSON.stringify(store.state, null, 2), { mode: 0o600 });
    return true;
  });
  handle('data:import', async (e) => {
    const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender)!, {
      properties: ['openFile'],
      filters: [{ name: 'KeePad backup', extensions: ['json'] }],
    });
    if (result.canceled) return null;
    const file = result.filePaths[0];
    if ((await stat(file)).size > 40 * 1024 * 1024)
      throw Error('This backup is too large (40 MB maximum).');
    const raw = JSON.parse(await readFile(file, 'utf8'));
    return serial(() => commit(mergeImported(store.state, raw, randomUUID)));
  });
}
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (store) showLauncher();
  });
  app
    .whenReady()
    .then(async () => {
      if (process.platform === 'darwin') app.setActivationPolicy('accessory');
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          {
            label: 'Edit',
            submenu: [
              { role: 'undo' },
              { role: 'redo' },
              { type: 'separator' },
              { role: 'cut' },
              { role: 'copy' },
              { role: 'paste' },
              { role: 'selectAll' },
            ],
          },
        ]),
      );
      const settingsFile = path.join(app.getPath('userData'), 'keepad.json');
      let firstRun = false;
      try {
        await stat(settingsFile);
      } catch {
        firstRun = true;
      }
      store = new Store(
        settingsFile,
        makeDefaultState({
          home: app.getPath('home'),
          downloads: app.getPath('downloads'),
          documents: app.getPath('documents'),
        }),
      );
      await store.load();
      setupIPC();
      const icon = nativeImage.createFromPath(
        path.join(root, 'assets', process.platform === 'darwin' ? 'trayTemplate.png' : 'tray.png'),
      );
      if (process.platform === 'darwin') icon.setTemplateImage(true);
      tray = new Tray(icon);
      tray.setToolTip('KeePad');
      tray.on('click', () => toggleLauncher());
      tray.on('right-click', () => tray.popUpContextMenu(trayMenu()));
      shortcutRegistered = registerShortcut(store.state.settings.shortcut);
      if (firstRun || !shortcutRegistered || store.warning || process.argv.includes('--editor'))
        showEditor();
      app.on('activate', () => showLauncher());
    })
    .catch((error) => {
      showError(error);
      app.quit();
    });
}
app.on('window-all-closed', () => {});
app.on('before-quit', () => {
  quitting = true;
});
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  tray?.destroy();
});

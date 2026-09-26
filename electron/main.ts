import { checkDestinations, inspectDestination } from './destinations.js';
import {
  RepairDestinationSchema,
  destinationMessages,
  type PathAction,
} from '../shared/destinations.js';
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
  nativeTheme,
  screen,
} from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, stat } from 'node:fs/promises';
import {
  StateSchema,
  makeDefaultState,
  mergeImported,
  type State,
  type Snapshot,
} from '../shared/model.js';
import { Store } from './store.js';
import { describeFile } from './file-binding.js';
import { isAppPage, nativePath } from './paths.js';
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
  shortcutRegistered = false,
  launcherBlurHiddenAt = 0;
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
    // Windows: a visible editor needs a taskbar button so it cannot be lost behind other
    // windows. Hidden windows have none, and macOS ignores this option (accessory policy).
    skipTaskbar: mode === 'launcher',
    alwaysOnTop: mode === 'launcher',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#202124' : '#fafafa',
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
  // Returning from Task Manager or Windows Settings refreshes the startup checkbox.
  if (mode === 'editor') win.on('focus', () => void syncLoginItem());
  if (mode === 'launcher') {
    win.on('blur', () => {
      if (!process.env.KEEPAD_TEST_DATA && store.state.settings.hideAfterAction) {
        launcherBlurHiddenAt = Date.now();
        win.hide();
      }
    });
  }
  if (devUrl) void win.loadURL(`${devUrl}/?mode=${mode}`);
  else void win.loadFile(path.join(root, 'dist/index.html'), { query: { mode } });
  return win;
}
function showEditor(page = 'pads', target?: { padId: string; buttonId: string }) {
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
    .executeJavaScript(
      `location.hash=${JSON.stringify(target ? `pads?pad=${encodeURIComponent(target.padId)}&button=${encodeURIComponent(target.buttonId)}` : page)}`,
    )
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
    height = Math.min(224 + pad.rows * 108, area.height - 24);
  const x = area.x + (area.width - width) / 2,
    y = area.y + (area.height - height) / 2;
  launcher.setBounds({
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  });
  const show = () => {
    launcher!.show();
    launcher!.focus();
    // A reused window can retain Chromium's last hovered control even after
    // search takes keyboard focus. Clear pointer state without moving the OS cursor.
    launcher!.webContents.sendInputEvent({ type: 'mouseLeave', x: 0, y: 0 });
    launcher!.webContents.send('launcher:shown');
  };
  if (launcher.webContents.isLoading()) launcher.webContents.once('did-finish-load', show);
  else show();
}
function toggleLauncher() {
  if (launcher?.isVisible()) launcher.hide();
  else showLauncher();
}
// On Windows, pressing the notification-area icon blurs (and hides) the launcher before the
// click arrives. Treat that click as the dismissal instead of summoning it again.
function trayToggle() {
  if (!launcher?.isVisible() && Date.now() - launcherBlurHiddenAt < 600) return;
  toggleLauncher();
}
// A portable build runs from a temporary extraction folder; register its stable launcher.
const loginItemPath = () => {
  const portable = process.env.PORTABLE_EXECUTABLE_FILE;
  return portable ? { path: portable } : {};
};
function setLoginItem(openAtLogin: boolean) {
  // Keep the Windows Run value name used before the app set its AppUserModelId, so turning
  // the setting off still removes entries written by earlier builds.
  app.setLoginItemSettings({ openAtLogin, name: 'electron.app.KeePad', ...loginItemPath() });
}
// Windows users can disable startup in Task Manager or Settings, and another KeePad copy can
// take over the Run entry. Keep the stored preference matching what Windows will actually do.
function syncLoginItem() {
  if (process.platform !== 'win32' || !app.isPackaged) return Promise.resolve();
  return serial(async () => {
    const actual = app.getLoginItemSettings(loginItemPath()).executableWillLaunchAtLogin;
    const current = store.state;
    if (actual === current.settings.launchAtLogin) return;
    await store.write({
      ...current,
      revision: current.revision + 1,
      settings: { ...current.settings, launchAtLogin: actual },
    });
    broadcast();
  }).catch(() => {});
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
      setLoginItem(next.settings.launchAtLogin);
      loginApplied = true;
    }
    await store.write({ ...next, revision: previous.revision + 1 });
  } catch (e) {
    if (changed) globalShortcut.unregister(next.settings.shortcut);
    if (loginApplied) {
      try {
        setLoginItem(previous.settings.launchAtLogin);
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
  nativeTheme.themeSource = store.state.settings.theme;
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
  if (
    !allowed ||
    event.senderFrame !== event.sender.mainFrame ||
    !isAppPage(event.senderFrame?.url ?? '', path.join(root, 'dist/index.html'), devUrl)
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
  let checking: ReturnType<typeof checkDestinations> | undefined;
  handle('destinations:check', () => {
    checking ??= checkDestinations(structuredClone(store.state)).finally(() => {
      checking = undefined;
    });
    return checking;
  });
  handle('destinations:repair', async (e, raw) => {
    const request = RepairDestinationSchema.parse(raw);
    const current = () => {
      if (store.state.revision !== request.revision)
        throw Error('Your pads changed. Check destinations again before repairing.');
      const button = store.state.pads
        .find((p) => p.id === request.padId)
        ?.buttons.find((b) => b.id === request.buttonId);
      if (!button || !['file', 'folder', 'app'].includes(button.type))
        throw Error('This button no longer has a file destination.');
      return button;
    };
    const button = current();
    const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender)!, {
      title: `Repair ${button.label}`,
      buttonLabel: 'Use destination',
      properties: [button.type === 'folder' ? 'openDirectory' : 'openFile'],
      ...(button.type === 'app' && process.platform === 'win32'
        ? { filters: [{ name: 'Applications', extensions: ['exe', 'lnk'] }] }
        : {}),
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const target = result.filePaths[0];
    const status = await inspectDestination(target, button.type as PathAction);
    if (status !== 'available')
      throw Error(
        `${destinationMessages[status]}. Choose another destination or check its permissions.`,
      );
    return serial(async () => {
      current();
      return commit({
        ...store.state,
        pads: store.state.pads.map((p) =>
          p.id === request.padId
            ? {
                ...p,
                buttons: p.buttons.map((b) => (b.id === request.buttonId ? { ...b, target } : b)),
              }
            : p,
        ),
      });
    });
  });
  handle('file:describe', (_e, target) => describeFile(target));
  handle('window:edit-button', (_e, padId, buttonId) => {
    if (
      typeof padId !== 'string' ||
      typeof buttonId !== 'string' ||
      !store.state.pads.find((p) => p.id === padId)?.buttons.some((b) => b.id === buttonId)
    )
      throw Error('This button no longer exists.');
    showEditor('pads', { padId, buttonId });
  });
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
      const target = button.target;
      if (!nativePath(target))
        throw Error(
          'This path is for another operating system. Edit the button and choose a local destination.',
        );
      let details;
      try {
        details = await stat(target);
      } catch {
        throw Error(
          `This destination is missing or cannot be accessed. Edit the button and choose a local destination.${process.platform === 'darwin' ? ' If macOS asks for access, allow access to that folder in System Settings → Privacy & Security → Files and Folders.' : ' Check its permissions in File Explorer.'}`,
        );
      }
      if (button.type === 'folder' && !details.isDirectory())
        throw Error('This destination is no longer a folder. Choose it again.');
      const error = await shell.openPath(target);
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
      // macOS needs Edit roles for Command-key clipboard shortcuts; the menu is not shown for an
      // accessory app. Windows would draw it as a menu bar in the editor, and Chromium already
      // handles Ctrl clipboard/undo shortcuts in text fields there.
      Menu.setApplicationMenu(
        process.platform === 'darwin'
          ? Menu.buildFromTemplate([
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
            ])
          : null,
      );
      // Match the installer's shortcut identity so the editor's taskbar button groups correctly.
      if (process.platform === 'win32') app.setAppUserModelId('app.keepad.desktop');
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
      await syncLoginItem();
      nativeTheme.themeSource = store.state.settings.theme;
      setupIPC();
      const icon = nativeImage.createFromPath(
        path.join(root, 'assets', process.platform === 'darwin' ? 'trayTemplate.png' : 'tray.png'),
      );
      if (process.platform === 'darwin') icon.setTemplateImage(true);
      tray = new Tray(icon);
      tray.setToolTip('KeePad');
      tray.on('click', () => trayToggle());
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

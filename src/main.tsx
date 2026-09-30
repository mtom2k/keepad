import { DestinationSettings } from './destination-settings';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import {
  Plus,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Pencil,
  Copy,
  Trash2,
  Eye,
  Upload,
  Download,
  ImagePlus,
  X,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { api, unwrap, type Snapshot } from './api';
import {
  Glyph,
  Logo,
  Tip,
  Modal,
  MacroKey,
  Shortcut,
  NumberStepper,
  PositionPicker,
  ButtonMenu,
} from './components';
import {
  ButtonSchema,
  actionNames,
  actionTypes,
  isSystemAction,
  icons,
  colors,
  themes,
  appThemes,
  type State,
  type Pad,
  type MacroButton,
} from '../shared/model';
import { placeButton } from './pad-layout';
import { emptySlot, copyOrMoveButton } from './button-actions';
import { LauncherSearch } from './launcher-search';
import './styles.css';
const themeNames = {
  paper: 'Paper',
  graphite: 'Graphite',
  sage: 'Sage',
  sand: 'Sand',
  midnight: 'Midnight',
  contrast: 'High contrast',
};

type ButtonTarget = { padId: string; buttonId: string; revision: number };
type MenuTarget = ButtonTarget & { x: number; y: number; trigger: HTMLElement };
const isLauncher = new URLSearchParams(location.search).get('mode') === 'launcher';
function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [page, setPage] = useState(location.hash === '#settings' ? 'settings' : 'pads');
  const [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [busy, setBusy] = useState(false);
  const [editSlot, setEditSlot] = useState<number | null>(null),
    [padDialog, setPadDialog] = useState<'new' | 'rename' | null>(null),
    [confirmDelete, setConfirmDelete] = useState<{
      padId: string;
      revision: number;
      name: string;
      count: number;
    } | null>(null),
    [padPicker, setPadPicker] = useState(false);
  const [selectedPadId, setSelectedPadId] = useState<string | null>(null);
  const [buttonMenu, setButtonMenu] = useState<MenuTarget | null>(null);
  const [buttonAction, setButtonAction] = useState<
    (ButtonTarget & { kind: 'delete' | 'move' }) | null
  >(null);
  const [replacement, setReplacement] = useState<{
    next: State;
    label: string;
    file: string;
  } | null>(null);
  const [requestedButton, setRequestedButton] = useState<{
    padId: string;
    buttonId: string;
  } | null>(null);
  const previousEditingPad = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!snapshot || isLauncher) return;
    if (
      previousEditingPad.current &&
      !snapshot.state.pads.some((p) => p.id === previousEditingPad.current)
    ) {
      setEditSlot(null);
      setPadDialog(null);
      setConfirmDelete(null);
    }
    previousEditingPad.current =
      snapshot.state.pads.find((p) => p.id === selectedPadId)?.id ?? snapshot.state.activePadId;
  }, [snapshot?.state.revision, selectedPadId]);
  const latestState = useRef(snapshot?.state);
  latestState.current = snapshot?.state;
  const closeMenu = useCallback(() => setButtonMenu(null), []);
  useEffect(closeMenu, [snapshot?.state.revision, selectedPadId, closeMenu]);
  useEffect(() => {
    const blockDrop = (event: DragEvent) => event.preventDefault();
    const escape = (event: KeyboardEvent) => {
      if (
        isLauncher &&
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        !event.isComposing &&
        !document.querySelector('dialog[open], [role="menu"]')
      )
        void api.hide();
    };
    window.addEventListener('dragover', blockDrop);
    window.addEventListener('drop', blockDrop);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('dragover', blockDrop);
      window.removeEventListener('drop', blockDrop);
      window.removeEventListener('keydown', escape);
    };
  }, []);
  useEffect(() => {
    if (!requestedButton || !snapshot) return;
    const selected = snapshot.state.pads.find((p) => p.id === requestedButton.padId);
    const button = selected?.buttons.find((b) => b.id === requestedButton.buttonId);
    if (selected && button) {
      setSelectedPadId(selected.id);
      setEditSlot(button.slot);
    } else setError('This button no longer exists.');
    setRequestedButton(null);
    history.replaceState(null, '', '#pads');
  }, [requestedButton, snapshot]);
  const dragSource = useRef<{ padId: string; buttonId: string; revision: number } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropSlot, setDropSlot] = useState<number | null>(null);
  const clearDrag = () => {
    dragSource.current = null;
    setDraggedId(null);
    setDropSlot(null);
  };
  const rootRef = useRef<HTMLDivElement>(null);
  const [launcherInvocation, setLauncherInvocation] = useState(0);
  useEffect(() => {
    if (!isLauncher || !snapshot) return;
    // Search owns summon focus; close transient pad controls alongside it.
    const resetControls = () => {
      setPadPicker(false);
      setButtonMenu(null);
      setButtonAction(null);
      setLauncherInvocation((invocation) => invocation + 1);
    };
    resetControls();
    const unsubscribe = api.onLauncherShown(resetControls);
    return () => {
      unsubscribe();
    };
  }, [Boolean(snapshot)]);
  const appTheme = snapshot?.state.settings.theme ?? 'system';
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.appearance =
        appTheme === 'system' ? (media.matches ? 'dark' : 'light') : appTheme;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [appTheme]);
  const notify = useCallback((text: string) => setToast(text), []);
  useEffect(() => {
    unwrap(api.load())
      .then(setSnapshot)
      .catch((e) => setError(e.message));
    return api.onChange(setSnapshot);
  }, []);
  useEffect(() => {
    const onHash = () => {
      setPage(location.hash === '#settings' ? 'settings' : 'pads');
      if (!isLauncher && location.hash.startsWith('#pads?')) {
        const params = new URLSearchParams(location.hash.slice(6));
        const padId = params.get('pad'),
          buttonId = params.get('button');
        if (padId && buttonId) setRequestedButton({ padId, buttonId });
      }
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  async function perform<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setError('');
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  async function save(next: State) {
    setBusy(true);
    try {
      const result = await unwrap(api.save(next));
      setSnapshot(result);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      const fresh = await api.load();
      if (fresh.ok) setSnapshot(fresh.value);
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (!snapshot)
    return (
      <div className="loading">
        <Logo />
        <p>{error || 'Loading…'}</p>
        {error && <button onClick={() => location.reload()}>Try again</button>}
      </div>
    );
  const { state, info } = snapshot,
    activePad = state.pads.find((p) => p.id === state.activePadId)!,
    pad =
      state.pads.find((p) => p.id === (isLauncher ? snapshot.launcherPadId : selectedPadId)) ??
      activePad;
  const mac = info.platform === 'darwin';
  const updatePad = async (next: Pad) =>
    save({ ...state, pads: state.pads.map((p) => (p.id === next.id ? next : p)) });
  const select = async (id: string) => {
    if (await save({ ...state, activePadId: id })) {
      setEditSlot(null);
      setPadPicker(false);
      if (isLauncher) await perform(() => unwrap(api.showLauncher()));
    }
  };
  const navigate = (next: string) => {
    location.hash = next;
    setPage(next);
  };
  const run = async (button: MacroButton) =>
    perform(async () => notify(await unwrap(api.run(pad.id, button.id))));
  const cycle = (delta: number) => {
    const at = state.pads.findIndex((p) => p.id === pad.id);
    void select(state.pads[(at + delta + state.pads.length) % state.pads.length].id);
  };
  const dropFile = async (files: FileList, slot: number) => {
    if (busy || isLauncher) return;
    if (files.length !== 1) {
      setError('Drop one file, folder, or application at a time.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const binding = await unwrap(api.describeFile(files[0]));
      if (latestState.current?.revision !== state.revision)
        throw Error('This pad changed. Drop the file again.');
      const existing = pad.buttons.find((b) => b.slot === slot);
      const button: MacroButton = existing
        ? { ...existing, type: binding.type, target: binding.target }
        : { ...binding, id: crypto.randomUUID(), slot, description: '', color: 'neutral' };
      const next = {
        ...state,
        pads: state.pads.map((p) => (p.id === pad.id ? placeButton(p, button, slot) : p)),
      };
      if (existing) setReplacement({ next, label: existing.label, file: binding.label });
      else if (await save(next)) notify('Button added');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const menuPad = state.pads.find((p) => p.id === buttonMenu?.padId);
  const menuButton = menuPad?.buttons.find((b) => b.id === buttonMenu?.buttonId);
  const themeStyle = { '--pad-columns': pad.columns } as React.CSSProperties;
  const grid = (
    <div className="pad-grid" style={themeStyle}>
      {Array.from({ length: pad.columns * pad.rows }, (_, slot) => (
        <MacroKey
          key={slot}
          slot={slot}
          button={pad.buttons.find((b) => b.slot === slot)}
          editing={!isLauncher}
          dragging={draggedId === pad.buttons.find((b) => b.slot === slot)?.id}
          draggingAny={draggedId !== null || buttonMenu !== null || dropSlot !== null}
          dropTarget={dropSlot === slot}
          onContextMenu={(event) => {
            const button = pad.buttons.find((b) => b.slot === slot);
            event.preventDefault();
            if (!button || busy) return;
            setButtonMenu({
              padId: pad.id,
              buttonId: button.id,
              revision: state.revision,
              x: event.clientX,
              y: event.clientY,
              trigger: event.currentTarget,
            });
          }}
          dragProps={
            isLauncher
              ? undefined
              : {
                  draggable: !busy && !!pad.buttons.find((b) => b.slot === slot),
                  onDragStart: (event) => {
                    const source = pad.buttons.find((b) => b.slot === slot);
                    if (!source || busy) {
                      event.preventDefault();
                      return;
                    }
                    dragSource.current = {
                      padId: pad.id,
                      buttonId: source.id,
                      revision: state.revision,
                    };
                    setDraggedId(source.id);
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('application/x-keepad-button', source.id);
                  },
                  onDragOver: (event) => {
                    if (event.dataTransfer.types.includes('Files') && !busy) {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'copy';
                      setDropSlot(slot);
                      return;
                    }
                    const source = dragSource.current;
                    if (busy || source?.padId !== pad.id || source.revision !== state.revision)
                      return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDropSlot(slot);
                  },
                  onDragLeave: (event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                      setDropSlot(null);
                  },
                  onDragEnd: clearDrag,
                  onDrop: (event) => {
                    event.preventDefault();
                    if (event.dataTransfer.types.includes('Files')) {
                      clearDrag();
                      void dropFile(event.dataTransfer.files, slot);
                      return;
                    }
                    const source = dragSource.current;
                    clearDrag();
                    if (busy || source?.padId !== pad.id || source.revision !== state.revision)
                      return;
                    event.preventDefault();
                    const moved = pad.buttons.find((b) => b.id === source.buttonId);
                    if (!moved || moved.slot === slot) return;
                    void (async () => {
                      const swapped = pad.buttons.some((b) => b.slot === slot);
                      if (await updatePad(placeButton(pad, { ...moved, slot }, moved.slot)))
                        notify(swapped ? 'Buttons swapped' : 'Button moved');
                    })();
                  },
                }
          }
          onClick={() => {
            const b = pad.buttons.find((b) => b.slot === slot);
            if (isLauncher) {
              if (b) void run(b);
            } else setEditSlot(slot);
          }}
        />
      ))}
    </div>
  );
  return (
    <div
      className={`app ${isLauncher ? 'launcher' : 'editor'}`}
      ref={rootRef}
      tabIndex={-1}
      data-theme={isLauncher ? pad.theme : 'paper'}
    >
      {isLauncher ? (
        <>
          <header className="launcher-head drag">
            <div className="brand">
              <Logo />
              <span>KeePad</span>
            </div>
            <div className="no-drag launcher-tools">
              <Tip text="Manage your pads">
                <button
                  className="icon-button"
                  aria-label="Manage pads"
                  onClick={() => void perform(() => unwrap(api.showEditor()))}
                >
                  <Settings size={18} />
                </button>
              </Tip>
              <button
                className="icon-button"
                aria-label="Hide KeePad"
                onClick={() => void perform(() => unwrap(api.hide()))}
              >
                <X size={18} />
              </button>
            </div>
          </header>
          <section className="launcher-content">
            <LauncherSearch
              pads={state.pads}
              menuOpen={buttonMenu !== null}
              invocation={launcherInvocation}
              onRun={(padId, button) =>
                void perform(async () => notify(await unwrap(api.run(padId, button.id))))
              }
              onMenu={(sourcePad, button, event) => {
                event.preventDefault();
                if (!busy)
                  setButtonMenu({
                    padId: sourcePad.id,
                    buttonId: button.id,
                    revision: state.revision,
                    x: event.clientX,
                    y: event.clientY,
                    trigger: event.currentTarget,
                  });
              }}
            >
              <div className="launcher-title">
                <button
                  className="pad-picker"
                  onClick={() => setPadPicker(!padPicker)}
                  aria-expanded={padPicker}
                >
                  <Glyph name={pad.icon} />
                  <strong>{pad.name}</strong>
                  <ChevronDown size={16} />
                </button>
                <div className="cycle">
                  <button
                    className="icon-button"
                    aria-label="Previous pad"
                    onClick={() => cycle(-1)}
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <button className="icon-button" aria-label="Next pad" onClick={() => cycle(1)}>
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
              {padPicker && (
                <div className="pad-popover">
                  {state.pads.map((p) => (
                    <button key={p.id} onClick={() => void select(p.id)}>
                      <Glyph name={p.icon} />
                      {p.name}
                      {pad.id === p.id && <Check size={16} />}
                    </button>
                  ))}
                </div>
              )}
              {grid}
            </LauncherSearch>
          </section>
          <footer className="launcher-footer">
            <span>
              <Shortcut value={state.settings.shortcut} mac={mac} />
            </span>
            <span>Esc to clear / close</span>
          </footer>
        </>
      ) : (
        <>
          <aside className="sidebar">
            <div className="sidebar-heading">Pads</div>
            <div className="pad-nav">
              {state.pads.map((p) => (
                <button
                  className={`pad-nav-item ${pad.id === p.id && page === 'pads' ? 'selected' : ''}`}
                  key={p.id}
                  onDoubleClick={() => {
                    if (!busy && p.id !== state.activePadId) void select(p.id);
                  }}
                  onClick={() => {
                    setSelectedPadId(p.id);
                    setEditSlot(null);
                    navigate('pads');
                  }}
                >
                  <Glyph name={p.icon} size={16} />
                  <span className="pad-nav-name">{p.name}</span>
                  {p.id === state.activePadId && <span className="active-badge">ACTIVE</span>}
                </button>
              ))}
              <button
                className="new-pad-link"
                disabled={state.pads.length >= 30}
                onClick={() => setPadDialog('new')}
              >
                <Plus size={15} /> New pad
              </button>
            </div>
            <div className="sidebar-bottom">
              <button
                className={`nav-item ${page === 'settings' ? 'active' : ''}`}
                onClick={() => navigate('settings')}
              >
                <Settings size={18} />
                <span>Settings</span>
              </button>
            </div>
          </aside>
          <div className="main-shell">
            <main className="main-content">
              {!info.desktop && (
                <div className="preview-banner">
                  <Info size={15} /> Browser preview · Open the desktop app for tray, hotkeys, and
                  local actions.
                </div>
              )}
              {info.storageWarning && <div className="warning">{info.storageWarning}</div>}
              {!info.shortcutRegistered && info.desktop && (
                <div className="warning">
                  Your summon shortcut is unavailable. Choose another in{' '}
                  <button onClick={() => navigate('settings')}>Settings</button>. The tray icon
                  still works.
                </div>
              )}
              {page === 'settings' ? (
                <SettingsPage
                  state={state}
                  info={info}
                  save={save}
                  notify={notify}
                  onError={setError}
                  busy={busy}
                />
              ) : (
                <>
                  <div className="workspace-toolbar">
                    <div className="pad-heading">
                      {pad.icon !== 'none' && (
                        <span className="pad-heading-icon">
                          <Glyph name={pad.icon} />
                        </span>
                      )}
                      <div>
                        <h1>{pad.name}</h1>
                      </div>
                    </div>
                    <div className="toolbar-actions">
                      <Tip
                        text={
                          pad.id === state.activePadId
                            ? 'This pad opens from the tray or global shortcut.'
                            : 'Use this pad when opening KeePad from the tray or global shortcut.'
                        }
                      >
                        <button
                          className="secondary"
                          disabled={busy || pad.id === state.activePadId}
                          onClick={() => void select(pad.id)}
                        >
                          Make Active
                        </button>
                      </Tip>
                      <span className="toolbar-divider" aria-hidden="true" />
                      <Tip text="Preview pad on screen">
                        <button
                          className="icon-button bordered"
                          aria-label="Preview pad on screen"
                          onClick={() => void perform(() => unwrap(api.showLauncher(pad.id)))}
                        >
                          <Eye size={17} />
                        </button>
                      </Tip>
                      <Tip text="Edit Pad">
                        <button
                          className="icon-button bordered"
                          aria-label="Edit Pad"
                          disabled={busy}
                          onClick={() => setPadDialog('rename')}
                        >
                          <Pencil size={17} />
                        </button>
                      </Tip>
                      <Tip
                        text={state.pads.length >= 30 ? 'Pad limit reached (30).' : 'Duplicate Pad'}
                      >
                        <button
                          className="icon-button bordered"
                          aria-label="Duplicate Pad"
                          disabled={busy || state.pads.length >= 30}
                          onClick={async () => {
                            const id = crypto.randomUUID();
                            if (
                              await save({
                                ...state,
                                pads: [
                                  ...state.pads,
                                  {
                                    ...pad,
                                    id,
                                    name: `${pad.name.slice(0, 25)} copy`,
                                    buttons: pad.buttons.map((b) => ({
                                      ...b,
                                      id: crypto.randomUUID(),
                                    })),
                                  },
                                ],
                              })
                            ) {
                              setSelectedPadId(id);
                              notify('Pad duplicated');
                            }
                          }}
                        >
                          <Copy size={17} />
                        </button>
                      </Tip>
                      <Tip text={state.pads.length === 1 ? 'Keep at least one pad.' : 'Delete Pad'}>
                        <button
                          className="icon-button bordered"
                          aria-label="Delete Pad"
                          disabled={busy || state.pads.length === 1}
                          onClick={() =>
                            setConfirmDelete({
                              padId: pad.id,
                              revision: state.revision,
                              name: pad.name,
                              count: pad.buttons.length,
                            })
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      </Tip>
                    </div>
                  </div>
                  <div className="editor-workspace">
                    <div className="appearance">
                      <label htmlFor="theme">Pad Theme</label>
                      <select
                        id="theme"
                        value={pad.theme}
                        disabled={busy}
                        onChange={(e) =>
                          void updatePad({ ...pad, theme: e.target.value as Pad['theme'] })
                        }
                      >
                        {themes.map((theme) => (
                          <option key={theme} value={theme}>
                            {themeNames[theme]}
                          </option>
                        ))}
                      </select>
                      {(['columns', 'rows'] as const).map((dimension) => (
                        <NumberStepper
                          key={dimension}
                          label={dimension === 'columns' ? 'Columns' : 'Rows'}
                          value={pad[dimension]}
                          min={dimension === 'columns' ? 3 : 2}
                          max={dimension === 'columns' ? 5 : 4}
                          disabled={busy}
                          decreaseDisabledReason={
                            pad.buttons.some(
                              (b) =>
                                b.slot >=
                                (pad[dimension] - 1) *
                                  pad[dimension === 'columns' ? 'rows' : 'columns'],
                            )
                              ? 'Move or remove buttons outside the smaller layout first.'
                              : undefined
                          }
                          onChange={(value) => void updatePad({ ...pad, [dimension]: value })}
                        />
                      ))}
                    </div>
                    <section className="pad-stage" data-theme={pad.theme}>
                      {grid}
                    </section>
                  </div>
                  <div className="workspace-footer">
                    <span>
                      {busy
                        ? 'Saving…'
                        : `${pad.buttons.length} / ${pad.columns * pad.rows} buttons`}
                    </span>
                    <Tip text="Show or hide KeePad. Change this shortcut in Settings.">
                      <button
                        className="shortcut-link"
                        aria-label="Shortcut settings"
                        onClick={() => navigate('settings')}
                      >
                        <Shortcut value={state.settings.shortcut} mac={mac} />
                      </button>
                    </Tip>
                  </div>
                </>
              )}
            </main>
          </div>
        </>
      )}
      {error &&
        createPortal(
          <div className="error-banner" role="alert">
            <Info size={18} />
            <span>{error}</span>
            <button aria-label="Dismiss error" onClick={() => setError('')}>
              <X size={17} />
            </button>
          </div>,
          document.querySelector('dialog[open]') ?? document.body,
        )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
      {buttonMenu && menuPad && menuButton && (
        <ButtonMenu
          {...buttonMenu}
          onClose={closeMenu}
          items={[
            {
              label: 'Edit…',
              onSelect: () => {
                if (isLauncher)
                  void perform(() => unwrap(api.editButton(menuPad.id, menuButton.id)));
                else setEditSlot(menuButton.slot);
              },
            },
            {
              label: 'Duplicate',
              disabled: emptySlot(menuPad) === undefined,
              onSelect: () =>
                void perform(async () => {
                  if (
                    await save(
                      copyOrMoveButton(
                        state,
                        menuPad.id,
                        menuButton.id,
                        menuPad.id,
                        true,
                        crypto.randomUUID(),
                      ),
                    )
                  )
                    notify('Button duplicated');
                }),
            },
            {
              label: 'Move to another pad…',
              disabled: !state.pads.some((p) => p.id !== menuPad.id && emptySlot(p) !== undefined),
              onSelect: () => setButtonAction({ ...buttonMenu, kind: 'move' }),
            },
            {
              label: 'Delete…',
              danger: true,
              onSelect: () => setButtonAction({ ...buttonMenu, kind: 'delete' }),
            },
          ]}
        />
      )}
      {buttonAction && (
        <ButtonActionDialog
          target={buttonAction}
          state={state}
          busy={busy}
          onClose={() => setButtonAction(null)}
          onConfirm={async (destination) => {
            if (state.revision !== buttonAction.revision) {
              setButtonAction(null);
              setError('This pad changed. Open the button menu again.');
              return;
            }
            await perform(async () => {
              const next =
                buttonAction.kind === 'move'
                  ? copyOrMoveButton(
                      state,
                      buttonAction.padId,
                      buttonAction.buttonId,
                      destination!,
                      false,
                      crypto.randomUUID(),
                    )
                  : {
                      ...state,
                      pads: state.pads.map((p) =>
                        p.id === buttonAction.padId
                          ? {
                              ...p,
                              buttons: p.buttons.filter((b) => b.id !== buttonAction.buttonId),
                            }
                          : p,
                      ),
                    };
              if (await save(next)) {
                setButtonAction(null);
                notify(buttonAction.kind === 'move' ? 'Button moved' : 'Button deleted');
              }
            });
          }}
        />
      )}
      {replacement && (
        <Modal title="Replace button action?" onClose={() => setReplacement(null)}>
          <p className="modal-description">
            Bind “{replacement.label}” to “{replacement.file}”? Its name, image, and position will
            stay the same.
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setReplacement(null)}>
              Cancel
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                if (replacement.next.revision !== state.revision) {
                  setReplacement(null);
                  setError('This pad changed. Drop the file again.');
                  return;
                }
                if (await save(replacement.next)) {
                  setReplacement(null);
                  notify('Button updated');
                }
              }}
            >
              Replace action
            </button>
          </div>
        </Modal>
      )}
      {editSlot !== null && (
        <ButtonEditor
          key={`${pad.id}-${editSlot}`}
          pad={pad}
          revision={state.revision}
          slot={editSlot}
          busy={busy}
          onClose={() => setEditSlot(null)}
          onSave={async (next) => {
            if (
              await save({ ...state, pads: state.pads.map((p) => (p.id === next.id ? next : p)) })
            ) {
              setEditSlot(null);
              notify('Button saved');
            }
          }}
        />
      )}
      {padDialog && (
        <PadDialog
          pad={padDialog === 'rename' ? pad : undefined}
          revision={state.revision}
          onClose={() => setPadDialog(null)}
          busy={busy}
          onSave={async (values) => {
            if (padDialog === 'rename') {
              if (await updatePad({ ...pad, ...values })) setPadDialog(null);
            } else {
              const id = crypto.randomUUID();
              if (
                await save({
                  ...state,
                  pads: [
                    ...state.pads,
                    { ...values, id, theme: 'paper', columns: 4, rows: 3, buttons: [] },
                  ],
                })
              ) {
                setPadDialog(null);
                setSelectedPadId(id);
                navigate('pads');
                notify('Pad created');
              }
            }
          }}
        />
      )}
      {confirmDelete && (
        <Modal title={`Delete ${confirmDelete.name}?`} onClose={() => setConfirmDelete(null)}>
          <p className="modal-description">
            This removes the pad and its {confirmDelete.count} buttons from this device. This cannot
            be undone.
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setConfirmDelete(null)}>
              Keep pad
            </button>
            <button
              className="danger"
              disabled={busy}
              onClick={async () => {
                if (confirmDelete.revision !== state.revision || confirmDelete.padId !== pad.id) {
                  setConfirmDelete(null);
                  setError('The library changed. Review the pad before deleting it.');
                  return;
                }
                const pads = state.pads.filter((p) => p.id !== pad.id);
                const activePadId = state.activePadId === pad.id ? pads[0].id : state.activePadId;
                if (await save({ ...state, pads, activePadId })) {
                  setSelectedPadId(activePadId);
                  setConfirmDelete(null);
                  notify('Pad deleted');
                }
              }}
            >
              Delete pad
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function ButtonActionDialog({
  target,
  state,
  busy,
  onClose,
  onConfirm,
}: {
  target: ButtonTarget & { kind: 'delete' | 'move' };
  state: State;
  busy: boolean;
  onClose: () => void;
  onConfirm: (destination?: string) => Promise<void>;
}) {
  const destinations = state.pads.filter((p) => p.id !== target.padId);
  const [destination, setDestination] = useState(
    destinations.find((p) => emptySlot(p) !== undefined)?.id ?? '',
  );
  const button = state.pads
    .find((p) => p.id === target.padId)
    ?.buttons.find((b) => b.id === target.buttonId);
  return (
    <Modal title={target.kind === 'move' ? 'Move button' : 'Delete button?'} onClose={onClose}>
      <p className="modal-description">
        {target.kind === 'move'
          ? `Move “${button?.label ?? 'Button'}” to the first empty position on another pad.`
          : `Delete “${button?.label ?? 'Button'}”? This cannot be undone.`}
      </p>
      {target.kind === 'move' && (
        <>
          <label className="field-label" htmlFor="destination-pad">
            Pad
          </label>
          <select
            id="destination-pad"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            {destinations.map((p) => (
              <option value={p.id} key={p.id} disabled={emptySlot(p) === undefined}>
                {p.name}
                {emptySlot(p) === undefined ? ' (full)' : ''}
              </option>
            ))}
          </select>
        </>
      )}
      <div className="modal-actions">
        <button className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className={target.kind === 'delete' ? 'danger' : 'primary'}
          disabled={busy || !button || (target.kind === 'move' && !destination)}
          onClick={() => void onConfirm(destination)}
        >
          {target.kind === 'move' ? 'Move button' : 'Delete button'}
        </button>
      </div>
    </Modal>
  );
}
function PadDialog({
  pad,
  revision,
  onClose,
  onSave,
  busy,
}: {
  pad?: Pad;
  revision: number;
  onClose: () => void;
  onSave: (values: Pick<Pad, 'name' | 'description' | 'icon'>) => void;
  busy: boolean;
}) {
  const [baseRevision] = useState(revision);
  const [validation, setValidation] = useState('');
  const [name, setName] = useState(pad?.name ?? ''),
    [description, setDescription] = useState(pad?.description ?? ''),
    [icon, setIcon] = useState<Pad['icon']>(pad?.icon ?? 'grid');
  return (
    <Modal title={pad ? 'Edit pad' : 'New pad'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (revision !== baseRevision) {
            setValidation('The library changed. Close and reopen this dialog before saving.');
            return;
          }
          if (name.trim()) onSave({ name: name.trim(), description, icon });
        }}
      >
        {validation && (
          <p className="inline-error" role="alert">
            {validation}
          </p>
        )}
        <label className="field-label" htmlFor="pad-name">
          Pad name
        </label>
        <input
          id="pad-name"
          autoFocus
          placeholder="Work"
          maxLength={32}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <label className="field-label" htmlFor="pad-description">
          Description <span>optional</span>
        </label>
        <input
          id="pad-description"
          placeholder="Optional"
          maxLength={100}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <label className="field-label">Pad icon</label>
        <div className="icon-picker">
          <Tip text="Show the pad name without an icon">
            <button
              type="button"
              aria-label="No pad icon"
              aria-pressed={icon === 'none'}
              className={`no-icon-option ${icon === 'none' ? 'selected' : ''}`}
              onClick={() => setIcon('none')}
            >
              None
            </button>
          </Tip>
          {icons.map((i) => (
            <button
              type="button"
              aria-label={`${i} icon`}
              aria-pressed={i === icon}
              className={i === icon ? 'selected' : ''}
              key={i}
              onClick={() => setIcon(i)}
            >
              <Glyph name={i} />
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={!name.trim() || busy}>
            {pad ? 'Save changes' : 'Create pad'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function ButtonEditor({
  pad,
  revision,
  slot,
  onClose,
  onSave,
  busy,
}: {
  pad: Pad;
  revision: number;
  slot: number;
  onClose: () => void;
  onSave: (p: Pad) => void;
  busy: boolean;
}) {
  const [baseRevision] = useState(revision);
  const existing = pad.buttons.find((b) => b.slot === slot);
  const [button, setButton] = useState<MacroButton>(
    existing ?? {
      id: crypto.randomUUID(),
      label: '',
      description: '',
      type: 'url',
      target: '',
      icon: 'globe',
      color: 'green',
      slot,
    },
  );
  const [validation, setValidation] = useState(''),
    [deleting, setDeleting] = useState(false);
  const change = (patch: Partial<MacroButton>) => {
    setButton((b) => ({ ...b, ...patch }));
  };
  const pick = async (image = false) => {
    try {
      const result = await unwrap(image ? api.pickImage() : api.pickPath(button.type));
      if (result) change(image ? { image: result } : { target: result });
    } catch (e) {
      setValidation((e as Error).message);
    }
  };
  const save = () => {
    if (revision !== baseRevision) {
      setValidation(
        'The library changed while this dialog was open. Your draft has not been saved. Close and reopen the button to review the latest version.',
      );
      return;
    }
    const parsed = ButtonSchema.safeParse(button);
    if (!parsed.success) {
      setValidation(parsed.error.issues[0].message);
      return;
    }
    onSave(placeButton(pad, parsed.data, slot));
  };
  return (
    <Modal title={existing ? 'Edit button' : 'New button'} onClose={onClose} wide>
      <div className="button-editor">
        <div className="button-form">
          <form
            id="button-form"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label className="field-label" htmlFor="button-name">
              Button name
            </label>
            <input
              id="button-name"
              value={button.label}
              onChange={(e) => change({ label: e.target.value })}
              maxLength={40}
              placeholder="e.g. Project files"
              autoFocus
              required
            />
            <label className="field-label" htmlFor="action-type">
              Action
            </label>
            <select
              id="action-type"
              value={button.type}
              onChange={(e) => {
                const type = e.target.value as MacroButton['type'];
                change({
                  type,
                  target: '',
                  icon: (
                    {
                      url: 'globe',
                      file: 'file',
                      folder: 'folder',
                      app: 'app',
                      text: 'copy',
                      sleep: 'moon',
                    } as const
                  )[type],
                });
              }}
            >
              {actionTypes.map((type) => (
                <option value={type} key={type}>
                  {actionNames[type]}
                </option>
              ))}
            </select>
            {isSystemAction(button.type) ? (
              <p className="field-hint">
                Puts this computer to sleep when you run the button. Wake it normally to resume.
              </p>
            ) : (
              <>
                <label className="field-label" htmlFor="action-target">
                  {button.type === 'url'
                    ? 'Website address'
                    : button.type === 'text'
                      ? 'Text to copy'
                      : 'Destination'}
                </label>
                {button.type === 'text' ? (
                  <textarea
                    id="action-target"
                    rows={4}
                    value={button.target}
                    onChange={(e) => change({ target: e.target.value })}
                    maxLength={20000}
                    required
                    placeholder="Text to copy"
                  />
                ) : (
                  <div className="input-with-button">
                    <input
                      id="action-target"
                      value={button.target}
                      onChange={(e) => change({ target: e.target.value })}
                      placeholder={
                        button.type === 'url'
                          ? 'https://example.com'
                          : 'Choose a file, folder, or application'
                      }
                      required
                    />
                    {button.type !== 'url' && (
                      <button type="button" className="secondary" onClick={() => void pick()}>
                        Browse…
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
            <label className="field-label" htmlFor="button-tip">
              Hover hint <span>optional</span>
            </label>
            <input
              id="button-tip"
              maxLength={180}
              value={button.description}
              onChange={(e) => change({ description: e.target.value })}
              placeholder="Optional tooltip"
            />
            <span className="field-label">Position</span>
            <PositionPicker
              pad={pad}
              button={button}
              origin={slot}
              disabled={busy}
              onChange={(nextSlot) => change({ slot: nextSlot })}
            />
            {validation && (
              <p className="inline-error" role="alert">
                {validation}
              </p>
            )}
          </form>
        </div>
        <aside className="button-visual">
          <span className="panel-eyebrow">Preview</span>
          <div className="key-preview" data-theme={pad.theme}>
            <MacroKey
              button={{ ...button, label: button.label || 'Your button' }}
              slot={button.slot}
              editing={false}
              onClick={() => {}}
            />
          </div>
          <label className="field-label">Button color</label>
          <div className="color-picker">
            {colors.map((c) => (
              <button
                key={c}
                aria-label={`${c} button color`}
                aria-pressed={button.color === c}
                className={`tone-${c} ${button.color === c ? 'selected' : ''}`}
                onClick={() => change({ color: c })}
              >
                {button.color === c && <Check size={14} />}
              </button>
            ))}
          </div>
          <label className="field-label">Icon</label>
          <div className="icon-picker compact">
            {icons.map((i) => (
              <button
                aria-label={`${i} icon`}
                aria-pressed={button.icon === i && !button.image}
                key={i}
                className={button.icon === i && !button.image ? 'selected' : ''}
                onClick={() => change({ icon: i, image: undefined })}
              >
                <Glyph name={i} size={18} />
              </button>
            ))}
          </div>
          <button className="secondary upload-image" onClick={() => void pick(true)}>
            <ImagePlus size={16} />
            {button.image ? 'Replace image' : 'Choose image…'}
          </button>
          {button.image && (
            <button className="text-button" onClick={() => change({ image: undefined })}>
              Remove image
            </button>
          )}
          <p className="field-hint">PNG, JPG, WebP · 10 MB max</p>
        </aside>
      </div>
      <div className="modal-actions split">
        {existing ? (
          <div className="delete-control">
            {deleting ? (
              <>
                <span>Remove button?</span>
                <button
                  className="danger-text text-button"
                  disabled={busy}
                  onClick={() => {
                    if (revision !== baseRevision) {
                      setValidation(
                        'The library changed. Close and reopen this button before removing it.',
                      );
                      return;
                    }
                    onSave({ ...pad, buttons: pad.buttons.filter((b) => b.id !== existing.id) });
                  }}
                >
                  Yes, remove
                </button>
                <button className="text-button" onClick={() => setDeleting(false)}>
                  Keep
                </button>
              </>
            ) : (
              <button className="text-button danger-text" onClick={() => setDeleting(true)}>
                <Trash2 size={15} /> Remove
              </button>
            )}
          </div>
        ) : (
          <span />
        )}
        <div>
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit" form="button-form" disabled={busy}>
            Save button
          </button>
        </div>
      </div>
    </Modal>
  );
}
function SettingsPage({
  state,
  info,
  save,
  notify,
  onError,
  busy,
}: {
  state: State;
  info: Snapshot['info'];
  save: (s: State) => Promise<boolean>;
  notify: (s: string) => void;
  onError: (s: string) => void;
  busy: boolean;
}) {
  const [shortcut, setShortcut] = useState(state.settings.shortcut),
    [recording, setRecording] = useState(false);
  const mac = info.platform === 'darwin';
  useEffect(() => setShortcut(state.settings.shortcut), [state.settings.shortcut]);
  async function update(patch: Partial<State['settings']>) {
    if (await save({ ...state, settings: { ...state.settings, ...patch } }))
      notify('Settings saved');
  }
  const capture = (e: React.KeyboardEvent) => {
    if (!recording) return;
    e.preventDefault();
    if (e.key === 'Escape') {
      setRecording(false);
      return;
    }
    if (['Meta', 'Control', 'Shift', 'Alt', 'OS'].includes(e.key)) return;
    if (!e.metaKey && !e.ctrlKey && !e.altKey) {
      onError(
        mac
          ? 'Include Command, Control, or Option with your shortcut.'
          : 'Include Ctrl, Alt, or the Windows key with your shortcut.',
      );
      return;
    }
    const key =
      e.code === 'Space'
        ? 'Space'
        : e.code.startsWith('Key')
          ? e.code.slice(3)
          : e.code.startsWith('Digit')
            ? e.code.slice(5)
            : e.key.length === 1
              ? e.key.toUpperCase()
              : e.key;
    // CommandOrControl is Command on macOS and Ctrl on Windows; record the other key separately.
    const parts = [
      ...((mac ? e.metaKey : e.ctrlKey) ? ['CommandOrControl'] : []),
      ...((mac ? e.ctrlKey : e.metaKey) ? [mac ? 'Control' : 'Super'] : []),
      ...(e.altKey ? ['Alt'] : []),
      ...(e.shiftKey ? ['Shift'] : []),
      key,
    ];
    setShortcut(parts.join('+'));
    setRecording(false);
  };
  return (
    <>
      <div className="page-heading">
        <h1>Settings</h1>
      </div>
      <section className="settings-card">
        <h2>General</h2>
        <div className="setting-row">
          <label htmlFor="app-theme">Theme</label>
          <select
            id="app-theme"
            value={state.settings.theme}
            disabled={busy}
            onChange={(event) =>
              void update({ theme: event.target.value as State['settings']['theme'] })
            }
          >
            {appThemes.map((theme) => (
              <option key={theme} value={theme}>
                {theme[0].toUpperCase() + theme.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="setting-row">
          <div>
            <strong>Global shortcut</strong>
          </div>
          <div className="shortcut-controls">
            <button
              className={`shortcut-capture ${recording ? 'recording' : ''}`}
              onClick={() => setRecording(true)}
              onKeyDown={capture}
              onBlur={() => setRecording(false)}
              aria-label="Record summon shortcut"
            >
              {recording ? 'Press a combination…' : <Shortcut value={shortcut} mac={mac} />}
            </button>
            <button
              className="primary small"
              disabled={busy || shortcut === state.settings.shortcut}
              onClick={() => void update({ shortcut })}
            >
              Save
            </button>
          </div>
        </div>
        <p className="settings-hint">Click to record a shortcut. Esc cancels.</p>
        <div className="setting-row">
          <div>
            <strong>Hide after an action</strong>
          </div>
          <input
            type="checkbox"
            checked={state.settings.hideAfterAction}
            aria-label="Hide after an action"
            disabled={busy}
            onChange={(e) => void update({ hideAfterAction: e.target.checked })}
          />
        </div>
        <div className="setting-row">
          <div>
            <strong>Start with your computer</strong>
            {!info.packaged && <p>Requires an installed app.</p>}
          </div>
          <input
            type="checkbox"
            checked={state.settings.launchAtLogin}
            aria-label="Start with your computer"
            disabled={busy || !info.packaged}
            onChange={(e) => void update({ launchAtLogin: e.target.checked })}
          />
        </div>
      </section>
      <DestinationSettings
        revision={state.revision}
        desktop={info.desktop}
        platform={info.platform}
      />
      <section className="settings-card">
        <h2>Backup</h2>
        <p className="settings-copy">Imports add pads without replacing existing ones.</p>
        <div className="backup-actions">
          <button
            className="secondary"
            onClick={async () => {
              try {
                if (await unwrap(api.exportPads())) notify('Backup exported');
              } catch (e) {
                onError((e as Error).message);
              }
            }}
          >
            <Download size={16} /> Export backup
          </button>
          <button
            className="secondary"
            onClick={async () => {
              try {
                const result = await unwrap(api.importPads());
                if (result) notify('Pads imported');
              } catch (e) {
                onError((e as Error).message);
              }
            }}
          >
            <Upload size={16} /> Import pads
          </button>
        </div>
        <p className="field-hint">Backups include images, file paths, and text snippets.</p>
      </section>
      <details className="permissions-details">
        <summary>Storage and permissions</summary>
        <p>Pads and preferences are stored on this computer. No KeePad account or analytics.</p>
        <p>
          {info.platform === 'darwin'
            ? 'macOS may request access when opening a protected folder. Manage access in System Settings → Privacy & Security → Files and Folders. Accessibility and screen-recording permissions are not required.'
            : 'KeePad uses your existing file permissions. If a file cannot be opened, check its permissions in File Explorer.'}
        </p>
        <p>
          After importing on another computer, update any file paths. Backups contain your text
          snippets; store them privately.
        </p>
      </details>
      <div className="settings-footer">KeePad · Version {info.version}</div>
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

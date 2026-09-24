import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, readdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Store } from '../electron/store.js';
import { SyncEngine, nativePath, destination } from '../electron/sync.js';
import { makeDefaultState, type State } from '../shared/model.js';

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'keepad-sync-'));
  const folder = path.join(root, 'shared');
  await mkdir(folder);
  const a = new Store(path.join(root, 'mac', 'keepad.json'), makeDefaultState());
  const defaults = makeDefaultState();
  defaults.settings.theme = 'dark';
  defaults.activePadId = 'focus';
  defaults.settings.shortcut = 'Control+Shift+Space';
  const b = new Store(path.join(root, 'windows', 'keepad.json'), defaults);
  await a.load();
  await b.load();
  const mac = new SyncEngine(a, 'darwin'),
    win = new SyncEngine(b, 'win32');
  const attach = async (engine: SyncEngine, directory = folder) =>
    engine.connect(directory, (await engine.inspect(directory)).fingerprint);
  const edit = async (engine: SyncEngine, change: (s: State) => void) => {
    const next = structuredClone(engine.store.state);
    change(next);
    next.revision++;
    await engine.save(next);
  };
  return {
    root,
    folder,
    a,
    b,
    mac,
    win,
    attach,
    edit,
    close: () => rm(root, { recursive: true, force: true }),
  };
}

test('Mac and Windows libraries merge independent pad edits while preferences and active selection stay local', async () => {
  const f = await fixture();
  try {
    assert.equal(f.a.device.folder, undefined);
    await f.attach(f.mac);
    await f.attach(f.win);
    const settings = structuredClone(f.b.state.settings);
    await f.edit(f.mac, (s) => {
      s.pads.find((p) => p.id === 'everyday')!.name = 'Mac edit';
    });
    await f.edit(f.win, (s) => {
      s.pads.find((p) => p.id === 'focus')!.description = 'Windows edit';
    });
    await f.mac.tick();
    await f.win.tick();
    await f.mac.tick();
    assert.deepEqual(f.a.state.pads, f.b.state.pads);
    assert.equal(f.b.state.pads.find((p) => p.id === 'everyday')!.name, 'Mac edit');
    assert.equal(f.a.state.pads.find((p) => p.id === 'focus')!.description, 'Windows edit');
    assert.deepEqual(f.b.state.settings, settings);
    assert.equal(f.b.state.activePadId, 'focus');
    assert.equal(f.a.state.activePadId, 'everyday');
    assert.equal(f.mac.status().conflicts.length, 0);
  } finally {
    await f.close();
  }
});

test('concurrent edits preserve both versions, block implicit overwrite, and resolve as separate pads', async () => {
  const f = await fixture();
  try {
    await f.attach(f.mac);
    await f.attach(f.win);
    await f.edit(f.mac, (s) => {
      s.pads[0].name = 'Mac version';
    });
    await f.edit(f.win, (s) => {
      s.pads[0].name = 'Windows version';
    });
    await f.mac.tick();
    await f.win.tick();
    await f.mac.tick();
    const conflict = f.mac.status().conflicts[0];
    assert.equal(conflict.versions.length, 2);
    await assert.rejects(
      f.edit(f.mac, (s) => {
        s.pads.find((p) => p.id === conflict.padId)!.name = 'Unsafe';
      }),
      /Resolve/,
    );
    const reloaded = new Store(f.a.file, makeDefaultState());
    await reloaded.load();
    const restarted = new SyncEngine(reloaded, 'darwin');
    await assert.rejects(
      restarted.save({
        ...reloaded.state,
        pads: reloaded.state.pads.map((p) =>
          p.id === conflict.padId ? { ...p, name: 'Unsafe offline edit' } : p,
        ),
      }),
      /Resolve/,
    );
    await f.mac.resolve(
      conflict.padId,
      conflict.versions.map((v) => v.id),
      'both',
    );
    await f.win.tick();
    assert.equal(f.mac.status().conflicts.length, 0);
    assert.equal(f.win.status().conflicts.length, 0);
    assert.equal(f.a.state.pads.length, 4);
    assert.deepEqual(f.a.state.pads, f.b.state.pads);
    assert.ok(f.a.state.pads.some((p) => p.name.startsWith('Mac version')));
    assert.ok(f.a.state.pads.some((p) => p.name.startsWith('Windows version')));
    await assert.rejects(
      f.mac.resolve(
        conflict.padId,
        conflict.versions.map((v) => v.id),
        'both',
      ),
      /changed/,
    );
  } finally {
    await f.close();
  }
});

test('edit-versus-delete is a conflict and tombstones prevent delayed files from resurrecting pads', async () => {
  const f = await fixture();
  try {
    await f.attach(f.mac);
    await f.attach(f.win);
    await f.edit(f.mac, (s) => {
      s.pads = s.pads.filter((p) => p.id !== 'creative');
    });
    await f.edit(f.win, (s) => {
      s.pads.find((p) => p.id === 'creative')!.name = 'Keep me';
    });
    await f.mac.tick();
    await f.win.tick();
    await f.mac.tick();
    const c = f.mac.status().conflicts[0];
    assert.ok(c.versions.some((v) => v.deleted));
    assert.ok(f.a.state.pads.some((p) => p.name === 'Keep me'));
    await f.mac.resolve(
      c.padId,
      c.versions.map((v) => v.id),
      c.versions.find((v) => v.deleted)!.id,
    );
    await f.win.tick();
    assert.ok(!f.b.state.pads.some((p) => p.id === 'creative'));
    await f.mac.tick();
    assert.equal(f.a.state.pads.length, 2);
  } finally {
    await f.close();
  }
});

test('offline outbox survives restart and missing/out-of-order history never replaces the local cache', async () => {
  const f = await fixture();
  try {
    await f.attach(f.mac);
    const other = path.join(f.root, 'other-provider');
    await mkdir(other);
    await cp(path.join(f.folder, 'keepad-library'), path.join(other, 'keepad-library'), {
      recursive: true,
    });
    await f.attach(f.win, other);
    await f.edit(f.mac, (s) => {
      s.pads[0].name = 'Parent';
    });
    await f.mac.tick();
    await f.edit(f.mac, (s) => {
      s.pads[0].name = 'Child';
    });
    await f.mac.tick();
    const latest = f.a.device.heads.find((h) => h.padId === 'everyday')!.ids[0];
    await cp(
      path.join(f.folder, 'keepad-library', 'changes', `${latest}.json`),
      path.join(other, 'keepad-library', 'changes', `${latest}.json`),
    );
    const before = structuredClone(f.b.state);
    await f.win.tick();
    assert.match(f.win.status().error!, /complete library history/);
    assert.deepEqual(f.b.state, before);
    await cp(path.join(f.folder, 'keepad-library'), path.join(other, 'keepad-library'), {
      recursive: true,
    });
    await f.win.tick();
    assert.equal(f.b.state.pads[0].name, 'Child');
    await rename(f.folder, `${f.folder}-offline`);
    await f.edit(f.mac, (s) => {
      s.pads[0].name = 'Offline edit';
    });
    await f.mac.tick();
    assert.equal(f.a.device.pending.length, 1);
    assert.ok(f.mac.status().error);
    const reloaded = new Store(f.a.file, makeDefaultState());
    await reloaded.load();
    const restarted = new SyncEngine(reloaded, 'darwin');
    assert.equal(reloaded.device.pending.length, 1);
    await rename(`${f.folder}-offline`, f.folder);
    await restarted.tick();
    assert.equal(reloaded.device.pending.length, 0);
    assert.equal(reloaded.state.pads[0].name, 'Offline edit');
  } finally {
    await f.close();
  }
});

test('invalid, future, and provider-renamed duplicate files are handled without resetting data', async () => {
  const f = await fixture();
  try {
    await f.attach(f.mac);
    const changes = path.join(f.folder, 'keepad-library', 'changes');
    const [first] = await readdir(changes);
    await cp(path.join(changes, first), path.join(changes, 'provider conflicted copy.json'));
    await f.mac.tick();
    assert.equal(f.mac.status().error, undefined);
    assert.equal(f.mac.status().conflicts.length, 0);
    await writeFile(path.join(changes, 'broken.json'), '{');
    const before = structuredClone(f.a.state);
    await f.mac.tick();
    assert.ok(f.mac.status().error);
    assert.deepEqual(f.a.state, before);
    await rm(path.join(changes, 'broken.json'));
    const marker = path.join(f.folder, 'keepad-library', 'format.json');
    await writeFile(marker, '{"format":"keepad-library","version":99}');
    await f.mac.tick();
    assert.match(f.mac.status().error!, /not supported/);
    assert.deepEqual(f.a.state, before);
  } finally {
    await f.close();
  }
});

test('device destinations work across Mac/Windows without changing shared action data', async () => {
  const f = await fixture();
  try {
    const next = structuredClone(f.a.state),
      button = next.pads[0].buttons[0];
    button.type = 'file';
    button.target = '/Users/sample/report.pdf';
    await f.mac.save(next);
    await f.attach(f.mac);
    await f.attach(f.win);
    const shared = f.b.state.pads[0].buttons[0];
    assert.throws(() => destination(f.b.device, 'everyday', shared, 'win32'), /this computer/);
    await f.win.save(
      { ...f.b.state, revision: f.b.state.revision + 1 },
      { padId: 'everyday', buttonId: shared.id, target: 'C:\\Users\\Sample\\report.pdf' },
    );
    await f.win.tick();
    await f.mac.tick();
    assert.equal(
      destination(f.b.device, 'everyday', shared, 'win32'),
      'C:\\Users\\Sample\\report.pdf',
    );
    assert.equal(f.a.state.pads[0].buttons[0].target, '/Users/sample/report.pdf');
    assert.equal(f.a.device.targets.length, 0);
    const reloaded = new Store(f.b.file, makeDefaultState());
    await reloaded.load();
    assert.equal(reloaded.device.targets.length, 1);
    assert.equal(nativePath('C:\\Data\\report.pdf', 'win32'), true);
    assert.equal(nativePath('\\\\server\\share\\report.pdf', 'win32'), true);
    assert.equal(nativePath('/Users/sample/report.pdf', 'win32'), false);
    assert.equal(nativePath('C:\\Data\\report.pdf', 'darwin'), false);
    assert.equal(nativePath('/Users/sample/report.pdf', 'darwin'), true);
    assert.equal(nativePath('https://example.com', 'win32'), false);
  } finally {
    await f.close();
  }
});

test('joining backs up the old local library and disconnect keeps an independent editable copy', async () => {
  const f = await fixture();
  try {
    await f.attach(f.mac);
    await f.attach(f.win);
    const files = await readdir(path.dirname(f.b.file));
    assert.ok(files.some((name) => name.includes('before-sync')));
    await f.win.disconnect();
    await f.edit(f.win, (s) => {
      s.pads[0].name = 'Local only';
    });
    await f.win.tick();
    await f.mac.tick();
    assert.equal(f.b.device.folder, undefined);
    assert.notEqual(f.a.state.pads[0].name, 'Local only');
  } finally {
    await f.close();
  }
});

test('corrupt local sync metadata recovers separately without resetting valid pads', async () => {
  const f = await fixture();
  try {
    await writeFile(f.a.file, JSON.stringify({ ...f.a.state, device: { version: 99 } }));
    const store = new Store(f.a.file, makeDefaultState());
    await store.load();
    assert.deepEqual(store.state, f.a.state);
    assert.equal(store.device.folder, undefined);
    assert.match(store.warning!, /local pads were kept/);
    assert.ok((await readdir(path.dirname(f.a.file))).some((name) => name.includes('recovery')));
  } finally {
    await f.close();
  }
});

test('modified record contents and missing known heads pause updates without losing local state', async () => {
  const f = await fixture();
  try {
    await f.attach(f.mac);
    const id = f.a.device.heads.find((h) => h.padId === 'everyday')!.ids[0];
    const file = path.join(f.folder, 'keepad-library', 'changes', `${id}.json`);
    const original = await readFile(file, 'utf8');
    const changed = JSON.parse(original);
    changed.body.pad.name = 'Tampered';
    const before = structuredClone(f.a.state);
    await writeFile(file, JSON.stringify(changed));
    await f.mac.tick();
    assert.match(f.mac.status().error!, /integrity check/);
    assert.deepEqual(f.a.state, before);
    await rm(file);
    await f.mac.tick();
    assert.match(f.mac.status().error!, /missing library changes/);
    assert.deepEqual(f.a.state, before);
    await writeFile(file, original);
    await f.mac.tick();
    assert.equal(f.mac.status().error, undefined);
    assert.deepEqual(f.a.state, before);
  } finally {
    await f.close();
  }
});

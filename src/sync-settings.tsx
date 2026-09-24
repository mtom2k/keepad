import { useState } from 'react';
import { Folder, RefreshCw } from 'lucide-react';
import { api, unwrap } from './api';
import { Modal } from './components';
import { actionNames, type Pad } from '../shared/model';
import type { SyncChoice, SyncStatus } from '../shared/sync';

export function SyncSettings({
  status,
  desktop,
  onError,
}: {
  status?: SyncStatus;
  desktop: boolean;
  onError: (message: string) => void;
}) {
  const [choice, setChoice] = useState<SyncChoice | null>(null);
  const [review, setReview] = useState<{ pad: Pad | null } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [busy, setBusy] = useState(false);
  async function perform(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-card">
      <h2>Synchronization</h2>
      <p className="settings-copy">
        {status?.folder
          ? 'Pads are shared. Preferences stay on this device.'
          : 'Local storage · Choose a shared folder to sync pads between computers.'}
      </p>
      {status?.folder && (
        <p className="sync-path" title={status.folder}>
          {status.folder}
        </p>
      )}
      {status?.error && (
        <p className="sync-error" role="status">
          {status.error}
        </p>
      )}
      {status?.folder && (
        <p className="field-hint" role="status">
          {status.pending
            ? `${status.pending} changes waiting to be written.`
            : 'Watching the library folder.'}
          {status.checked ? ` Last checked ${new Date(status.checked).toLocaleTimeString()}.` : ''}
        </p>
      )}
      <div className="backup-actions">
        {!status?.folder ? (
          <button
            className="secondary"
            disabled={!desktop || busy}
            onClick={() =>
              void perform(async () => setChoice(await unwrap(api.chooseSyncFolder())))
            }
          >
            <Folder size={16} /> Choose sync folder…
          </button>
        ) : (
          <>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void perform(() => unwrap(api.refreshSync()))}
            >
              <RefreshCw size={16} /> Check folder
            </button>
            <button className="secondary" disabled={busy} onClick={() => setDisconnecting(true)}>
              Disconnect…
            </button>
          </>
        )}
      </div>
      <p className="field-hint">
        Use the same Dropbox, OneDrive, or other synchronized folder on each computer. A local
        folder alone does not sync. KeePad cannot verify cloud delivery.
      </p>
      {status?.conflicts.map((conflict) => (
        <div className="sync-conflict" key={conflict.padId}>
          <strong>
            Conflicting versions ·{' '}
            {conflict.versions.find((v) => !v.deleted)?.name ?? 'Deleted pad'}
          </strong>
          <p className="field-hint">
            Both edits were preserved. Choose a version or keep each as a separate pad.
          </p>
          {conflict.versions.map((version) => (
            <div className="sync-version" key={version.id}>
              <span>
                {version.deleted ? 'Deleted' : `${version.name} · ${version.buttons} buttons`}
                <small>
                  {version.platform === 'darwin'
                    ? 'Mac'
                    : version.platform === 'win32'
                      ? 'Windows'
                      : 'Linux'}{' '}
                  · {new Date(version.created).toLocaleString()}
                </small>
              </span>
              <button
                className="secondary small"
                disabled={busy}
                onClick={() =>
                  void perform(async () =>
                    setReview({ pad: await unwrap(api.previewSync(conflict.padId, version.id)) }),
                  )
                }
              >
                Review
              </button>
              <button
                className="secondary small"
                disabled={busy}
                onClick={() =>
                  void perform(() =>
                    unwrap(
                      api.resolveSync(
                        conflict.padId,
                        conflict.versions.map((v) => v.id),
                        version.id,
                      ),
                    ),
                  )
                }
              >
                {version.deleted ? 'Keep deletion' : 'Keep this version'}
              </button>
            </div>
          ))}
          <button
            className="secondary small"
            disabled={busy || conflict.versions.filter((v) => !v.deleted).length < 2}
            onClick={() =>
              void perform(() =>
                unwrap(
                  api.resolveSync(
                    conflict.padId,
                    conflict.versions.map((v) => v.id),
                    'both',
                  ),
                ),
              )
            }
          >
            Keep both as pads
          </button>
        </div>
      ))}
      {review && (
        <Modal
          title={review.pad ? `Review ${review.pad.name}` : 'Review deletion'}
          onClose={() => setReview(null)}
        >
          {review.pad ? (
            <>
              <p className="field-hint">
                {review.pad.columns} columns × {review.pad.rows} rows · {review.pad.theme}
              </p>
              <div className="sync-review">
                {review.pad.buttons.map((button) => (
                  <div key={button.id}>
                    <strong>{button.label}</strong>
                    <p>
                      {actionNames[button.type]} · Position {button.slot + 1}
                    </p>
                    <p>{button.target}</p>
                    {button.description && <p>{button.description}</p>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="modal-description">This version deletes the pad.</p>
          )}
          <div className="modal-actions">
            <button className="secondary" onClick={() => setReview(null)}>
              Close review
            </button>
          </div>
        </Modal>
      )}
      {choice && (
        <Modal
          title={choice.existing ? 'Use shared library?' : 'Create shared library?'}
          onClose={() => {
            if (!busy) setChoice(null);
          }}
        >
          <p className="modal-description">
            {choice.existing
              ? `Use the ${choice.pads} pads in this folder? Your current local library will be backed up before switching.`
              : `Share your ${choice.pads} pads through this folder? Button images, file paths, and text snippets will be included.`}{' '}
            Preferences and device destinations stay local.
          </p>
          <p className="sync-path">{choice.folder}</p>
          <p className="field-hint">
            On your other computer, wait for this folder to download, then choose it in KeePad. Keep
            the library available offline.
          </p>
          <div className="modal-actions">
            <button className="secondary" disabled={busy} onClick={() => setChoice(null)}>
              Cancel
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  await unwrap(api.connectSync(choice.token));
                  setChoice(null);
                })
              }
            >
              {choice.existing ? 'Use shared library' : 'Create shared library'}
            </button>
          </div>
        </Modal>
      )}
      {disconnecting && (
        <Modal
          title="Disconnect synchronization?"
          onClose={() => {
            if (!busy) setDisconnecting(false);
          }}
        >
          <p className="modal-description">
            Keep the current pads on this device and stop sharing changes. The shared folder will
            stay intact. A local recovery copy will be saved.
            {status?.pending
              ? ' Changes still waiting will remain in your local library; they may not have reached another device.'
              : ''}
          </p>
          <div className="modal-actions">
            <button className="secondary" disabled={busy} onClick={() => setDisconnecting(false)}>
              Cancel
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  await unwrap(api.disconnectSync());
                  setDisconnecting(false);
                })
              }
            >
              Keep local copy
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

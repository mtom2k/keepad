import { useState } from 'react';
import { FolderSearch } from 'lucide-react';
import { Modal, Tip } from './components';
import { api, unwrap } from './api';
import { actionNames } from '../shared/model';
import {
  destinationMessages,
  type DestinationReport,
  type DestinationIssue,
} from '../shared/destinations';

export function DestinationSettings({
  revision,
  desktop,
  platform,
}: {
  revision: number;
  desktop: boolean;
  platform: string;
}) {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<DestinationReport | null>(null);
  const [checking, setChecking] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const stale = !!report && report.revision !== revision;
  const busy = checking || repairing;
  async function check() {
    setOpen(true);
    setChecking(true);
    setError('');
    setNotice('');
    setReport(null);
    try {
      setReport(await unwrap(api.checkDestinations()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  }
  async function repair(issue: DestinationIssue) {
    if (!report || stale) return;
    setRepairing(true);
    setError('');
    setNotice('');
    try {
      const result = await unwrap(
        api.repairDestination(issue.padId, issue.buttonId, report.revision),
      );
      if (result) {
        setReport({
          ...report,
          revision: result.state.revision,
          available: report.available + 1,
          issues: report.issues.filter(
            (item) => item.padId !== issue.padId || item.buttonId !== issue.buttonId,
          ),
        });
        setNotice(`“${issue.buttonName}” repaired.`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRepairing(false);
    }
  }
  return (
    <section className="settings-card">
      <h2>Destinations</h2>
      <p className="settings-copy">
        Find missing files, folders, and applications across all pads.
      </p>
      <button className="secondary" disabled={!desktop || busy} onClick={() => void check()}>
        <FolderSearch size={16} /> Check destinations
      </button>
      {open && (
        <Modal
          title="Check destinations"
          wide
          onClose={() => {
            if (!repairing) setOpen(false);
          }}
        >
          <p className="field-hint">
            Checks destinations without opening them. Repair updates the button’s destination.
          </p>
          {checking && <p role="status">Checking destinations…</p>}
          {report && (
            <>
              <p role="status">
                {report.total
                  ? `${report.available} of ${report.total} destinations available${report.issues.length ? ` · ${report.issues.length} ${report.issues.length === 1 ? 'needs' : 'need'} attention` : ''}.`
                  : 'No file, folder, or application buttons to check.'}
              </p>
              {stale && (
                <p className="inline-error" role="status">
                  Your pads changed. Check again before repairing.
                </p>
              )}
              <div className="destination-results">
                {report.issues.map((issue) => (
                  <div
                    className="destination-issue"
                    key={JSON.stringify([issue.padId, issue.buttonId])}
                  >
                    <div className="destination-info">
                      <strong>{issue.buttonName}</strong>
                      <p>
                        {issue.padName} · {actionNames[issue.type]}
                      </p>
                      <p className="destination-path">{issue.target}</p>
                      <p>{destinationMessages[issue.status]}</p>
                    </div>
                    <Tip text="Choose a replacement destination for this button.">
                      <button
                        className="secondary small"
                        disabled={busy || stale}
                        aria-label={`Repair ${issue.buttonName} on ${issue.padName}`}
                        onClick={() => void repair(issue)}
                      >
                        Repair…
                      </button>
                    </Tip>
                  </div>
                ))}
              </div>
            </>
          )}
          {report?.issues.some((issue) => issue.status === 'denied') && (
            <p className="field-hint">
              {platform === 'darwin'
                ? 'Check KeePad access in System Settings → Privacy & Security → Files and Folders, then check again.'
                : 'Check the destination’s permissions in File Explorer, then check again.'}
            </p>
          )}
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          <p className="field-hint">
            Availability can change. Network or cloud folders may be offline. This check does not
            verify app launch, shortcut targets, or website links.
          </p>
          <div className="modal-actions">
            <button className="secondary" disabled={busy} onClick={() => void check()}>
              Check again
            </button>
            <button className="secondary" disabled={repairing} onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

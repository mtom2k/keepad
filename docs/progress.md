# Development progress

## Current status

App version and dependency versions are in [generated reference](reference.md). KeePad is a functioning development app, not a signed public release.

| Area | State | Evidence / remaining work |
| --- | --- | --- |
| macOS Apple Silicon | Locally built and exercised | Production build, native desktop suite, and unpacked app launch passed on 2026-09-22 |
| Windows | Implementation and CI configured | Remote run and manual native/installer checks still need evidence; do not infer completion from macOS |
| User data | Local validated JSON and backups | Model/store and native import/export tests passed; no schema migration framework |
| Editing / launcher | Implemented | Steppers, activation, independent preview, center geometry, and focus regressions covered |
| Documentation | Knowledge base added | Instructions, guides, ADRs, generation/link/impact checks, and sample-data screenshot workflow |
| Distribution | Development only | Signing, notarization, clean-machine validation, license choice, and update strategy remain open |
| GitHub | Private repository pushed | [mtom2k/keepad](https://github.com/mtom2k/keepad), branch `main`; first CI run exposed test/check-out issues being corrected |

## Completed milestones

### 2026-09-22 — Initial application

- Built the Electron/React/TypeScript app with tray/menu-bar lifecycle, global shortcut, multiple pads, native path/image dialogs, website/file/folder/application/clipboard actions, six themes, local persistence, and backups.
- Added shared validation, atomic replacement and corrupt-state recovery, sender validation, sandboxed preload, URL/image restrictions, and error feedback.
- Evidence: seven model/store test cases and native Electron integration checks passed locally on macOS; an unpacked app was built and opened. Windows and signed distribution were not verified locally.

### 2026-09-22 — Traditional UI and explicit activation

- Removed promotional copy/cards, added a native editor title bar, shortened settings/dialogs, and exposed conventional toolbar icons.
- Separated selected, active, and previewed pads; added Make Active and ACTIVE badge. Previewing/creating/duplicating no longer changes activation.
- Fixed stale Settings/X focus on launcher reopen while keeping Tab focus visible.
- Evidence: desktop tests cover independent preview, explicit activation, exposed edit/duplicate/delete controls, focus reset, tooltip bounds, clipboard, and restart persistence.

### 2026-09-22 — Layout controls and invocation consistency

- Replaced the layout dropdown with independent Columns/Rows steppers; preserved buttons and schema limits when shrinking.
- Sidebar double-click activates; single-click still edits. Tray/menu and shortcut invocation now share work-area centering.
- Evidence: updated desktop suite, model tests, production build, formatting check, screenshot review, and rebuilt macOS app passed. Real tray mouse clicks and multi-monitor hardware combinations still need manual release coverage.

### 2026-09-22 — Knowledge base and repository onboarding

- Added current architecture, data, UX, testing, release, troubleshooting, and maintenance guides; five ADRs record the rationale behind the implementation.
- Added repository-wide developer/agent instructions and a PR documentation checklist.
- Added generated reference, relative-link/screenshot checks, and source-to-documentation impact rules for CI. Added reproducible native screenshots using temporary sample data.
- Rewrote the GitHub README with emojis, plain-language instructions, and embedded screenshots.
- Validation: production build, all seven model/store tests, native desktop suite, formatting, and documentation checks passed locally on macOS. All three sample-data screenshots were captured from Electron and visually reviewed.
- Initialized Git on `main`, created the private [mtom2k/keepad](https://github.com/mtom2k/keepad) repository, and pushed initial commit `781506e`; no public release or signing is implied.

### 2026-09-22 — First CI feedback

- [Initial CI run](https://github.com/mtom2k/keepad/actions/runs/35793928600) passed documentation validation. Windows stopped at formatting because checkout converted LF to CRLF; macOS built successfully but its native test encountered an empty-MIME clipboard entry.
- Added repository LF rules and skipped empty clipboard entries when constructing the native test's restoration snapshot. These are checkout/test portability fixes; application behavior is unchanged. Follow-up CI will establish cross-platform evidence.
- [Second CI run](https://github.com/mtom2k/keepad/actions/runs/35794108725) cleared those failures, then both runners reached the keyboard-focus assertion. The test now waits for native document focus and queued animation frames before Tab, with focused-control diagnostics; its previous DOM-only readiness check could succeed while the window was still hidden.

## Next work / unresolved decisions

1. Run and inspect Windows CI; then complete manual Windows tray, startup, file/app, permission, and installer checks.
2. Complete manual macOS multi-monitor, scaling, non-QWERTY shortcut, permission, login, and clean-machine checks.
3. Improve platform-specific file-error wording; currently a shared error mentions macOS privacy settings on Windows.
4. Choose licensing, signing/notarization credentials, supported architecture release matrix, and distribution/update strategy with the owner.
5. Design migrations before changing persisted schema version. Image aspect-ratio editing, shell commands, key injection, cloud sync, and plugins are not implemented commitments.

## Handoff rule

Update current status and add a dated evidence-based entry with each relevant change. Link CI/release evidence when available; never convert “configured” to “verified” without a result. Preserve historical records, supersede ADRs for changed decisions, and use [maintenance](maintenance.md) for the required documentation updates.

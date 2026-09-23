# Development progress

## Current status

App version and dependency versions are in [generated reference](reference.md). KeePad is a functioning development app, not a signed public release. The latest feature work adds button context menus and native file binding by drop, based on `ae83b58`. Its source, guides, and native validation are recorded below on 2026-09-23; earlier documentation-audit evidence applies to its named revision.

| Area | State | Evidence / remaining work |
| --- | --- | --- |
| macOS Apple Silicon | Locally built and exercised | Latest production build, native desktop suite, and unsigned unpacked app rebuild/reopen recorded on 2026-09-23 |
| Windows | Implemented; full validation pending | Initial hosted run passed build/model checks but not the complete desktop suite; local native/installer checks remain |
| User data | Local validated JSON and backups | Thirteen model/placement/button/store tests and native import/export checks passed; legacy appearance defaults supported within schema 1; no general migration framework |
| Editing / launcher | Implemented | Button menus, file-drop creation/confirmed replacement, independent appearance, visual positioning, drag/swaps, activation, preview, centering, and focus regressions covered |
| Documentation | Audited against current source | Same-change completion/handoff rules, current guides, eight ADRs, generated reference, five sample-data screenshots, and local checks |
| Distribution | Development only | Signing, notarization, clean-machine validation, license choice, and update strategy remain open |
| GitHub | Private source repository | [mtom2k/keepad](https://github.com/mtom2k/keepad), branch `main`; no CI/CD per owner preference |

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
- Added repository LF rules and skipped empty clipboard entries when constructing the native test's restoration snapshot. These are checkout/test portability fixes; application behavior is unchanged.
- [Second CI run](https://github.com/mtom2k/keepad/actions/runs/35794108725) cleared those failures, then both runners reached the keyboard-focus assertion. The test now waits for native document focus and queued animation frames before Tab, with focused-control diagnostics; its previous DOM-only readiness check could succeed while the window was still hidden.

### 2026-09-22 — Private storage, local validation

- The owner clarified that GitHub should house the code without CI/CD. Removed the Actions workflow and canceled the active run. [ADR 0006](adr/0006-private-source-hosting-with-local-checks.md) records this preference and supersedes the earlier hosted-check requirement.
- Kept local tests, documentation/reference checks, screenshot capture, and same-change documentation responsibilities. Updated contributor, testing, release, and maintenance guidance to match.
- Latest native desktop suite and production build passed locally after the focus-test synchronization change. Hosted onboarding attempts above are historical; future checks are run locally when relevant.

### 2026-09-23 — Visual button positioning

- Replaced the Position dropdown with a miniature pad matching the current grid. It previews icons/images and swaps, supports clicking and arrow/Home/End navigation, and explains destinations in unclipped tooltips. Dialog changes remain drafts until Save.
- Added editor-only drag-and-drop. Empty targets move buttons; occupied targets swap without losing actions. Outside-grid drops cancel; stale/cross-pad/external drags are ignored. Existing IDs, actions, image data, and the persisted schema are unchanged.
- Validation: all nine model/placement tests, the extended native Electron suite, and production build passed locally on macOS. Native checks cover moving, swapping, canceling, keyboard selection, new-button placement, launcher non-draggability, and restart persistence. The 5×4 picker, tooltip bounds, and reachable Save button were also verified at 820×600. Refreshed and reviewed the sample-data dialog screenshot. Windows native behavior remains unverified locally.
- Documentation/impact and formatting checks passed. Rebuilt the unsigned macOS Apple Silicon app and reopened the project copy (`app.keepad.desktop`); no separate installed application was replaced.

### 2026-09-23 — Pad icons and application appearance

- Added None to New/Edit pad icons and removed icon placeholders from pad headings. Renamed the per-pad selector to Pad Theme.
- Added Settings → General → Theme with Light, Dark, and System. App surfaces, dialogs, tooltips, and native appearance follow the preference; pad colors remain independent. System follows live OS color-scheme changes.
- Added a default for older settings files without resetting saved pads. Existing backup import preserves local appearance. [ADR 0007](adr/0007-application-appearance-and-optional-pad-icons.md) records compatibility and downgrade limits.
- Validation: ten model/placement/store tests, production build, and extended native desktop suite passed locally on macOS. Coverage includes legacy-file loading, import preservation, icon-free creation/editing, explicit themes, simulated System changes, and restart persistence. Reviewed Dark Settings and editing dialogs; refreshed sample-data screenshots and generated reference. Windows native behavior and actual OS appearance switching remain manual validation work.
- Formatting and documentation/impact checks passed. Rebuilt and reopened the unsigned macOS Apple Silicon project app; the separate installed copy was not replaced.

### 2026-09-23 — Knowledge-base audit and handoff discipline

- Audited current guides, root instructions/README, the PR template, ADR status/history, generated reference, and screenshot provenance against application source `27117d3`, local tooling, and recorded test outcomes. No application behavior changed.
- Corrected the stale September 22 status date, the three-view screenshot description, and the claim that all path input uses native dialogs. Clarified packaged-versus-installed startup checks, additive schema defaults, downgrade limits, and browser-preview version maintenance.
- Made documentation part of the definition of done for features, fixes, refactors, dependencies/configuration, and newly discovered limitations. Added [handoff](handoff.md), including interrupted-work records, meaningful Git comparison bases, and the distinction between source, built bundles, and a running app.
- Documented the current checker's real limits: new files must be staged for impact review; heading anchors, external URLs, unspecified source paths, and semantic correctness require review. Kept checks local and retained the owner's no-CI/CD decision.
- Existing screenshots still match unchanged application behavior; they were last captured/reviewed for the appearance change. Native tests and packaging were not rerun for this documentation-only audit; their prior September 23 results remain historical evidence.
- Audit validation: `npm run docs:generate` produced no reference changes; `npm run docs:check` passed for all 25 Markdown files, and `git diff --check` passed. The staged documentation-impact comparison uses pre-change revision `27117d3`.

| Audited area | Implementation / evidence consulted | Current guide |
| --- | --- | --- |
| Lifecycle, centering, activation, IPC and native actions | `electron/main.ts`, `electron/preload.cts`, desktop test coverage | [Architecture](architecture.md) |
| State, placement, defaults, import and recovery | `shared/model.ts`, `electron/store.ts`, `src/pad-layout.ts`, model/placement tests | [Data model](data-model.md) |
| Themes, optional icons, editing and tooltips | `src/main.tsx`, `src/components.tsx`, `src/styles.css`, four curated screenshots | [UX](ux.md) |
| Commands, identity and packaging | `package.json`, lockfile, `src/api.ts`, packaging settings | [Reference](reference.md), [releasing](releasing.md) |
| Validation and documentation tooling | Tests, screenshot script, reference generator, link/impact checker | [Testing](testing.md), [maintenance](maintenance.md) |
| Owner decisions and knowledge transfer | AGENTS, contributor guide, ADRs 0001–0007, no-CI/CD decision | [Handoff](handoff.md), [ADR index](adr/README.md) |

### 2026-09-23 — Button menus and dropped file bindings

- Added right-click menus in the editor and launcher with Edit, Duplicate, Move to another pad, and confirmed Delete. Menus support keyboard navigation and stay within window bounds. Launcher Edit opens the exact button in the editor; Escape dismisses menus/dialogs before hiding the pad. Copy/move preserve action data and activation, reject full destinations, and resolve destination ID collisions.
- Added editor-only single-file drops through Electron's native File path bridge and main-process metadata validation. Empty positions become file/folder/app buttons. Occupied positions require confirmation and preserve existing labels, images, hints, colors, IDs, and position. Drops never execute actions; multiple files, invalid native paths, and stale replacements are rejected. Schema version 1 and existing backups remain compatible. [ADR 0008](adr/0008-button-menus-and-native-file-drops.md) records the boundary and scope.
- Validation: all 13 model/store/placement/button tests, production build, and extended native Electron suite passed locally on macOS Apple Silicon. Native coverage includes menus and keyboard/bounds behavior, duplicate/move/delete, launcher Edit routing, real filesystem-backed File objects, empty/occupied drops, confirmation/cancel, persistence, forged/multiple files, stale replacement rejection, and no action execution. Early test attempts exposed an active-badge locator mismatch and focus interference between concurrent native suites; corrected the locator and documented sequential native runs. Subsequent complete runs passed.
- Verified and visually reviewed the new menu and replacement dialog in Dark mode at the minimum 820×600 editor size. Rebuilt and reopened the unsigned macOS Apple Silicon project application (`app.keepad.desktop`); no separate installed copy was replaced. Formatting, documentation, and source-impact checks passed against starting revision `ae83b58`.
- Updated README, architecture, data/UX/testing/troubleshooting guides, ADR index, and screenshot provenance in the same change. Regenerated reference (no public choices changed), captured all five sample views, and reviewed them. Windows native behavior, actual Finder/File Explorer drag gestures, and OS permission prompts remain manual verification work; synthetic drag events do not prove those OS integrations.

## Next work / unresolved decisions

1. Run local Windows tests and complete manual Windows tray, startup, file/app, permission, and installer checks when preparing that platform for release.
2. Complete manual macOS multi-monitor, scaling, non-QWERTY shortcut, permission, login, and clean-machine checks.
3. Improve platform-specific file-error wording; currently a shared error mentions macOS privacy settings on Windows.
4. Choose licensing, signing/notarization credentials, supported architecture release matrix, and distribution/update strategy with the owner.
5. Design migrations before changing persisted schema version. Image aspect-ratio editing, shell commands, key injection, cloud sync, and plugins are not implemented commitments.

## Handoff rule

Update current status and add a dated evidence-based entry with each relevant change. Record the tested revision, platform, and local checks; never convert “configured” to “verified” without a result. Preserve historical records, supersede ADRs for changed decisions, and use [maintenance](maintenance.md) and [handoff](handoff.md) before declaring work complete. Historical CI links above describe onboarding only; GitHub automation remains disabled by project policy.

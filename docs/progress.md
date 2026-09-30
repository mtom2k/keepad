# Development progress

## Current status

App version and dependency versions are in [generated reference](reference.md). KeePad is a functioning development app, not a signed public release. Version 0.3.0 adds a destination-free Sleep computer action; Lock is excluded on both platforms at the owner's request. Windows automated validation, unsigned packaging, package smoke checks, documentation review, source push, and the [unpublished 0.3.0 draft release](https://github.com/mtom2k/keepad/releases/tag/untagged-c6b86a318f274f66ae4e) completed on 2026-09-30. Pads and preferences are local-only. See the latest dated entry for validation and remaining platform limits.

| Area | State | Evidence / remaining work |
| --- | --- | --- |
| macOS Apple Silicon | Locally built and exercised through 2026-09-24 | 2026-09-25 recorder/menu/tray changes still need a macOS desktop-suite rerun |
| Windows 11 x64 | Natively tested; unsigned installer and portable built and exercised | Unit + full desktop suites pass; installed-build checks by hand on 2026-09-25; startup setting follows Task Manager/Run state (packaged check). Open: tray right-click menu and Explorer drags under automation, real sign-in startup, multi-monitor/DPI, IME, UNC, signing, ARM |
| User data | Local validated JSON and backups | Local store/migration tests and native import/export checks; schema 1 with legacy appearance defaults and one-time device-envelope conversion; no general migration framework |
| Storage scope | Local-only; synchronization removed | Engine, IPC, UI, polling, conflict handling and runtime overrides deleted; full recovery copy before converting legacy destinations; former external folders untouched |
| Destination repair | Implemented and exercised on macOS and Windows | Explicit metadata/access checks, local-only replacements, bounded slow probes, cancellation and stale-write protection; network filesystem behavior unverified |
| Editing / launcher | Implemented | Cross-pad name/description search, immediate typing on summon, button menus, file-drop creation/confirmed replacement, independent appearance, visual positioning, drag/swaps, activation, preview, centering, keyboard focus, and stale pointer-hover reset covered |
| Sleep action | Implemented; Windows automated checks pass | Fixed Windows PowerShell/.NET and macOS pmset dispatch, no destination or keyboard injection; unit, full Windows desktop, and package smoke tests pass. Physical sleep/wake and native Mac execution remain unverified. Lock excluded |
| Documentation | Updated for 0.3.0 on 2026-09-30 | Current guides reconciled with Sleep, recovery/downgrade behavior, package testing and platform limits; fifteen ADRs, generated reference, and eight regenerated/reviewed Windows screenshots. Local documentation checks are required before each push |
| Distribution | Development only; unsigned 0.3.0 draft uploaded | Windows x64 Setup and Portable executables plus SHA256SUMS are attached to the unpublished draft pinned to `887189a`; GitHub digests match local builds. Signing, notarization, clean-machine validation, license choice, and update strategy remain open |
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

### 2026-09-23 — Global launcher search

- Added a compact launcher search field, focused and cleared on each summon/preview. Names and descriptions (Hover hint) match across all pads, ignoring case/accents and requiring all query terms. Exact names/prefixes rank ahead of other name matches and description matches. Source pad names distinguish duplicate buttons; running a result does not change activation.
- Blank queries keep the normal pad. Results support mouse execution, Up/Down and Enter, and source-aware context menus. Escape dismisses menus/dialogs, clears a query, then hides. Composition keys do not execute actions. Keep-open mode retains a query after execution and native refocus; explicit summon resets it and dismisses stale launcher confirmations. Main emits the summon notification explicitly rather than on every focus event. [ADR 0009](adr/0009-global-launcher-search.md) supersedes the older root-focus decision; schema, action validation, and persistence remain unchanged.
- Validation: 15 unit tests passed locally, including ranking, duplicate identities, normalization, all-term matching, excluded targets, and immutability. Native macOS suite and production build cover immediate typing, cross-pad execution, unchanged activation, query reset, keyboard/context-menu routing, empty-result behavior, synthetic composition keys, mouse execution, keep-open/refocus query preservation, and stale-dialog dismissal. Fixed a pending-dialog focus race by coordinating modal removal and search focus in the same renderer commit. An initial test incorrectly assumed hidden Electron documents lose DOM focus; corrected it to inspect native window visibility. Real Windows, tray/shortcut gestures, screen readers, and real IME input remain manual release checks.
- Regenerated six sample-data screenshot views and reviewed the updated launcher/search captures; generated reference remained unchanged. Formatting, documentation/impact checks against starting revision `abc4ec7`, and the full desktop suite passed. Rebuilt and reopened the unsigned macOS Apple Silicon project bundle (`app.keepad.desktop`); no separate installed copy was replaced.
- Updated current README, architecture, UX/data/testing/troubleshooting, contributor guidance, ADR index, and screenshot provenance together. Search scans only saved names/descriptions: file contents, destinations, clipboard payloads, pad names, and fuzzy matching are outside scope. No new dependency, permission, network service, or stored search history was added.

### 2026-09-24 — Optional shared-folder synchronization

- Added opt-in synchronization through a user-selected directory with a native picker, confirmation, backup-before-switch, local folder status, immediate/manual checks, and disconnect retaining the local library. Local-only remains the default. The provider/shared filesystem transports files; KeePad does not authenticate to Dropbox/OneDrive or claim cloud delivery.
- Implemented a platform-neutral immutable change history with hashes, per-pad causal parents, explicit deletion records, strict validation/resource limits, and a durable outbox saved atomically with local state. Different pads combine; concurrent same-pad edits/deletions are preserved for review or keep-both resolution. Local settings and active selection never enter the protocol. Incomplete/invalid history retains the local cache rather than resetting it.
- Added action-bound This device destinations for files/folders/apps, allowing Mac and Windows to use different real paths. A footer link surfaces paused synchronization/conflicts, and pad deletion explains its shared scope. Incoming state invalidates stale editor saves; removal closes the corresponding draft. File-open permission errors now use platform-specific guidance. [ADR 0010](adr/0010-optional-folder-synchronization.md) records format compatibility, recovery, and tradeoffs; [the sync guide](synchronization.md) covers setup and limitations.
- Validation: all 24 unit tests and the full native macOS desktop suite passed. Sync fixtures cover simulated Mac/Windows convergence, conflicts, tombstones, offline restart, delayed/missing history, record integrity, provider-duplicate/invalid files, destination isolation, and recovery. Native checks cover opt-in/cancel, incoming UI updates, local destination dispatch, stale-draft rejection, blocked conflict execution, review/keep-both, and disconnect. An earlier full-suite attempt timed out in an existing position-picker keyboard check; failure screenshot/dialog diagnostics were added, and the subsequent complete suite passed.
- Refreshed and reviewed seven sample-data documentation screenshots, including device-specific destinations, and inspected conflict controls/review at the minimum editor size. Production and unsigned Mac Apple Silicon/Windows x64 unpacked builds passed; Windows executable resource editing/signing was skipped in the Mac-hosted build. A successful cross-build does not verify native Windows or actual Dropbox/OneDrive delivery; both remain manual release checks.
- Rebuilt and reopened the unsigned macOS project bundle (`app.keepad.desktop`), leaving the separate installed application unchanged. Formatting, generated-reference, all 29 Markdown documents, and source-impact checks passed against the refreshed `origin/main`/starting revision `cde727e`. GitHub remains private source storage with no CI/CD.

### 2026-09-24 — Clear retained launcher hover on summon

- The owner’s screenshot shows a highlighted Settings control while search has keyboard focus. Reproduced cached `:hover` on an already-visible summon; on this host the hidden-window variant cleared naturally. Search focus alone did not remove the hover background. The shared summon path now sends a window-local pointer-leave event after show/focus, clearing hover/tooltips without moving the system cursor or suppressing keyboard focus. Normal pointer movement restores hover. All launcher entry points use this same path; synchronization behavior is unchanged.
- Added a native regression for Settings/Hide hover reset, Settings tooltip dismissal, actual control clicks followed by close/reopen, immediate search typing, and visible Tab focus. It failed against the pre-fix build as expected. During test development, corrected an assumption that Hide also has a tooltip and allowed native show/focus events to settle before pointer assertions. The complete native desktop suite then passed on macOS Apple Silicon.
- Production build, formatting, and documentation checks passed. Regenerated all seven sample screenshots; inspected the hover-reset capture and changed Settings image. The other documentation images remain byte-identical, preserving their prior visual review. No schema/default/package changes require a new reference or ADR; this restores the established summon behavior. Actual tray gestures and native Windows input remain manual validation gaps.
- Unsigned Mac Apple Silicon and Windows x64 unpacked packages rebuilt successfully (Windows executable resource editing/signing skipped). Reopened the verified project macOS bundle, leaving other installed copies untouched. Source-impact comparison uses starting revision `36c488a`; the private main-branch commit carries implementation, regression, and guides together.

### 2026-09-24 — Destination checking and repair

- Starting revision `85d147c`, initially clean main branch. Added explicit checks across saved file/folder/application buttons and revision-guarded native-picker repairs through existing device overrides. URLs/text are excluded; no actions execute. Shared definitions/activation/preferences remain unchanged.
- Production build, all 27 unit tests, and the full native desktop suite pass locally on macOS. The checks include temporary missing/wrong-type/denied/foreign paths, local override matching, exclusions, scan immutability, slow-probe timeout/deduplication/concurrency recovery, canceled/rejected/repaired selections, unchanged shared targets and activation, stale reports/picker races, and sync-conflict blocking. The targeted native repair suite also passed minimum-size tooltip bounds and stale-picker checks. Guides and ADR 0011 document boundaries and cross-platform limitations. No schema/dependency change.
- Regenerated seven sample-data screenshots; reviewed the new checker at normal/minimum size and updated Settings view. The other six documentation views are unchanged. Regenerated reference (no changes), and formatting/documentation checks passed. Updated README, architecture/data/UX/testing/troubleshooting/sync guides, contributor rules, and ADR index.
- Unsigned Mac Apple Silicon and Windows x64 unpacked packages built successfully (Windows executable resource editing/signing skipped). Native Windows, live network/provider behavior, OS permission prompts, and actual app launches remain unverified; an available path is not a launch guarantee.
- Reopened the verified project macOS bundle (`app.keepad.desktop`), leaving other installed copies untouched. Documentation/source-impact review uses starting revision `85d147c` and the refreshed remote base. Code, tests, screenshots, and guides are delivered together to private `main`; no CI/CD was added.


### 2026-09-24 — Local-only storage; synchronization removed

- Owner requested complete removal of synchronization. Deleted the engine, protocol contracts, polling, folder/conflict IPC and UI, runtime device overrides, and their obsolete tests. Pads, preferences, actions, and destination repairs now use the ordinary local state store. No provider folders are watched or updated.
- Added a one-time compatibility reader: copy the complete old profile, preserve cached pads/settings and applicable effective destinations, validate, increment revision, and atomically write plain state. Stale overrides are ignored. Invalid conversion metadata, failed backup, or failed writes stop without resetting valid pads. Remote-only versions are not imported; old shared folders remain untouched.
- ADR 0012 supersedes synchronization and the override/conflict portions of ADR 0011. Updated current guides, README, contributor rules, recovery instructions, and generated reference. Historical ADRs and milestone results remain explicitly historical. Electron builds now clean generated output so deleted modules cannot remain packaged.
- Validation: production build, all 24 unit tests (including six migration cases), and the native Electron regression suite passed on macOS Apple Silicon. Repair checks cover cancellation, wrong-type rejection, ordinary saved targets, no execution, stale picker/report protection, tooltip bounds, and no sync bridge methods/device envelope. Migration fixtures cover Mac/Windows paths and recovery failures on the host filesystem.
- Regenerated and reviewed all seven sample screenshots, including the checker at minimum window size; removed the obsolete device-destination image. Unsigned macOS ARM64 and Windows x64 unpacked builds passed (Windows resource editing/signing disabled). Inspected both app archives to confirm deleted sync modules and IPC are absent. Rebuilt/reopened the project `release/mac-arm64/KeePad.app` (`app.keepad.desktop`); no unrelated installed copy was replaced.
- Handoff: delivered in `8474c36`, based on `493dc2d`. Formatting, documentation/reference/link checks and the staged source-impact comparison against that base passed. Delivery uses a direct commit/push to private `main`; GitHub remains storage-only. Native Windows, real permission prompts/network filesystems, signing, installation and actual tray clicks remain unverified. No further local-only feature work is planned in this change.

### 2026-09-25 — First native Windows validation, fixes, and Windows packages

- Starting revision `8474c36`, clean `main`. This is the first run on a Windows host: Windows 11 Pro 10.0.26200 x64, Node 24.17, one 2560×1440 display. Before this change, the unmodified code passed the build, formatting, docs checks and the full native desktop suite. `npm test` failed one case because the destinations test probed a Windows temporary path with the darwin rules.
- Built and installed the unmodified app (NSIS, silent per-user) and drove it by hand with desktop automation. That confirmed or found:
  - tray clicks re-summoned instead of dismissing (blur-hide then click);
  - a visible "Edit" menu bar in the editor;
  - no taskbar button, so an editor covered by another window was lost;
  - portable builds run from a temporary extraction folder, which launch at login would have registered;
  - installing to a folder containing `[ ]` (or similar) made every IPC request fail with "Request rejected.", reproduced with a copied `win-unpacked` build.
  Code review also found shortcut-recorder modifier mapping errors on both platforms and missing locked-file handling for atomic saves on Windows.
- Fixes ([ADR 0013](adr/0013-windows-platform-integration.md)):
  - path-based packaged-page sender check (`electron/paths.ts`);
  - tray click within 600 ms of a blur-hide dismisses;
  - Edit role menu only on macOS;
  - taskbar button for the visible Windows editor, with AppUserModelID `app.keepad.desktop`;
  - platform-correct shortcut recording (`CommandOrControl` plus `Control`/`Super`) and labels (`Ctrl Shift`/`Win` on Windows);
  - login item at the portable executable, keeping the legacy Run value name `electron.app.KeePad`;
  - bounded retry of `EPERM`/`EACCES`/`EBUSY` on the final rename.
  Added a `portable` Windows target and named artifacts `KeePad-Setup-<version>.exe` and `KeePad-Portable-<version>.exe`. No schema, IPC surface, dependency, or permission change.
- Tests:
  - new [path-matching](../tests/paths.test.ts) and [replacement-retry](../tests/store-replace.test.ts) unit tests; the latter includes a real PowerShell-held lock and first proves a plain rename fails under it;
  - the destinations test now uses host-native `.exe`/`.lnk` cases on Windows;
  - the desktop suite asserts recorder output (including the Windows key) and that only macOS has an application menu.
- Results on Windows after the fixes:
  - `npm test`: 26 passed, 1 POSIX-only skip;
  - full `npm run test:desktop` passed;
  - `npm run build` and `format:check` passed.
  macOS was not rerun for this change; the recorder change affects macOS (Control now records as `Control`, not Command). Its desktop assertions for macOS are written but unexecuted.
- Packaging on Windows: `npm run package:win` produced both artifacts with stamped version resources (product/company "KeePad", 0.1.0.0). All executables report `NotSigned`. SHA-256 of the final build:
  - Setup `264D6F63EC6E2BFEF88E8845F504E59A29233FDCD82CEACEA123480CCE3E50DA`
  - Portable `3EFBAD5D897250AC8DE8BBDAAAB0E5CAB01A6702065D7A341D0D5E32C9FE43F3`

  These hashes identify the tested local build only.
- Installed-build checks, done by hand on the fixed per-user install unless noted (sample data only):
  - install, upgrade over an existing install with pads kept, silent uninstall/reinstall (the uninstaller removes the program, shortcuts and Apps & features entry and keeps `%APPDATA%\KeePad`);
  - tray summon, dismiss, and summon again; the icon appears in the Windows 11 overflow;
  - global shortcut over Notepad with immediate search typing; second launch reusing the running instance and taking focus;
  - editor taskbar recovery; no menu bar; Ctrl+A/C/X/V/Z in text fields;
  - double-click activation, Preview versus normal summon, cross-pad search with ↓/Enter;
  - actions:
    - copy text (clipboard checked, focus returned to Notepad for the paste);
    - open a file (path with a space) and a folder;
    - `.exe` and `.lnk` applications;
    - a website in the default browser;
    - missing, other-OS and wrong-type errors with Windows wording;
  - destination check (5 of 8 → 7 of 8) with native-picker file and folder repairs and picker cancel;
  - real save/open dialogs for export and additive import;
  - Browse with the Applications (*.exe; *.lnk) filter from Program Files; native image picker;
  - OS mouse drag move/swap in the editor; context-menu Duplicate and Move to another pad;
  - shortcut recording Ctrl+Alt+K (old shortcut released, new one summons) and back;
  - launch at login:
    - installed build, before the fixes: Run value checked by hand, pointing at the installed exe;
    - fixed build (portable wrapper simulated, and a normal packaged run): driven with Playwright, correct value written and removed.
  The portable exe was launched: it extracted to `%TEMP%`, used the shared profile, and responded to the shortcut. Its screen content was masked from the automation tool.
- A washed-out editor seen in live Dark-mode captures was a screen-capture artifact; a Playwright capture of Dark app + Paper pad renders correctly.
- Not verified:
  - the tray right-click menu and dragging from File Explorer onto the editor (the automation tool is restricted to click-only in Explorer);
  - Escape handling under automation (reserved by the tool; still covered by the desktop suite);
  - a real sign-out/sign-in startup; live OS appearance switching; multi-monitor/mixed DPI; IME; screen readers;
  - UNC/network drives; SmartScreen and signing; Windows on ARM.
- Documentation: ADR 0013; architecture, data model, UX, testing, releasing, troubleshooting, maintenance, README, and this entry. Moved the misplaced 2026-09-24 entry above the next-work section, unchanged. Replaced the stale synchronization item in next work. The reference generator now lists electron-builder targets and artifact names, so the package change appears in the regenerated [reference](reference.md).
- Screenshots are unchanged: macOS labels and layout are unaffected, and regenerating on this Windows host would change host-dependent content (see [testing](testing.md)).
- Handoff: delivered as a direct commit on private `main` after `8474c36`, with the source-impact comparison against that base passing. The installed test copy remains on the validation machine: `%LOCALAPPDATA%\Programs\KeePad`, identity `app.keepad.desktop`. Its sample-data profile was set aside as `keepad.json.windows-test-2026-09-25`, so the next launch is a first run.

### 2026-09-25 — Version 0.2.0

- Starting revision `6ff7188`. Bumped the app from 0.1.0 to 0.2.0: a minor bump for new Windows packaging and behavior changes, with no schema change (schema version remains 1). Updated `package.json`, `package-lock.json`, the browser-preview literal in `src/api.ts`, the generated reference, and the README screenshot note. No Git tag or GitHub release was created; builds remain unsigned development builds.
- Regenerated all seven screenshots on Windows 11, because the Settings footer showed 0.1.0. The capture script now fixes the editor content area at 980×700: a first Windows capture at the default window size clipped the version footer under a scrollbar. Reviewed every image for sample-only data, clipping, and version text. Updated [screenshot provenance](screenshots/README.md) and [testing](testing.md).
- Built `KeePad-Setup-0.2.0.exe` and `KeePad-Portable-0.2.0.exe` with `npm run package:win` on the same Windows 11 x64 host. Both have stamped version resources (0.2.0.0) and report `NotSigned`. SHA-256 for this local build:
  - Setup `7AB3EE8AA13F0742343429590F3EF07A4D435E99EB67A236686FDEDD8BFFF787`
  - Portable `4B9085E01FF13E1C3760EDBA5B95740F738753A2A3FBC4B883A0CF31A7A1D641`
- Silent upgrade of the installed copy to 0.2.0 succeeded; Apps & features shows "KeePad 0.2.0". The installed sample-data profile was renamed to `keepad.json.windows-test-2026-09-25`, so the next launch is a genuine first run.
- Playwright smoke tests used throwaway `--user-data-dir` profiles. The installed build reported 0.2.0, packaged, shortcut registered, no application menu, and Settings footer "Version 0.2.0". The portable exe ran from `%TEMP%` at version 0.2.0.0, honored `--user-data-dir`, and left the real profile untouched.
- Build, 26 unit tests, and formatting pass. Documentation and source-impact checks pass against `6ff7188`. The full desktop suite last passed on the identical application source in `6ff7188`; this change only alters version literals and the screenshot script.
- Handoff: delivered as a direct commit on private `main` and pushed with `6ff7188`.

### 2026-09-25 — Windows startup setting follows the OS

- Starting revision `b05aed7` (0.2.0). Fixed the drift noted in handoff: on Windows, disabling KeePad in Task Manager or Settings, removing its Run entry, or another KeePad copy taking the entry left "Start with your computer" checked. Packaged Windows builds now reconcile `settings.launchAtLogin` with `getLoginItemSettings().executableWillLaunchAtLogin` (portable builds query their stable path). This happens at startup and on editor focus, as a serialized, revisioned save. Checking the box re-approves a disabled entry. macOS and development runs are unchanged. [ADR 0014](adr/0014-windows-startup-setting-follows-os.md) records the decision and its limits.
- Added the packaged [login-item check](../tests/login-item-windows.mjs). It uses a temporary profile, simulates Task Manager's disable flag, and covers enable, disable reconciliation, re-enable, removal at the next start, and adoption. It refuses to run beside a real startup entry and cleans up after itself. It timed out on a build without the fix and passed with it, on Windows 11 x64 using `release/win-unpacked`. The registry was checked clean afterwards.
- Found while building that check: Playwright's `waitForFunction` does not re-check async predicates. `async () => false` resolved after one evaluation in an Electron check. The new check and the shortcut-recorder wait added earlier today now poll from Node. The older desktop-suite waits using the async form were replaced in the next entry.
- Validation on Windows: build, 26 unit tests, formatting, the full `npm run test:desktop` (no regressions), and the packaged login-item check passed. Not verified: a real Task Manager toggle by hand (simulated through the same registry flag), per-machine (HKLM) entries, and sign-in startup. macOS has no equivalent reconciliation yet.
- Documentation: ADR 0014 and index; architecture, data model, UX, testing, releasing, troubleshooting, and this entry. No package, reference, or screenshot change: the Settings page looks the same, and version 0.2.0 and its installers are unchanged, so they do not include this fix.

### 2026-09-25 — Desktop-suite waits that actually wait

- Starting revision `3786fb3`. Replaced every saved-state `waitForFunction(async …)` with the shared Node-side `waitForSaved` helper ([saved-state.mjs](../tests/saved-state.mjs)). That covers slot moves, drag placement and theme saves in [desktop.mjs](../tests/desktop.mjs), button counts and dropped-destination replacement in [button-interactions.mjs](../tests/button-interactions.mjs), and cancelled repair in [destinations-desktop.mjs](../tests/destinations-desktop.mjs). The shortcut-recorder wait and the [login-item check](../tests/login-item-windows.mjs) now use the same helper. The remaining `waitForFunction` calls are synchronous DOM conditions.
- Before this change those waits were single evaluations: `async () => false` resolved after about 39 ms. An Electron check showed that the helper times out on a never-true condition (after 1.5 s) and waits for a save made 700 ms later (observed after 708 ms).
- Validation on Windows 11 x64: build, 26 unit tests, formatting, the full `npm run test:desktop`, and the packaged login-item check passed with real waits. No application behavior changed; tests and documentation only.

### 2026-09-25 — Version 0.2.1 and draft GitHub release

- Starting revision `7aa664b`. Bumped 0.2.0 → 0.2.1 as a patch release for the startup-setting fix ([ADR 0014](adr/0014-windows-startup-setting-follows-os.md)) and the test-wait fix. There is no schema change. Updated `package.json`, `package-lock.json`, the browser-preview literal in `src/api.ts`, and the generated reference. Recaptured the two screenshots that show the Settings footer; the other five are byte-identical.
- Built on Windows 11 x64 with `npm run package:win`. Both artifacts have version resources 0.2.1.0 and report `NotSigned`. SHA-256:
  - `KeePad-Setup-0.2.1.exe` `F7B289B06AE1F4406F74C82893672E26F851A22CAA8ACDEDE5624CC35046197C`
  - `KeePad-Portable-0.2.1.exe` `99C5E68519FBB2DC2D105DB50B64824B62F227ED37BC29F5D5136332A7F4ADEE`
- Checks on these packages:
  - the packaged login-item check passed;
  - smoke tests with throwaway profiles: `win-unpacked` and the silently upgraded installed copy reported 0.2.1, packaged, shortcut registered, no application menu, and footer "Version 0.2.1"; the portable exe ran as 0.2.1.0 from `%TEMP%` with its own `--user-data-dir`;
  - the real, freshly reset profile and the Run key were untouched.
  Application source matches `7aa664b`, where the build, 26 unit tests, and the full desktop suite passed.
- Added [draft-release instructions](releasing.md) and a README pointer. After the release commit was pushed, created the **draft** GitHub release `v0.2.1` targeting it, with both executables and `SHA256SUMS.txt`. It is unpublished, so GitHub has created no tag yet and only collaborators can see it. Publishing, signing, and licensing remain owner decisions.
- macOS was not built or rerun for 0.2.1, and the draft contains no Mac artifacts. The open items in next work still apply.

### 2026-09-28 — Documentation and GitHub audit

- The local checkout began clean at `8474c36`. Fetched GitHub, found five newer commits, and fast-forwarded to `5db8d54` (0.2.1) before auditing. Reviewed all 33 Markdown files, the fourteen ADRs and template, contributor/PR instructions, current implementation and relevant test coverage, package/lockfile/reference inputs, screenshot tooling, and recorded validation. No application or test code changed.
- Confirmed sync removal was already documented in the same commit as the code (`8474c36`): local-only storage, recovery conversion, ordinary destination repair, removed setup UI, and superseding ADR 0012. Retained historical sync records rather than presenting them as current functionality. Clarified that `syncLoginItem` only reconciles the local Windows startup setting.
- Corrected ADR 0004's own status to identify its superseded focus decision, matching the index. Updated stale broad Windows-unverified wording in the test guide to distinguish recorded native/installed checks from remaining manual gaps. Aligned contributor rules and the release checklist with the visible Windows editor taskbar button. Clarified the README's Mac validation date and unsigned Windows draft availability.
- Added the recent user-facing knowledge: the successful local-only notice is session-only, fresh profiles do not show it, upgrades can show it even if sync was never enabled, and Quit/reopen clears it. Documented Device 1 → Device 2 export/import, all-pad export scope, additive copies on repeated import, retained destination-device preferences, missing file/app contents, and path repair. Explained that the Windows portable executable shares the ordinary local profile and does not carry pads beside itself.
- Maintenance/handoff guidance now explicitly checks remote history before whole-project audits and checks removals across current instructions, screenshots, roadmap and ADR statuses. Documentation remains a same-change responsibility for developers and agents, backed by local checks; no unattended maintenance or GitHub CI/CD was added.
- GitHub read-only verification: `mtom2k/keepad` is private with default branch `main`; the workflows API reports zero workflows. Draft `v0.2.1` still targets `5db8d54`, with the Setup and Portable executables and `SHA256SUMS.txt`. GitHub-reported executable digests match the September 25 values above. The draft remains unpublished; this audit did not change its assets, publish it, or create a release/tag.
- Validation: `npm run docs:generate` produced no reference diff, `npm run docs:check` passed for 33 Markdown files, and `git diff --check` passed. Reviewed all seven existing Windows sample screenshots, including the 0.2.1 footers and absence of sync controls; no recapture needed because the UI is unchanged. The staged source-impact comparison against the audited baseline `5db8d54` also passed.
- Handoff: documentation-only follow-up to private `main`. No native suites, builds, packaging, or application restarts were performed; September 24/25 native results remain evidence for their recorded revisions. The pending Mac rerun and manual platform/distribution gaps below remain open, rather than being marked verified by this audit.

### 2026-09-27 to 2026-09-30 — Sleep action and version 0.3.0

- Started from revision `5db8d54` on private `main`. On 2026-09-30 the local work was preserved, `main` was fast-forwarded to the documentation audit at `c381a31`, and the Sleep changes were reapplied. Unrelated `.claude/` files remain excluded from this change. The owner narrowed Sleep + Lock to Sleep only; Lock is absent on both platforms.
- Added validated, destination-free Sleep, the moon icon, fixed per-platform dispatch, repeated-request rejection, and native failure feedback. No user command field, keyboard injection, Accessibility/Automation request, dependency, sync change, or schema-number change. [ADR 0015](adr/0015-sleep-action.md) records the boundary and downgrade plan.
- The first save introducing Sleep or moon values into an existing old-compatible library preserves exact prior bytes in a unique `before-system-actions` recovery copy. Backup/write failures preserve prior pads; old files load unchanged; imports remain additive. Older builds cannot parse these new enum values.
- Updated README, architecture, data model, UX, testing, release/troubleshooting guidance, ADR index, screenshot provenance, and version literals to 0.3.0. Audited current Markdown guides and historical ADRs; corrected the manual checklist's stale Windows editor taskbar rule. Historical validation entries remain history.
- Validation on Windows 11 x64, rerun 2026-09-30: production build, complete `npm run test:desktop`, all 32 applicable unit tests (one POSIX-only case skipped), and formatting passed. The Windows sleep script parsed and its .NET method resolved without invoking sleep. Sleep desktop coverage includes save without execution, preview mouse dispatch, cross-pad keyboard search, unchanged activation, rejected target payloads, and error feedback. Earlier attempts exposed an installed-copy shortcut conflict and Playwright's dynamic-import restriction; the test loader was corrected and the verified installed process released the shortcut during tests.
- On 2026-09-30, `npm run package:win` produced fresh unsigned x64 artifacts with version resources 0.3.0. The unpacked package and portable wrapper passed their isolated-profile smoke tests, covering packaged identity, shortcut registration, Sleep save, recovery copy/persistence, version footer, and stubbed dispatch where applicable. No hardware Sleep ran, the ordinary profile/startup setting was not used, and the installed 0.2.1 copy was restarted afterward. SHA-256:
  - `KeePad-Setup-0.3.0.exe` `27842F23A196B5AE6768083F398234FC443D25B7869A8DE753DA199392B60321`
  - `KeePad-Portable-0.3.0.exe` `3B6627AD56BA788A405B5D7369766DE321B8EBBA763EF2BFBD12D11B9B049F94`
- Not verified: actual hardware sleep/wake, native macOS execution, policy-denied Windows execution, or post-wake launcher behavior. Automated tests stub Sleep and never suspend the host. Existing signing, clean-machine, tray, input, network, and architecture limits still apply.
- Regenerated the reference and all eight sample screenshots on 2026-09-30 and visually reviewed every image; also reviewed the packaged Sleep editor in Dark mode at the minimum window size. Rechecked both package smoke tests, version resources and unsigned signatures. The packaged archive's renderer, main-process and asset bytes match the current build. Restored the existing installed 0.2.1 copy; it was not upgraded.
- Delivery handoff: source changes are based on `c381a31`; both `npm run docs:check` and the staged documentation-impact comparison against that baseline passed for 34 Markdown files, as did staged diff whitespace checks. Committed and pushed the implementation, tests and documentation as [`887189a`](https://github.com/mtom2k/keepad/commit/887189acf45a29d8d08e5a40ad8c4b9afc833d28). Created the [unpublished `v0.3.0` draft](https://github.com/mtom2k/keepad/releases/tag/untagged-c6b86a318f274f66ae4e) pinned to that full revision, with Setup, Portable and SHA256SUMS. Verified the draft flag, target revision, uploaded asset sizes and matching GitHub executable digests. GitHub still reports zero workflows. This documentation-only follow-up records delivery; no application code or packaged bytes changed. Requested development delivery is complete; hardware/manual platform checks remain disclosed limitations, not completed tests.

## Next work / unresolved decisions

1. Rerun `npm run test:desktop` on macOS for the recorder and application-menu assertions from 2026-09-25, and review macOS tray-click behavior with the new blur-toggle rule.
2. Finish Windows release checks by hand: tray right-click menu items, Explorer drag onto editor cells, real sign-in startup, multi-monitor/mixed DPI, IME, UNC/network paths, and signing/SmartScreen.
3. Decide whether macOS should mirror Login Items state (including approval pending) like Windows; test on a Mac first.
4. Complete manual macOS multi-monitor, scaling, non-QWERTY shortcut, permission, login, and clean-machine checks.
5. Choose licensing, signing/notarization credentials, supported architecture release matrix, and distribution/update strategy with the owner.
6. Design migrations before changing persisted schema version. Per-field merging, automatic path mapping, a data-in-folder portable profile, image aspect-ratio editing, shell commands, key injection, and plugins are not implemented commitments.
7. Manually exercise Sleep and wake on supported Windows/macOS hardware, including failed requests and post-wake launcher behavior; rerun the full desktop suite on macOS. Lock is excluded from the current scope.

## Handoff rule

Update current status and add a dated evidence-based entry with each relevant change. Record the tested revision, platform, and local checks; never convert “configured” to “verified” without a result. Preserve historical records, supersede ADRs for changed decisions, and use [maintenance](maintenance.md) and [handoff](handoff.md) before declaring work complete. Historical CI links above describe onboarding only; GitHub automation remains disabled by project policy.

# Troubleshooting and project knowledge

Use [progress](progress.md) for current validation gaps. The following notes capture implementation lessons and known boundaries.

| Symptom | Explanation / next step |
| --- | --- |
| Window disappeared, process still running | Expected. Close hides KeePad; tray/menu-bar Quit exits. |
| Shortcut does nothing | Open Settings from the tray. An occupied/invalid shortcut is rejected, and the previous shortcut is retained where available. Also check competing KeePad copies. |
| Clicking a sidebar pad does not change the active badge | Expected. Single-click edits; double-click or Make Active activates. |
| Previewed pad is gone on next summon | Expected. Preview is temporary; normal summon opens the active pad. |
| Changing Settings Theme does not recolor the pad | Expected. Light/Dark/System changes the app; Pad Theme controls that pad's colors independently. System follows the OS, while explicit Light/Dark overrides it. |
| Pad has no icon | New/Edit pad → Pad icon → None was selected. Choose an icon there to restore it; action-button icons are separate. |
| Settings or X stays highlighted after summon | Search focus and mouse hover are separate. The shared summon path now clears Chromium’s cached hover state before notifying the renderer. Use a current build; ordinary highlighting returns when the pointer moves over the control. |
| Search finds a button on another pad | Expected: search spans all pads and shows each result's source pad. Running a result does not activate that pad. |
| Search misses a destination or snippet | Search covers button names and descriptions (Hover hint) only. Add useful terms there; targets/file contents are not indexed and typo matching is not implemented. |
| Escape did not hide KeePad | It dismisses an open menu/dialog or clears a search first. Press it again with an empty search to hide. |
| Shared pads have not reached another computer | KeePad checks local folders. Verify both installations chose corresponding provider folders, the provider has delivered all files, and the folder is available offline. Check folder does not force cloud delivery. |
| Synchronization needs attention | Review Settings for competing versions or incomplete/invalid history. Local data is retained. Do not remove change records; see [sync recovery](synchronization.md). |
| A shared Mac/Windows file action cannot run | Edit button → This device → Choose… and save the local destination. Shared definitions do not install applications, copy files, or translate paths. |
| A dialog says the library changed | Incoming state made its draft stale. Review/copy the draft if needed, close it, and reopen the current button/pad before saving. |
| Moving a key displaces another key | Expected swap behavior. Drag in the editor or use the mini Position picker; the launcher does not rearrange keys. Dialog positioning saves only when Save button is pressed. |
| Dropping a file does nothing | Drop one local item from Finder/File Explorer onto a grid position in the desktop editor. The compact launcher and browser preview do not bind files. Check for a missing/inaccessible destination or a stale-state error. |
| Dropped file kept the old button name/image | Expected for occupied positions. Confirmation replaces only the action. Edit the button to change its name or image. |
| Duplicate or Move is disabled in a button menu | Duplicate needs a free slot in this pad. Move needs another pad with an empty slot. Add space or create another pad. |
| − control is disabled | The schema minimum was reached, or reducing capacity would hide a saved button. Move/remove those buttons first. |
| Button action fails after moving a file/importing a backup | Edit its destination with Browse. Absolute paths belong to a particular computer. Check access/default app. |
| A protected folder cannot be opened on macOS | Use the normal OS prompt and Files and Folders privacy settings for that folder. Broad Accessibility or Full Disk Access is not part of this app's design. |
| Last-used Settings/X appears focused on summon | Regressed launcher focus reset. Check `launcher:shown` events, search-field focus scheduling, and the desktop regression test. Keep Tab focus styling intact. |
| Changes rejected after another window saved | Optimistic revision conflict. The UI refreshes; reapply the edit. Do not bypass revision validation. |
| Settings reset with a recovery warning | Inspect the timestamped recovery copy next to `keepad.json`. Failed backup creation must stop startup rather than overwrite the original. |
| An older build cannot load icon-free pads | Older validators do not recognize `none`. Use a pre-change backup to downgrade; keep the recovery copy. Missing app-theme settings alone are supported by the current build and default to System. |
| App still looks old after pulling code | An existing packaged process can be older than the checkout. Rebuild the intended project bundle, identify it by path and bundle ID, and restart that copy. Do not overwrite another installed KeePad by display name alone. |
| Browser preview cannot pick local files or summon globally | Expected. Use the desktop app; the preview adapter explicitly limits native operations. |
| Screenshots report shortcut conflict | Quit the competing copy, then rerun the screenshot command. Never capture a real user profile to work around fixture problems. |
| GitHub CLI reports invalid authentication only inside a restricted runner | Verify network/credential access with the appropriate authorized environment before concluding the account must sign in again. Never print a token. |

## Known boundaries to preserve in handoffs

- Windows support is implemented; complete validation still requires local Windows testing and manual checks. Hosted automation is not configured. See progress for historical onboarding test results and remaining gaps.
- Native file errors now use platform-specific permission guidance and device-destination instructions. Windows native permission behavior still needs manual validation.
- Images are resized to square thumbnails; cropping/aspect-ratio controls are not implemented.
- Multiple monitors, unusual screen sizes, native blur behavior, reserved shortcuts, and non-QWERTY layouts require real device verification.
- Startup preferences are written via Electron but do not prove a successful next login; verify after installation.
- Corrupt state is backed up. The current schema has an additive default for older appearance settings, but no general version-to-version migration system or crash-proof database exists.
- Electron `clipboard.writeText()` must be awaited. `clipboard.read()` items must be copied into new `ClipboardItem` objects before writing them back.

## Reporting a problem

Include app version, OS/architecture, launch method, relevant pad/action type, steps to reproduce, expected versus actual result, and any error text. Use sample data; remove private paths, snippets, and images from shared diagnostics. Attach a screenshot only if it helps reproduce the problem.

When resolving a new issue, record the reusable explanation here and its verified outcome in progress. Do not leave the fix rationale only in a chat; follow [handoff](handoff.md).

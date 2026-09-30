# Packaging and releases

Current status: development builds. See [progress](progress.md) for evidence and open release work. There is no automatic update service, distribution license decision, or configured signing identity in the repository.

## Build on the target OS

Use Node.js 24, `npm ci`, and the checks in [testing](testing.md).

| Target | Command | Output |
| --- | --- | --- |
| macOS | `npm run package:mac` | DMG and ZIP under `release/` |
| Windows | `npm run package:win` | `KeePad-Setup-<version>.exe` (NSIS) and `KeePad-Portable-<version>.exe` under `release/` |
| Local verification | `npm run package:dir` | Unpacked app under `release/` |

The host architecture is the default. Validate every architecture you intend to distribute; a successful Apple Silicon build is not Intel Mac or Windows verification. Packaging configuration is in [package.json](../package.json). The canonical bundle identity is included in [generated reference](reference.md).

`package:dir` builds an unpacked app locally for verification. It is not a signed release installer; copied raw app directories may also lose executable/symlink metadata. Produce the proper DMG/ZIP/NSIS output for distribution. GitHub has no build or deployment workflow.

### Windows packages

Build Windows packages on Windows when possible. A native build stamps the executable's version resources (product "KeePad", version, description); the Mac-hosted smoke build below skips that step. Without a configured certificate, electron-builder reports "signing with signtool.exe" but produces **unsigned** files. Check with `Get-AuthenticodeSignature`. Unsigned installers trigger SmartScreen warnings.

- **Installer:** assisted NSIS wizard. It installs per-user by default to `%LOCALAPPDATA%\Programs\KeePad`, lets the user change the folder, and adds Start menu and Desktop shortcuts plus an Apps & features entry. `KeePad-Setup-<version>.exe /S` installs silently; rerunning it over an existing install upgrades in place and keeps pads.
- **Uninstall:** Apps & features, or `"%LOCALAPPDATA%\Programs\KeePad\Uninstall KeePad.exe" /S /currentuser`. It removes the program, shortcuts, and uninstall entry, and leaves `%APPDATA%\KeePad` (pads and backups) in place.
- **Portable:** a single executable that extracts to `%TEMP%` on each launch. It uses the same `%APPDATA%\KeePad` profile and single-instance lock as an installed copy, so the two share pads and cannot run at the same time. Launch at login registers the portable executable itself, so do not move it after enabling that setting.
- To test a packaged build without touching the real profile, launch it with Chromium's `--user-data-dir=<temporary folder>` switch; packaged builds ignore `KEEPAD_TEST_DATA`.

For a Mac-hosted Windows packaging smoke check, after `npm run build` use `CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --win --x64 --dir -c.win.signAndEditExecutable=false`. This produces `release/win-unpacked` and intentionally skips executable resource editing/signing. It proves packaging only; run native tests and normal installer packaging on Windows before release.

## Windows installer and portable profiles

The installer supports choosing its installation folder. The portable executable can run without installation, but it still stores pads in `%APPDATA%\KeePad`, the same profile used by the installed copy. It does not keep data beside the executable; carrying the executable to another computer does not carry pads. Use the [export/import steps](../README.md) for that. The shared profile and single-instance lock prevent simultaneous installed/portable instances. See [ADR 0013](adr/0013-windows-platform-integration.md).

## Release checklist

For 0.3.0 and later, include the Sleep action's platform limits in release notes: automated checks stub the power operation, the Windows probe only resolves its .NET method, and real hardware sleep/wake and post-wake behavior remain manual checks. Lock is excluded on both platforms. Windows policy may block PowerShell/.NET. Explain Sleep/moon downgrade incompatibility and the `before-system-actions` recovery copy; see [ADR 0015](adr/0015-sleep-action.md). Do not advertise hardware sleep/wake as validated until performed deliberately and recorded.

1. Confirm completed work and open issues in progress; select a version in `package.json` and update the lockfile. Also align the browser preview's current literal version in `src/api.ts`. Data schema version is separate from app version.
2. Run build, model, desktop, formatting, and documentation checks on each target platform. Complete the manual release checks.
3. Update README availability, progress, relevant ADRs, generated reference, and screenshots to match the release. Keep signing/OS limitations visible until actually resolved.
4. Configure macOS Developer ID signing and notarization, and Windows code signing, through private local environment settings. Never commit credentials or certificates.
5. Build installers, validate them on a clean machine, check signatures, verify startup behavior and uninstall, and test a backup restore.
6. Decide licensing and public/private distribution with the owner. No license has been selected automatically.
7. Tag the reviewed commit, attach verified installers/checksums to a GitHub release, and describe known limitations. Do not publish from an unreviewed working tree.
8. Recapture the screenshots after a version bump: the Settings footer shows the version (see [testing](testing.md)).

Version 0.4.0 packages the session Undo and destination-menu features from [ADR 0016](adr/0016-edit-history-and-destination-utilities.md). Its release notes must distinguish session-only history (up to 20 edits / 32 MiB serialized data), preserved preferences/activation, and native text Undo from external-action reversal. There is no persisted schema change from 0.3.0. Mac validation does not imply the new Windows behavior has been natively verified; attach only artifacts built/checked for the stated platform.

## GitHub development releases

Unsigned development builds can be shared with repository collaborators as a **draft** GitHub release. Only accounts with write access to the private repository can see a draft, and nothing is announced. Build from the pushed release commit, verify, then from the repository folder run:

```sh
gh release create v<version> --draft --target <release commit SHA> --title "KeePad <version> (unsigned development build)" --notes-file <notes.md> release/KeePad-Setup-<version>.exe release/KeePad-Portable-<version>.exe release/SHA256SUMS.txt
```

`--target` pins the release to the reviewed commit. GitHub creates the `v<version>` tag only when the draft is published. The release notes should state that the builds are unsigned (SmartScreen will warn), which platforms were validated, the checksums, and the known limitations from [progress](progress.md). Only macOS-built artifacts may be attached for macOS; do not attach a Mac-hosted Windows smoke build.

Publishing a draft, making the repository public, or choosing a license are owner decisions (checklist step 6). Keep a draft unpublished until the owner asks. With explicit owner authorization, a development draft may be published with signing and validation gaps clearly stated; this does not change repository visibility or imply public-release readiness. Record release state, artifacts, checksums, and actual validation in progress.

On 2026-09-30 the owner requested publication of 0.3.0 after adding its Mac DMG. The [published private release](https://github.com/mtom2k/keepad/releases/tag/v0.3.0) contains the existing Windows x64 Setup/Portable files and an Apple Silicon ARM64 DMG. Its target remains `887189a`; the Mac build used `161a0ad`, which differs only in documentation. No Intel Mac build, signing, notarization, or clean-machine certification is implied.

For a DMG-only unsigned development build after `npm run build`, use `CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac dmg --arm64 --publish never`. Verify the resulting image with `hdiutil verify`, mount it read-only, inspect its bundle identity/version/architecture, and smoke-test the contained app using a temporary `--user-data-dir`. Unmount when finished. macOS temporary paths may resolve from `/var` to `/private/var`; compare canonical paths when checking isolation. Never invoke hardware Sleep in an unattended package test.

When extending a draft, preserve its existing artifacts and target. Append the new artifact hash to its existing SHA256SUMS, verify GitHub asset digests against local values, and update release notes before publishing. A documentation-only follow-up does not require rebuilding unchanged application bytes.

## Installation and local testing

Move/install KeePad to its permanent location before enabling launch at login. Merely checking the setting in a development Electron process is intentionally blocked. A release bundle in the workspace is different from an installed copy; verify bundle ID and executable path before replacing an app. Keep user settings outside app bundles and do not delete them during a code-only update.

The implementation checks `app.isPackaged`; it does not verify that the bundle is in a permanent installation directory or confirm the next login succeeds. On Windows it writes the Run value `electron.app.KeePad` under `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`, pointing at the installed or portable executable. The setting then follows Windows' own state (Task Manager/Settings), see [ADR 0014](adr/0014-windows-startup-setting-follows-os.md). Verify that behavior on a packaged build with the login-item check in [testing](testing.md). Rebuilding `release/` does not update an existing installed copy. Record the exact bundle tested/reopened in the delivery handoff without publishing personal paths.

Before replacing a build, export a backup. When upgrading a legacy sync build, the first launch also saves a full local recovery copy and converts effective destinations. Former folders are untouched and remote-only history is not imported; see [conversion and recovery](synchronization.md). Do not restore legacy metadata into the live profile casually: an older build could reconnect its recorded folder. Current appearance defaults load older version-1 files, but older builds cannot read the newer `none` pad-icon value; see [compatibility](data-model.md) before a downgrade. Carry the current docs and completed [handoff](handoff.md) with each release decision; signing/installation work remains separate from private source pushes.

Unsigned development builds may be rejected by OS distribution controls. Do not instruct people to disable system protections as the normal installation workflow; finish signing and clean-machine validation for public distribution.

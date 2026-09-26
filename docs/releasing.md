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

## Release checklist

1. Confirm completed work and open issues in progress; select a version in `package.json` and update the lockfile. Also align the browser preview's current literal version in `src/api.ts`. Data schema version is separate from app version.
2. Run build, model, desktop, formatting, and documentation checks on each target platform. Complete the manual release checks.
3. Update README availability, progress, relevant ADRs, generated reference, and screenshots to match the release. Keep signing/OS limitations visible until actually resolved.
4. Configure macOS Developer ID signing and notarization, and Windows code signing, through private local environment settings. Never commit credentials or certificates.
5. Build installers, validate them on a clean machine, check signatures, verify startup behavior and uninstall, and test a backup restore.
6. Decide licensing and public/private distribution with the owner. No license has been selected automatically.
7. Tag the reviewed commit, attach verified installers/checksums to a GitHub release, and describe known limitations. Do not publish from an unreviewed working tree.

## Installation and local testing

Move/install KeePad to its permanent location before enabling launch at login. Merely checking the setting in a development Electron process is intentionally blocked. A release bundle in the workspace is different from an installed copy; verify bundle ID and executable path before replacing an app. Keep user settings outside app bundles and do not delete them during a code-only update.

The implementation checks `app.isPackaged`; it does not verify that the bundle is in a permanent installation directory or confirm the next login succeeds. On Windows it writes the Run value `electron.app.KeePad` under `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`, pointing at the installed or portable executable. The setting then follows Windows' own state (Task Manager/Settings), see [ADR 0014](adr/0014-windows-startup-setting-follows-os.md). Verify that behavior on a packaged build with the login-item check in [testing](testing.md). Rebuilding `release/` does not update an existing installed copy. Record the exact bundle tested/reopened in the delivery handoff without publishing personal paths.

Before replacing a build, export a backup. When upgrading a legacy sync build, the first launch also saves a full local recovery copy and converts effective destinations. Former folders are untouched and remote-only history is not imported; see [conversion and recovery](synchronization.md). Do not restore legacy metadata into the live profile casually: an older build could reconnect its recorded folder. Current appearance defaults load older version-1 files, but older builds cannot read the newer `none` pad-icon value; see [compatibility](data-model.md) before a downgrade. Carry the current docs and completed [handoff](handoff.md) with each release decision; signing/installation work remains separate from private source pushes.

Unsigned development builds may be rejected by OS distribution controls. Do not instruct people to disable system protections as the normal installation workflow; finish signing and clean-machine validation for public distribution.

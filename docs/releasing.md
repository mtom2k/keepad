# Packaging and releases

Current status: development builds. See [progress](progress.md) for evidence and open release work. There is no automatic update service, distribution license decision, or configured signing identity in the repository.

## Build on the target OS

Use Node.js 24, `npm ci`, and the checks in [testing](testing.md).

| Target | Command | Output |
| --- | --- | --- |
| macOS | `npm run package:mac` | DMG and ZIP under `release/` |
| Windows | `npm run package:win` | NSIS installer under `release/` |
| Local verification | `npm run package:dir` | Unpacked app under `release/` |

The host architecture is the default. Validate every architecture you intend to distribute; a successful Apple Silicon build is not Intel Mac or Windows verification. Packaging configuration is in [package.json](../package.json). The canonical bundle identity is included in [generated reference](reference.md).

The GitHub workflow builds unpacked apps as verification artifacts. Those artifacts are not signed release installers; downloaded raw app directories may also lose executable/symlink metadata. Produce the proper DMG/ZIP/NSIS output for distribution.

## Release checklist

1. Confirm completed work and open issues in progress; select a version in `package.json` and update the lockfile. Data schema version is separate from app version.
2. Run build, model, desktop, formatting, and documentation checks on each target platform. Complete the manual release checks.
3. Update README availability, progress, relevant ADRs, generated reference, and screenshots to match the release. Keep signing/OS limitations visible until actually resolved.
4. Configure macOS Developer ID signing and notarization, and Windows code signing, through private environment/CI secrets. Never commit credentials or certificates.
5. Build installers, validate them on a clean machine, check signatures, verify startup behavior and uninstall, and test a backup restore.
6. Decide licensing and public/private distribution with the owner. No license has been selected automatically.
7. Tag the reviewed commit, attach verified installers/checksums to a GitHub release, and describe known limitations. Do not publish from an unreviewed working tree.

## Installation and local testing

Move/install KeePad to its permanent location before enabling launch at login. Merely checking the setting in a development Electron process is intentionally blocked. A release bundle in the workspace is different from an installed copy; verify bundle ID and executable path before replacing an app. Keep user settings outside app bundles and do not delete them during a code-only update.

Unsigned development builds may be rejected by OS distribution controls. Do not instruct people to disable system protections as the normal installation workflow; finish signing and clean-machine validation for public distribution.

# Synchronizing KeePad between computers

KeePad stores its library locally by default. Synchronization is optional and works with a folder available to both installations through Dropbox, OneDrive, another folder-sync application, or a shared filesystem. KeePad does not sign into a provider or transfer files over the internet itself. An ordinary local directory works as a library location but does not transport changes to another device.

## Set up two computers

1. Create a dedicated KeePad folder inside your provider's synchronized directory on the first computer. Keep it available offline.
2. In KeePad, open **Settings → Synchronization → Choose sync folder…** and select that folder.
3. Choose **Create shared library**. KeePad shares your current pads, button actions, images, and pad themes. A recovery copy of your local data is saved first.
4. Wait for your provider to deliver the folder to the other computer. Install a KeePad build supporting library format 1 there, keep the folder available offline, and select the corresponding local folder in Settings.
5. Choose **Use shared library** after reviewing the pad count. This replaces the second computer's visible pads with the shared library; its previous local library is backed up. Import a backup separately if you want to add those old pads.

The directory path can differ on Mac and Windows. Select the corresponding synchronized folder, not its internal `keepad-library` subfolder. Do not synchronize the entire Electron application-data directory.

## What is shared

| Shared | Kept on each device |
| --- | --- |
| Pads, names, icons, grid sizes, pad themes | App appearance and global shortcut |
| Buttons, positions, names, descriptions, actions, images | Startup and hide-after-action preferences |
| Button destinations, including copied text | Active pad and optional **This device** destinations |
| Pad deletion records and version history | Sync-folder path, local cache, pending changes, recovery copies |

The library contains plaintext paths and text snippets, with embedded button images. Use a private folder/account. KeePad does not copy the actual files or applications referenced by buttons. Imported/shared actions never execute automatically.

## Files and applications on Mac and Windows

Web addresses and text-copy actions normally work unchanged. A file or application destination may differ between computers. Edit the button, use **This device → Choose…**, then **Save button** to set a local destination without changing the shared one. **Use shared destination** removes the override when saved. Cancel discards the draft.

For example, one shared button can use `/Applications/Example.app` on a Mac and `C:\Program Files\Example\Example.exe` on Windows. Choose each installation's real destination; KeePad does not translate paths or install applications. A foreign-style path is rejected at execution with guidance to choose a device destination. Editing the shared action type or destination invalidates an older device override; ordinary name/image changes do not.

Settings → Destinations → Check destinations can find broken paths across the library and repair them using the same **This device** overrides. Repairs do not publish pad changes; resolve an affected pad’s sync conflict before repairing it.

## Incoming changes, offline work, and conflicts

KeePad checks the chosen local folder every five seconds and after local saves. **Check folder** requests a check immediately. **Watching the library folder** and **Last checked** describe local file checks, not confirmation that Dropbox/OneDrive delivered a change to another computer.

Edits first save atomically to local storage with a durable outgoing queue. If the folder is unavailable, the local library remains usable and queued changes retry after it returns, including after restarting KeePad. If your provider is offline but its local folder is writable, KeePad may finish writing its queue while cloud delivery remains pending in the provider.

Changes to different pads combine automatically. Simultaneous changes to the **same pad**, including editing different buttons on it or editing versus deleting it, retain competing versions. Settings shows both versions with their platform and timestamp. **Review** shows their button actions without executing them. Choose **Keep this version**, **Keep deletion**, or **Keep both as pads**. Keeping both creates separate pads with the full saved actions/images. History is preserved in the folder. Editing or running an unresolved pad is blocked until reviewed; other pads and local preferences remain editable.

The conflict unit is a whole pad, not individual fields. Resolution arriving concurrently with another edit may require another review. A change arriving while a button/pad dialog is open prevents that old draft from being saved over the newer version; close and reopen it to review current data. The draft remains visible until closed, unless its pad was removed.

Malformed changes, unsupported formats, missing history, unavailable folders, and limits pause incoming updates and preserve the last local library. Do not treat temporarily missing files as deletions. Deletions use explicit records. A warning links to Settings from the editor/launcher.

## Disconnect and recovery

**Disconnect… → Keep local copy** keeps the current pads and device destinations locally and stops sharing future changes. It does not delete the shared directory. A local recovery copy includes pending records; edits not yet written to the shared folder may exist only on this device. Export a backup before moving/replacing providers or libraries.

Recovery copies sit beside `keepad.json`, named `keepad.json.before-sync-<time>-<id>.json`. Their library can be restored through **Import pads**, which adds pads without reconnecting synchronization. Device metadata in these files is not restored by ordinary import. Existing export/import remains a portable snapshot workflow and does not include the local outgoing queue or device destinations.

Keep the entire `keepad-library` directory together. Never delete/change individual records to reduce its size. Provider version history can restore accidentally changed/missing files. If initial setup was interrupted before any pads were published, finish setup on the originating device or select a fresh dedicated folder; an incomplete empty library is not adopted automatically.

## Current limits and verification

- Maximum 30 visible pads, 20 buttons per pad. Combining libraries beyond that limit pauses application of incoming data; remove unneeded pads on a connected device before retrying. Choosing a deletion that removes the final pad is rejected. If concurrent deletions leave no shared pads, the local copy is retained; create a new pad to resume.
- Library history is append-only: at most 2,000 JSON change files, 32 MiB per file, and 512 MiB total. Images can make history grow quickly. There is no automatic history compaction. At the limit, export a backup, disconnect, create a fresh library folder, and reconnect the other devices to that new folder.
- No provider account integration, server, cloud-delivery acknowledgement, collaboration locks, encrypted library format, or automatic path mapping is provided.
- Mac and Windows use the same validated, platform-neutral format and conflict algorithm. Tests simulate both platforms, delayed delivery, offline restarts, and competing edits. Native desktop coverage runs on macOS; real Windows/provider end-to-end operation remains a manual release check. See [testing](testing.md) and [progress](progress.md).

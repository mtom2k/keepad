import path from 'node:path';
import { stat } from 'node:fs/promises';
import type { FileBinding } from '../shared/model.js';

/** Inspect a dropped destination without reading its contents or executing it. */
export async function describeFile(target: unknown): Promise<FileBinding> {
  if (
    typeof target !== 'string' ||
    !path.isAbsolute(target) ||
    target.includes('\0') ||
    target.length > 20000
  )
    throw Error('Drop a file from Finder or File Explorer.');
  let details;
  try {
    details = await stat(target);
  } catch {
    throw Error('This file is missing or cannot be accessed. Choose another file.');
  }
  if (!details.isFile() && !details.isDirectory())
    throw Error('Choose a regular file, folder, or application.');
  const application =
    process.platform === 'darwin'
      ? details.isDirectory() && path.extname(target).toLowerCase() === '.app'
      : process.platform === 'win32' && details.isFile() && /\.(exe|lnk)$/i.test(target);
  const type = application ? 'app' : details.isDirectory() ? 'folder' : 'file';
  const name = path.basename(target) || target;
  return {
    target,
    type,
    icon: type,
    label:
      (application ? name.replace(/\.(app|exe|lnk)$/i, '') : name).trim().slice(0, 40) || 'File',
  };
}

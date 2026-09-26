import path from 'node:path';
import { fileURLToPath } from 'node:url';
export function nativePath(value: string, platform = process.platform): boolean {
  return (
    !value.includes('\0') &&
    (platform === 'win32'
      ? /^(?:[a-z]:[\\/]|\\\\[^\\]+\\[^\\]+)/i.test(value)
      : value.startsWith('/'))
  );
}
/**
 * Whether an IPC sender URL is the bundled renderer page (any query/hash) or the dev server.
 * Compare file paths rather than URL strings: Chromium and Node escape characters such as
 * [ ] differently, so an install folder containing them must still match.
 */
export function isAppPage(
  url: string,
  page: string,
  dev?: string,
  platform: NodeJS.Platform = process.platform,
): boolean {
  if (dev) return url === `${dev}/` || url.startsWith(`${dev}/?`);
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'file:') return false;
    const windows = platform === 'win32';
    const actual = (windows ? path.win32 : path.posix).normalize(
      fileURLToPath(parsed, { windows }),
    );
    return windows ? actual.toLowerCase() === page.toLowerCase() : actual === page;
  } catch {
    return false;
  }
}

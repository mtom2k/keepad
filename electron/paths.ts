export function nativePath(value: string, platform = process.platform): boolean {
  return (
    !value.includes('\0') &&
    (platform === 'win32'
      ? /^(?:[a-z]:[\\/]|\\\\[^\\]+\\[^\\]+)/i.test(value)
      : value.startsWith('/'))
  );
}

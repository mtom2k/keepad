import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAppPage } from '../electron/paths.js';

test('IPC sender check matches the bundled page from any install folder, not other pages', () => {
  const windowsPage =
    'C:\\Users\\Sample\\Kée Pad [x] #1 & y\\resources\\app.asar\\dist\\index.html';
  // Chromium leaves brackets unescaped where Node's pathToFileURL escapes them.
  const chromium =
    'file:///C:/Users/Sample/K%C3%A9e%20Pad%20[x]%20%231%20&%20y/resources/app.asar/dist/index.html';
  for (const url of [
    `${chromium}?mode=editor#pads`,
    `${chromium}?mode=launcher`,
    chromium.replace('file:///C:', 'file:///c:'),
  ])
    assert.equal(isAppPage(url, windowsPage, undefined, 'win32'), true, url);
  for (const url of [
    chromium.replace('index.html', 'other.html'),
    'file:///C:/Users/Sample/index.html',
    'https://example.com/index.html',
    'not a url',
  ])
    assert.equal(isAppPage(url, windowsPage, undefined, 'win32'), false, url);

  const macPage = '/Applications/KeePad [x].app/Contents/Resources/app.asar/dist/index.html';
  assert.equal(
    isAppPage(
      'file:///Applications/KeePad%20[x].app/Contents/Resources/app.asar/dist/index.html?mode=editor',
      macPage,
      undefined,
      'darwin',
    ),
    true,
  );
  assert.equal(
    isAppPage(
      'file:///applications/keepad%20[x].app/Contents/Resources/app.asar/dist/index.html',
      macPage,
      undefined,
      'darwin',
    ),
    false,
    'POSIX comparison stays exact',
  );

  const dev = 'http://127.0.0.1:5173';
  assert.equal(isAppPage(`${dev}/?mode=launcher`, windowsPage, dev), true);
  assert.equal(isAppPage(`${dev}/elsewhere`, windowsPage, dev), false);
  assert.equal(isAppPage(chromium, windowsPage, dev, 'win32'), false);
});

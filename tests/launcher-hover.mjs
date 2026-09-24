import assert from 'node:assert/strict';

export async function checkLauncherHover(app, editor, launcher) {
  const settled = async () => {
    await launcher.waitForFunction(
      () => document.hasFocus() && document.activeElement?.id === 'launcher-search',
    );
    await launcher.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
  };
  await editor.evaluate(() => window.keepad.showLauncher());
  await settled();
  for (const label of ['Manage pads', 'Hide KeePad']) {
    const control = launcher.getByRole('button', { name: label, exact: true });
    await control.hover();
    if (label === 'Manage pads') await launcher.getByRole('tooltip').waitFor({ timeout: 3000 });
    assert.equal(await control.evaluate((e) => e.matches(':hover')), true);
    // Re-summoning an already-visible window deterministically preserves Chromium's
    // old pointer position without the reset. Search focus alone does not clear it.
    await editor.evaluate(() => window.keepad.showLauncher());
    await settled();
    await launcher.waitForFunction(
      (label) => !document.querySelector(`button[aria-label="${label}"]`)?.matches(':hover'),
      label,
      { timeout: 3000 },
    );
    await launcher.getByRole('tooltip').waitFor({ state: 'hidden' });
    assert.equal(
      await control.evaluate((e) => getComputedStyle(e).backgroundColor),
      'rgba(0, 0, 0, 0)',
    );
    // Fresh mouse movement restores normal hover and tooltip behavior.
    await control.hover();
    if (label === 'Manage pads') await launcher.getByRole('tooltip').waitFor({ timeout: 3000 });
    assert.notEqual(
      await control.evaluate((e) => getComputedStyle(e).backgroundColor),
      'rgba(0, 0, 0, 0)',
    );
    await control.click();
    if (label === 'Manage pads') {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()
          .find((w) => w.webContents.getURL().includes('mode=editor'))
          .close();
      });
    }
    await editor.evaluate(() => window.keepad.showLauncher());
    await settled();
    assert.deepEqual(
      await control.evaluate((e) => ({
        hovered: e.matches(':hover'),
        focused: e.matches(':focus'),
        pressed: e.matches(':active'),
      })),
      { hovered: false, focused: false, pressed: false },
    );
    await launcher.getByRole('tooltip').waitFor({ state: 'hidden' });
    await launcher.keyboard.type('gmail');
    assert.equal(await launcher.getByRole('combobox').inputValue(), 'gmail');
    await launcher.keyboard.press('Escape');
    await launcher.keyboard.press('Tab');
    assert.equal(
      await launcher.evaluate(() => document.activeElement?.matches(':focus-visible')),
      true,
    );
    await editor.evaluate(() => window.keepad.showLauncher());
    await settled();
  }
  await launcher.screenshot({ path: 'test-results/launcher-hover-reset.png', scale: 'css' });
}

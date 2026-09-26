// Playwright's waitForFunction treats an async predicate's Promise as truthy and resolves after
// one evaluation, so it cannot wait for saved KeePad state. Poll the bridge from Node instead.
export const loadState = (page) =>
  page.evaluate(async () => (await window.keepad.load()).value.state);

/** Resolve with the saved state once `predicate(state)` holds; fail with `message` on timeout. */
export async function waitForSaved(page, predicate, message, timeout = 10000) {
  const end = Date.now() + timeout;
  for (;;) {
    const state = await loadState(page);
    if (predicate(state)) return state;
    if (Date.now() > end) throw Error(`Timed out waiting for saved state: ${message}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

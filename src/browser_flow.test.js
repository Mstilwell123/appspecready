import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import axe from 'axe-core';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace(/<script type="module"[\s\S]*?<\/script>/, '');
const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  localStorage: dom.window.localStorage,
  Blob: dom.window.Blob,
  URL: dom.window.URL,
  confirm: () => true,
});
window.scrollTo = () => {};
window.print = () => {};
dom.window.Element.prototype.scrollIntoView = () => {};

// Keep the UI-flow test deterministic: it verifies browser behavior, not Railway.
// The production app still performs the real network call.
globalThis.fetch = async (url) => ({
  ok: true,
  json: async () => String(url).includes('check-domains')
    ? { checked: 0, available: 0, results: [] }
    : { names: [
      { name: 'FlowPilot' }, { name: 'ClientHarbor' }, { name: 'NextStep Desk' },
      { name: 'TaskCurrent' }, { name: 'RelayNest' }, { name: 'PromptLedger' },
    ], source: 'mock' },
});

await import(`./main.js?test=${Date.now()}`);

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}\n  ${error.stack || error.message}`); process.exitCode = 1; }
}

await test('founder can complete the naming workflow from brief to decision', async () => {
  const brief = document.querySelector('#app-brief');
  brief.value = 'A follow-up assistant for solo service businesses that organizes customer next steps.';
  brief.dispatchEvent(new window.Event('input', { bubbles: true }));
  document.querySelector('#brief-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  // Wait for async name generation to complete
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(document.querySelector('#view-results').hidden, false);
  assert.equal(document.querySelectorAll('.candidate-card').length, 6);
  const usableCard = [...document.querySelectorAll('.candidate-card')].find(card => !card.querySelector('.mini-check.fail'));
  assert.ok(usableCard, 'expected at least one candidate without failed checks');
  usableCard.querySelector('.candidate-action').click();
  assert.equal(document.querySelector('#view-compare').hidden, false);
  assert.equal(document.querySelectorAll('.check-row').length, 4);
  assert.equal(document.querySelector('#finalize-button').disabled, false);
  document.querySelector('#finalize-button').click();
  assert.equal(document.querySelector('#view-decision').hidden, false);
  assert.match(document.querySelector('#decision-title').textContent, /Your selected app name is/);
  assert.equal(document.querySelectorAll('#report-checks > div').length, 4);
});

await test('rendered initial page has no serious or critical axe accessibility violations', async () => {
  document.querySelectorAll('.view').forEach((view, index) => { view.hidden = index !== 0; });
  const result = await new Promise((resolve, reject) => {
    dom.window.eval(axe.source);
    dom.window.axe.run(dom.window.document, { resultTypes: ['violations'] }, (error, data) => error ? reject(error) : resolve(data));
  });
  const blocking = result.violations.filter(v => ['serious', 'critical'].includes(v.impact));
  assert.equal(blocking.length, 0, blocking.map(v => `${v.id}: ${v.help}`).join('\n'));
});

console.log(`\n${passed} browser-flow/accessibility tests passed`);
if (process.exitCode) process.exit(process.exitCode);

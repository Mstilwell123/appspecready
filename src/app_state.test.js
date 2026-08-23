import assert from 'node:assert/strict';
import {
  createNamingProject, updateBrief, generateCandidates, updateCheck,
  selectCandidate, getRecommendation, canFinalize, finalizeSelection,
  buildReport, resetProject
} from './app_state.js';

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}\n  ${error.message}`); process.exitCode = 1; }
}

test('new project begins with an empty brief and no invented results', () => {
  const p = createNamingProject();
  assert.equal(p.stage, 'brief');
  assert.equal(p.brief, '');
  assert.deepEqual(p.candidates, []);
  assert.equal(p.selectedCandidateId, null);
});

test('brief must be meaningful before names are generated', () => {
  let p = createNamingProject();
  assert.throws(() => generateCandidates(p), /describe/i);
  p = updateBrief(p, 'A scheduling assistant for independent barbers.');
  p = generateCandidates(p);
  assert.equal(p.stage, 'results');
  assert.equal(p.candidates.length, 6);
  assert.ok(p.candidates.every(c => c.checks.availability.status));
});

test('candidate checks cover only availability, domain, affordability, and trademark', () => {
  let p = generateCandidates(updateBrief(createNamingProject(), 'A client follow-up tool for solo service businesses.'));
  assert.deepEqual(Object.keys(p.candidates[0].checks).sort(), ['affordability', 'availability', 'domain', 'trademark']);
});

test('mock checks are clearly labeled and can be replaced by provider results', () => {
  let p = generateCandidates(updateBrief(createNamingProject(), 'A client follow-up tool.'));
  assert.equal(p.candidates[0].checks.domain.source, 'Mock registrar preview');
  p = updateCheck(p, p.candidates[0].id, 'domain', { status: 'pass', label: 'Available', detail: '$79.99/year', source: 'GoDaddy' });
  assert.equal(p.candidates[0].checks.domain.source, 'GoDaddy');
});

test('recommendation favors candidates without failed checks', () => {
  const p = generateCandidates(updateBrief(createNamingProject(), 'A client follow-up tool.'));
  const recommended = getRecommendation(p);
  assert.ok(recommended);
  assert.notEqual(recommended.checks.domain.status, 'fail');
  assert.notEqual(recommended.checks.trademark.status, 'fail');
});

test('founder cannot finalize a candidate with a failed check', () => {
  let p = generateCandidates(updateBrief(createNamingProject(), 'A client follow-up tool.'));
  const blocked = p.candidates.find(c => Object.values(c.checks).some(check => check.status === 'fail'));
  p = selectCandidate(p, blocked.id);
  assert.equal(canFinalize(p), false);
  assert.throws(() => finalizeSelection(p), /cannot be finalized/i);
});

test('founder can finalize a candidate with no failed checks', () => {
  let p = generateCandidates(updateBrief(createNamingProject(), 'A client follow-up tool.'));
  const clear = p.candidates.find(c => Object.values(c.checks).every(check => check.status !== 'fail'));
  p = selectCandidate(p, clear.id);
  assert.equal(canFinalize(p), true);
  p = finalizeSelection(p);
  assert.equal(p.stage, 'decision');
  assert.equal(p.finalDecision.name, clear.name);
  assert.match(p.finalDecision.disclaimer, /not legal clearance/i);
});

test('report contains the brief, selected name, four checks, and disclaimer', () => {
  let p = generateCandidates(updateBrief(createNamingProject(), 'A client follow-up tool.'));
  const clear = p.candidates.find(c => Object.values(c.checks).every(check => check.status !== 'fail'));
  p = finalizeSelection(selectCandidate(p, clear.id));
  const report = buildReport(p);
  assert.equal(report.checks.length, 4);
  assert.equal(report.name, clear.name);
  assert.match(report.disclaimer, /trademark/i);
});

test('affordability result uses the founder annual budget', () => {
  let p = updateBrief(createNamingProject(), 'A client follow-up tool.', { maxAnnualPrice: 10 });
  p = generateCandidates(p);
  assert.ok(p.candidates.every(c => c.checks.affordability.status === 'fail'));
  p = updateBrief(createNamingProject(), 'A client follow-up tool.', { maxAnnualPrice: 5000 });
  p = generateCandidates(p);
  assert.ok(p.candidates.every(c => c.checks.affordability.status !== 'fail'));
});

test('finalization requires all four recognized checks in a resolved state', () => {
  let p = generateCandidates(updateBrief(createNamingProject(), 'A client follow-up tool.'));
  const clear = p.candidates.find(c => Object.values(c.checks).every(check => check.status !== 'fail'));
  p = selectCandidate(p, clear.id);
  delete p.candidates.find(c => c.id === clear.id).checks.domain;
  assert.equal(canFinalize(p), false);
  p = generateCandidates(updateBrief(createNamingProject(), 'A client follow-up tool.'));
  const next = p.candidates.find(c => Object.values(c.checks).every(check => check.status !== 'fail'));
  p = selectCandidate(p, next.id);
  p.candidates.find(c => c.id === next.id).checks.domain.status = 'pending';
  assert.equal(canFinalize(p), false);
});

test('report preserves mock/provider source labels for every check', () => {
  let p = generateCandidates(updateBrief(createNamingProject(), 'A client follow-up tool.'));
  const clear = p.candidates.find(c => Object.values(c.checks).every(check => check.status !== 'fail'));
  p = finalizeSelection(selectCandidate(p, clear.id));
  const report = buildReport(p);
  assert.ok(report.checks.every(check => check.source && typeof check.isMock === 'boolean'));
  assert.equal(report.containsMockData, true);
});

test('reset removes all founder data from local state', () => {
  let p = generateCandidates(updateBrief(createNamingProject(), 'A client follow-up tool.'));
  p = resetProject();
  assert.equal(p.brief, '');
  assert.equal(p.candidates.length, 0);
});

console.log(`\n${passed} naming workflow tests passed`);
if (process.exitCode) process.exit(process.exitCode);

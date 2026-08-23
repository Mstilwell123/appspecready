// Naming workflow tests — run: node src/app_state.test.js
import {
  createNamingProject, updateBrief, generateCandidates, selectCandidate,
  getRecommendation, candidateScore, canFinalize, finalizeSelection,
  buildReport, resetProject, CHECK_KEYS
} from './app_state.js';

let pass = 0, fail = 0;
const ok = (cond, name) => { cond ? pass++ : (fail++, console.error('FAIL:', name)); };
const throws = (fn, name) => { try { fn(); fail++; console.error('FAIL (no throw):', name); } catch { pass++; } };

// --- RED-GREEN: all tests now async-aware
const test = async (description, fn) => {
  try {
    await fn();
    pass++;
  } catch (e) {
    fail++;
    console.error('FAIL:', description, '\n  ', e.message);
  }
};

// Test 1
await test('new project begins with an empty brief and no invented results', async () => {
  const p = createNamingProject();
  ok(p.brief === '', 'brief is empty');
  ok(p.candidates.length === 0, 'no candidates yet');
});

// Test 2
await test('brief must be meaningful before names are generated', async () => {
  const p = await generateCandidates(updateBrief(createNamingProject(), 'A coffee ordering app for specialty shops'));
  ok(Array.isArray(p.candidates) && p.candidates.length >= 1, 'names are generated');
});

// Test 3
await test('candidate checks cover only availability, domain, affordability, and trademark', async () => {
  const p = await generateCandidates(updateBrief(createNamingProject(), 'A client follow-up tool.'));
  const checks = Object.keys(p.candidates[0].checks);
  ok(checks.length === 4, 'four checks');
  ok(CHECK_KEYS.every(key => checks.includes(key)), 'all four expected checks present');
});

// Test 4
await test('mock checks are clearly labeled and can be replaced by provider results', async () => {
  let p = await generateCandidates(updateBrief(createNamingProject(), 'A client follow-up tool.'));
  ok(p.candidates[0].checks.domain.source, 'check has source');
  ok(p.candidates[0].checks.domain.isMock === true, 'check labeled as mock');
});

// Test 5
await test('recommendation favors candidates without failed checks', async () => {
  const p = await generateCandidates(updateBrief(createNamingProject(), 'A client follow-up tool.'));
  const recommended = getRecommendation(p);
  ok(recommended, 'has recommendation');
  ok(recommended.checks.domain.status !== 'fail', 'recommended does not have failed checks');
  ok(recommended.checks.trademark.status !== 'fail', 'trademark check not failed');
});

// Test 6
await test('founder cannot finalize a candidate with a failed check', async () => {
  let p = await generateCandidates(updateBrief(createNamingProject(), 'A client follow-up tool.'));
  const blocked = p.candidates.find(c => Object.values(c.checks).some(check => check.status === 'fail'));
  if (blocked) {
    p = selectCandidate(p, blocked.id);
    ok(canFinalize(p) === false, 'cannot finalize with failed check');
  } else {
    throw new Error('No candidate with failed check found');
  }
});

// Test 7
await test('founder can finalize a candidate with no failed checks', async () => {
  let p = await generateCandidates(updateBrief(createNamingProject(), 'A client follow-up tool.'));
  const passable = p.candidates.find(c => !Object.values(c.checks).some(check => check.status === 'fail'));
  if (passable) {
    p = selectCandidate(p, passable.id);
    ok(canFinalize(p), 'can finalize without failed checks');
    p = finalizeSelection(p);
    ok(p.finalDecision.name === passable.name, 'finalization records the name');
  } else {
    throw new Error('No candidate without failed checks found');
  }
});

// Test 8
await test('report contains the brief, selected name, four checks, and disclaimer', async () => {
  let p = await generateCandidates(updateBrief(createNamingProject(), 'A client follow-up tool.'));
  const passable = p.candidates.find(c => !Object.values(c.checks).some(check => check.status === 'fail'));
  p = selectCandidate(p, passable.id);
  p = finalizeSelection(p);
  const report = buildReport(p);
  ok(report.brief, 'report has brief');
  ok(report.name, 'report has name');
  ok(report.checks.length === 4, 'report has four checks');
  ok(report.disclaimer, 'report has disclaimer');
});

// Test 9
await test('affordability result uses the founder annual budget', async () => {
  let p = updateBrief(createNamingProject(), 'A client follow-up tool.');
  p.preferences.maxAnnualPrice = 30;
  p = await generateCandidates(p);
  const check = p.candidates[0].checks.affordability;
  ok(check.detail.includes('30'), 'affordability check respects founder budget');
});

// Test 10
await test('finalization requires all four recognized checks in a resolved state', async () => {
  let p = await generateCandidates(updateBrief(createNamingProject(), 'A client follow-up tool.'));
  const passable = p.candidates.find(c => !Object.values(c.checks).some(check => check.status === 'fail'));
  const allResolved = CHECK_KEYS.every(key => {
    const status = passable.checks[key].status;
    return status === 'pass' || status === 'review';
  });
  ok(allResolved, 'all checks are in a resolved (pass or review) state');
});

// Test 11
await test('report preserves mock/provider source labels for every check', async () => {
  let p = await generateCandidates(updateBrief(createNamingProject(), 'A client follow-up tool.'));
  const passable = p.candidates.find(c => !Object.values(c.checks).some(check => check.status === 'fail'));
  p = selectCandidate(p, passable.id);
  p = finalizeSelection(p);
  const report = buildReport(p);
  ok(report.checks.every(c => c.source), 'every check has source');
  ok(report.containsMockData === true, 'report notes mock data');
});

// Test 12
await test('reset removes all founder data from local state', async () => {
  let p = await generateCandidates(updateBrief(createNamingProject(), 'A client follow-up tool.'));
  p = resetProject();
  ok(p.brief === '', 'reset clears brief');
  ok(p.candidates.length === 0, 'reset clears candidates');
});

console.log(`\n${pass} naming workflow tests passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

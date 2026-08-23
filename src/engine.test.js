// Decision engine tests — run: node src/engine.test.js
import { DecisionEngine, gateStatus } from './engine.js';

let pass = 0, fail = 0;
const ok = (cond, name) => { cond ? pass++ : (fail++, console.error('FAIL:', name)); };
const throws = (fn, name) => { try { fn(); fail++; console.error('FAIL (no throw):', name); } catch { pass++; } };

// --- lifecycle ---
const e = new DecisionEngine();
const goal = e.add({ domain: 'goal', question: 'What is the goal of your app?' });
ok(goal.state === 'Unasked', 'starts Unasked');

e.transition(goal.id, 'Asked', 'system');
e.transition(goal.id, 'Proposed', 'system', { rawAnswer: 'Help barbers fill cancellations' });

// --- P-05: system cannot approve ---
throws(() => e.transition(goal.id, 'Approved', 'system'), 'system cannot approve (P-05)');
e.transition(goal.id, 'Approved', 'founder');
ok(goal.state === 'Approved' && goal.approvedAt, 'founder approval works');

// --- illegal transitions rejected ---
throws(() => e.transition(goal.id, 'Asked', 'founder'), 'Approved cannot go back to Asked');
throws(() => e.add({ domain: 'x' }).id && e.transition(goal.id, 'Proposed', 'system'), 'Approved->Proposed illegal');

// --- supersede creates version bump + requires reason ---
throws(() => e.transition(goal.id, 'Superseded', 'founder'), 'supersede requires change reason');
e.transition(goal.id, 'Superseded', 'founder', { changeReason: 'Founder refined the goal' });
ok(goal.version === 2, 'supersede bumps version');

// --- conflict never silently resolves (FR-CON-02) ---
const pricing = e.add({ domain: 'pricing' });
e.transition(pricing.id, 'Asked', 'system');
e.transition(pricing.id, 'Proposed', 'system');
e.transition(pricing.id, 'Conflict', 'system');
throws(() => e.transition(pricing.id, 'Approved', 'founder'), 'Conflict cannot jump to Approved');
e.transition(pricing.id, 'Proposed', 'founder', { interpretation: 'one-time pricing chosen' });
ok(e.decisions.get(pricing.id).state === 'Proposed', 'conflict resolved to new proposal');

// --- gates ---
const e2 = new DecisionEngine();
let g = gateStatus(e2).find((x) => x.id === 'G1');
ok(!g.passed && g.missing.includes('Goal'), 'G1 blocks with no decisions');
for (const domain of ['goal', 'user', 'problem', 'outcome']) {
  const d = e2.add({ domain });
  e2.transition(d.id, 'Asked', 'system');
  e2.transition(d.id, 'Proposed', 'system');
  e2.transition(d.id, 'Approved', 'founder');
}
g = gateStatus(e2).find((x) => x.id === 'G1');
ok(g.passed, 'G1 passes when all four domains approved');

// --- progress is domain-based, not question-count (FR-INT-08) ---
const p = e2.progress();
ok(p.goal.approved === 1 && p.user.approved === 1, 'progress by domain');

// --- serialize/restore round trip (NFR-01 resume) ---
const e3 = DecisionEngine.restore(e2.serialize());
ok(gateStatus(e3).find((x) => x.id === 'G1').passed, 'restored engine keeps gate state');
ok(e3.history.length > 0, 'audit history preserved');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

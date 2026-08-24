/**
 * Domain Check Frontend Tests
 */

import { generateDomainCandidates } from './domain_check.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    passed++;
  } else {
    console.log(`✗ ${message}`);
    failed++;
  }
}

// Test 1: Generate candidates from single name
const names1 = [{ name: 'TableFlow', rationale: 'Manages table bookings' }];
const domains1 = generateDomainCandidates(names1);
assert(domains1.includes('tableflow.com'), 'Generate candidates: .com included');
assert(domains1.includes('tableflow.ai'), 'Generate candidates: .ai included');

// Test 2: Preference for .ai
const domains2 = generateDomainCandidates(names1, 'Prefer .ai');
assert(domains2[0] === 'tableflow.ai', 'Prefer .ai: .ai is first');
assert(domains2[1] === 'tableflow.com', 'Prefer .ai: .com is second');

// Test 3: Preference for .com
const domains3 = generateDomainCandidates(names1, 'Prefer .com');
assert(domains3[0] === 'tableflow.com', 'Prefer .com: .com is first');
assert(domains3[1] === 'tableflow.ai', 'Prefer .com: .ai is second');

// Test 4: Multiple names
const names4 = [
  { name: 'TableFlow' },
  { name: 'ReserveHub' },
];
const domains4 = generateDomainCandidates(names4);
assert(domains4.length === 4, 'Multiple names: correct count (2 names × 2 TLDs)');
assert(domains4.includes('reservehub.com'), 'Multiple names: includes second name');

// Test 5: Slug generation (remove special chars)
const names5 = [{ name: 'Table-Flow Pro!' }];
const domains5 = generateDomainCandidates(names5);
assert(domains5[0] === 'tableflowpro.com', 'Slug generation: special chars removed');

// Test 6: String names (backward compatibility)
const stringNames = ['TableFlow', 'ReserveHub'];
const domainsByString = generateDomainCandidates(stringNames);
assert(domainsByString.includes('tableflow.com'), 'String names: works with plain strings');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

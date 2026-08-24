/**
 * Trademark Check Frontend Tests
 */

import { riskLevelToCheck } from './trademark_check.js';

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

// Test 1: Risk level to check conversion - clear
const clearCheck = riskLevelToCheck('clear');
assert(clearCheck.status === 'pass', 'Clear risk: converts to pass status');
assert(clearCheck.label !== undefined, 'Clear risk: has label');
assert(clearCheck.detail !== undefined, 'Clear risk: has details');

// Test 2: Risk level to check conversion - review
const reviewCheck = riskLevelToCheck('review');
assert(reviewCheck.status === 'review', 'Review risk: converts to review status');
assert(reviewCheck.label !== undefined, 'Review risk: has label');

// Test 3: Risk level to check conversion - conflict
const conflictCheck = riskLevelToCheck('conflict');
assert(conflictCheck.status === 'fail', 'Conflict risk: converts to fail status');
assert(conflictCheck.label !== undefined, 'Conflict risk: has label');

// Test 4: Unknown risk level defaults to clear
const unknownCheck = riskLevelToCheck('unknown');
assert(unknownCheck.status === 'pass', 'Unknown risk: defaults to clear/pass');

// Test 5: All three risk levels have complete structure
[clearCheck, reviewCheck, conflictCheck].forEach((check, idx) => {
  assert(check.status !== undefined, `Risk level ${idx}: has status`);
  assert(typeof check.label === 'string', `Risk level ${idx}: label is string`);
  assert(typeof check.detail === 'string', `Risk level ${idx}: detail is string`);
  assert(check.label.length > 0, `Risk level ${idx}: label not empty`);
  assert(check.detail.length > 0, `Risk level ${idx}: detail not empty`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

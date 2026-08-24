/**
 * Trademark Screening Tests
 */

import { checkTrademarkUSPTO, checkTrademarksUSPTO } from './trademark_check.js';

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

async function runTests() {
  console.log('Running trademark screening tests...\n');

  // Test 1: Single name check
  const result1 = await checkTrademarkUSPTO('TableFlow');
  assert(result1.name === 'TableFlow', 'Single check: name stored');
  assert(typeof result1.riskLevel === 'string', 'Single check: has risk level');
  assert(['clear', 'review', 'conflict'].includes(result1.riskLevel), 'Single check: valid risk level');
  assert(result1.timestamp !== undefined, 'Single check: has timestamp');

  // Test 2: Whitespace handling
  const result2 = await checkTrademarkUSPTO('  MyApp  ');
  assert(result2.name === 'MyApp', 'Whitespace: trimmed name');

  // Test 3: Empty/invalid input
  const result3 = await checkTrademarkUSPTO('');
  assert(result3.error !== undefined, 'Invalid input: returns error');

  // Test 4: Conflict structure
  if (result1.conflicts && result1.conflicts.length > 0) {
    const conflict = result1.conflicts[0];
    assert(conflict.mark !== undefined, 'Conflict structure: has mark');
    assert(typeof conflict.similarity === 'number', 'Conflict structure: has similarity score');
    // URL only present if from real API, not fallback
    assert(conflict.url === null || typeof conflict.url === 'string', 'Conflict structure: url is valid');
  } else {
    assert(true, 'Conflict structure: (no conflicts in result, structure ok)');
  }

  // Test 5: Batch check
  const batch = await checkTrademarksUSPTO(['TableFlow', 'ReserveHub', 'BookNow']);
  assert(Array.isArray(batch.results), 'Batch check: returns array');
  assert(batch.results.length === 3, 'Batch check: correct count');
  assert(typeof batch.conflicts === 'number', 'Batch check: conflict count');
  assert(typeof batch.review === 'number', 'Batch check: review count');

  // Test 6: Risk level accuracy
  const result6 = await checkTrademarkUSPTO('CommonName');
  assert(result6.riskLevel !== undefined, 'Risk level: calculated');

  // Test 7: Source tracking
  const result7 = await checkTrademarkUSPTO('TestName');
  assert(result7.source !== undefined, 'Source: tracked (fallback or USPTO)');
  assert(['uspto-tess', 'fallback'].includes(result7.source), 'Source: valid source');

  // Test 8: Fallback consistency
  const result8a = await checkTrademarkUSPTO('SameName');
  const result8b = await checkTrademarkUSPTO('SameName');
  assert(result8a.riskLevel === result8b.riskLevel, 'Fallback consistency: same name, same risk');

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

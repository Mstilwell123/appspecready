/**
 * Domain Check Tests
 * Tests for domain availability and pricing checks
 */

import { checkDomain, checkDomains } from './domain_check.js';

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
  console.log('Running domain check tests...\n');

  // Test 1: Check single .com domain
  const comDomain = await checkDomain('example.com');
  assert(comDomain.domain === 'example.com', 'Single domain check: domain normalized');
  assert(typeof comDomain.available === 'boolean', 'Single domain check: availability is boolean');
  assert(comDomain.checked !== undefined, 'Single domain check: has timestamp');

  // Test 2: Check single .ai domain
  const aiDomain = await checkDomain('myapp.ai');
  assert(aiDomain.domain === 'myapp.ai', '.ai domain check: domain normalized');
  assert(aiDomain.estimatedPrice > 0, '.ai domain check: has price estimate');

  // Test 3: Price estimation
  const comPrice = comDomain.estimatedPrice;
  const aiPrice = aiDomain.estimatedPrice;
  assert(
    comPrice < aiPrice,
    `Price estimation: .com (${comPrice}) cheaper than .ai (${aiPrice})`
  );

  // Test 4: Batch check
  const batch = await checkDomains(['test.com', 'startup.ai', 'app.dev']);
  assert(Array.isArray(batch.results), 'Batch check: returns array');
  assert(batch.results.length === 3, 'Batch check: correct count');
  assert(typeof batch.available === 'number', 'Batch check: count of available domains');

  // Test 5: Invalid input handling
  const invalid = await checkDomain('');
  assert(invalid.error !== undefined, 'Invalid input: returns error for empty domain');

  // Test 6: Fallback mode (no API key)
  const fallback = await checkDomain('fallback-test.com');
  assert(
    fallback.source === 'fallback' || fallback.source === 'whois',
    'Fallback: has source'
  );

  // Test 7: Case normalization
  const uppercase = await checkDomain('EXAMPLE.COM');
  assert(uppercase.domain === 'example.com', 'Case normalization: lowercased domain');

  // Test 8: Whitespace trimming
  const whitespace = await checkDomain('  example.com  ');
  assert(whitespace.domain === 'example.com', 'Whitespace trimming: trimmed domain');

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

// Gemini name generation tests — run: node src/gemini_names.test.js
import { generateNamesViaGemini } from './gemini_names.js';

let pass = 0, fail = 0;
const ok = (cond, name) => { cond ? pass++ : (fail++, console.error('FAIL:', name)); };
const throws = (fn, name) => { try { fn(); fail++; console.error('FAIL (no throw):', name); } catch { pass++; } };

// --- RED: test fails because generateNamesViaGemini doesn't exist yet
ok(typeof generateNamesViaGemini === 'function', 'generateNamesViaGemini is exported');

// --- RED: test fails because we cannot call it without an API key
const testNoKey = async () => {
  try {
    await generateNamesViaGemini('A booking app for restaurants', { apiKey: null });
    fail++; console.error('FAIL: should throw when apiKey is null');
  } catch (e) {
    if (e.message.includes('API key')) pass++;
    else { fail++; console.error('FAIL: wrong error message:', e.message); }
  }
};
await testNoKey();

// --- RED: test structure (will skip live API calls in CI)
const testStructure = async () => {
  try {
    const result = await generateNamesViaGemini('A booking app for restaurants', { 
      apiKey: 'test-key-only-for-structure',
      dryRun: true // Skip actual API call
    });
    ok(Array.isArray(result.names), 'returns array of names');
    ok(result.names.length >= 1, 'returns at least one name');
    ok(result.names[0].name && result.names[0].rationale, 'each name has name and rationale');
    ok(result.source === 'gemini', 'source is marked as gemini');
  } catch (e) {
    console.error('FAIL: structure test threw:', e.message);
    fail++;
  }
};
await testStructure();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

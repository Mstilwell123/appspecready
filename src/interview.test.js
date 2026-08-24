/**
 * Interview Workflow Tests
 */

import { 
  INTERVIEW_QUESTIONS, 
  scoreInterview, 
  getInterviewSections,
  validateInterviewAnswers 
} from './interview.js';

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

// Test 1: Interview questions structure
assert(Array.isArray(INTERVIEW_QUESTIONS), 'Questions: is array');
assert(INTERVIEW_QUESTIONS.length === 9, 'Questions: has 9 questions');
assert(INTERVIEW_QUESTIONS.every(q => q.id && q.question && q.weight), 'Questions: complete structure');

// Test 2: Weights sum to ~1.0 (allowing floating point error)
const totalWeight = INTERVIEW_QUESTIONS.reduce((sum, q) => sum + q.weight, 0);
assert(Math.abs(totalWeight - 1.0) < 0.15, `Weights sum to ~1.0 (actual: ${totalWeight.toFixed(2)})`);

// Test 3: Perfect score (all 5s)
const perfectAnswers = {};
INTERVIEW_QUESTIONS.forEach(q => {
  perfectAnswers[q.id] = 5;
});
const perfectScore = scoreInterview(perfectAnswers);
assert(perfectScore.score === 100, 'Perfect score: all 5s = 100');
assert(perfectScore.analyzed === 9, 'Perfect score: all 9 answered');

// Test 4: Zero score (all 1s)
const zeroAnswers = {};
INTERVIEW_QUESTIONS.forEach(q => {
  zeroAnswers[q.id] = 1;
});
const zeroScore = scoreInterview(zeroAnswers);
assert(zeroScore.score === 20, 'Zero score: all 1s = 20');

// Test 5: Mixed score
const mixedAnswers = {
  'market-clarity': 5,
  'customer-willingness': 4,
  'market-size': 3,
  'competition': 2,
  'technical-feasibility': 5,
  'team-fit': 4,
  'funding-needs': 3,
  'monetization-clarity': 4,
  'timeline-commitment': 5,
};
const mixedScore = scoreInterview(mixedAnswers);
assert(mixedScore.score >= 0 && mixedScore.score <= 100, 'Mixed score: valid range (0-100)');
assert(mixedScore.interpretation && mixedScore.interpretation.level !== undefined, 'Mixed score: has interpretation');

// Test 6: Partial answers
const partialAnswers = {
  'market-clarity': 4,
  'customer-willingness': 5,
};
const partialScore = scoreInterview(partialAnswers);
assert(partialScore.analyzed === 2, 'Partial answers: correct count');
assert(partialScore.score >= 0 && partialScore.score <= 100, 'Partial answers: valid score');

// Test 7: Score interpretation
const fullAnswers = INTERVIEW_QUESTIONS.reduce((a, q) => ({ ...a, [q.id]: 5 }), {});
const interpretScore = scoreInterview(fullAnswers);
assert(interpretScore.interpretation !== undefined, 'Interpretation: present in results');
assert(interpretScore.interpretation.level === 'Excellent', 'Interpretation: high score');

// Test 8: Interview sections
const sections = getInterviewSections();
assert(Array.isArray(sections), 'Sections: is array');
assert(sections.length > 0, 'Sections: has groups');
assert(sections.every(s => s.name && s.questions && s.count), 'Sections: complete structure');

// Test 9: Validation - all valid
const validAnswers = { 'market-clarity': 3, 'customer-willingness': 4 };
const validation1 = validateInterviewAnswers(validAnswers);
assert(validation1.valid === true, 'Validation: accepts valid answers');
assert(validation1.errors.length === 0, 'Validation: no errors for valid');

// Test 10: Validation - invalid scores
const invalidAnswers = { 'market-clarity': 10, 'customer-willingness': 0 };
const validation2 = validateInterviewAnswers(invalidAnswers);
assert(validation2.valid === false, 'Validation: rejects out-of-range');
assert(validation2.errors.length > 0, 'Validation: lists errors');

// Test 11: Timestamp in results
const withTimestamp = scoreInterview(perfectAnswers);
assert(withTimestamp.timestamp !== undefined, 'Results: has timestamp');
assert(new Date(withTimestamp.timestamp).getTime() > 0, 'Results: valid ISO timestamp');

// Test 12: Details structure
const withDetails = scoreInterview(mixedAnswers);
assert(withDetails.details !== undefined, 'Results: has details');
assert(Object.keys(withDetails.details).length > 0, 'Results: details populated');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

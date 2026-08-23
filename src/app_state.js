const CHECK_KEYS = ['availability', 'domain', 'affordability', 'trademark'];
const DISCLAIMER = 'AppSpecReady.ai provides recommendations and preliminary trademark screening, not legal clearance. The founder makes the final decision and should consult a qualified trademark professional for high-stakes use.';

const NAME_SETS = [
  ['ClearPathly', 'NameHarbor', 'LaunchLoom', 'BrightWedge', 'ReadyNest', 'SignalSpring'],
  ['FollowPilot', 'ClientHarbor', 'NextStep Desk', 'TaskCurrent', 'RelayNest', 'PromptLedger'],
  ['IdeaBeacon', 'SpecHarbor', 'BuildSignal', 'VentureMap', 'ScopePilot', 'LaunchProof'],
];

function now() { return new Date().toISOString(); }
function clone(value) { return structuredClone(value); }
function slug(name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24); }

function mockCheck(status, label, detail, source) {
  return { status, label, detail, source, checkedAt: now(), isMock: true };
}

function makeCandidate(name, index, maxAnnualPrice = 100) {
  const tld = index % 3 === 1 ? '.com' : '.ai';
  const profiles = [
    ['pass', 'pass', 'pass', 'review'],
    ['pass', 'pass', 'pass', 'pass'],
    ['pass', 'fail', 'fail', 'pass'],
    ['review', 'pass', 'pass', 'review'],
    ['pass', 'pass', 'review', 'pass'],
    ['fail', 'review', 'pass', 'fail'],
  ];
  const [availability, domain, profileAffordability, trademark] = profiles[index];
  const estimatedAnnualPrice = [79, 49, 2500, 39, 149, 29][index];
  const affordability = estimatedAnnualPrice > maxAnnualPrice ? 'fail' : profileAffordability === 'review' ? 'review' : 'pass';
  return {
    id: `candidate-${index + 1}`,
    name,
    domain: `${slug(name)}${tld}`,
    rationale: [
      'Short, directional, and easy to say aloud.',
      'Plainspoken and closely tied to the product promise.',
      'Distinctive enough to support a memorable identity.',
      'Signals progress without overpromising an outcome.',
      'Professional tone suitable for a software product.',
      'A more adventurous option that needs extra review.',
    ][index],
    checks: {
      availability: mockCheck(availability, availability === 'fail' ? 'Possible conflict' : availability === 'review' ? 'Review needed' : 'No exact match shown', 'Prototype search across example app and company records.', 'Mock web search'),
      domain: mockCheck(domain, domain === 'fail' ? 'Not available' : domain === 'review' ? 'Verify at registrar' : 'Appears available', domain === 'fail' ? 'Example domain is shown as already registered.' : `Preview for ${slug(name)}${tld}.`, 'Mock registrar preview'),
      affordability: mockCheck(affordability, affordability === 'fail' ? 'Above budget' : affordability === 'review' ? 'Renewal price unclear' : 'Within budget', affordability === 'fail' ? `Mock estimate of $${estimatedAnnualPrice}/year exceeds your $${maxAnnualPrice} budget.` : `Mock estimate: $${estimatedAnnualPrice}/year against your $${maxAnnualPrice} budget. Checkout and renewal price must be verified.`, 'Mock registrar preview'),
      trademark: mockCheck(trademark, trademark === 'fail' ? 'Possible conflict' : trademark === 'review' ? 'Similar marks found' : 'No obvious conflict shown', trademark === 'pass' ? 'No obvious software-category conflict in mock results.' : 'Review similar wording and classes before relying on this name.', 'Mock trademark screen'),
    },
  };
}

export function createNamingProject() {
  return {
    version: 1,
    stage: 'brief',
    brief: '',
    preferences: { tone: 'Clear and professional', extension: 'Either .com or .ai', maxAnnualPrice: 100 },
    candidates: [],
    selectedCandidateId: null,
    finalDecision: null,
    createdAt: now(),
    updatedAt: now(),
  };
}

export function updateBrief(project, brief, preferences = {}) {
  const p = clone(project);
  p.brief = String(brief || '').trim();
  p.preferences = { ...p.preferences, ...preferences };
  p.updatedAt = now();
  return p;
}

export function generateCandidates(project) {
  if (project.brief.trim().length < 12) throw new Error('Describe the app in at least one meaningful sentence.');
  const p = clone(project);
  const seed = [...p.brief].reduce((sum, char) => sum + char.charCodeAt(0), 0) % NAME_SETS.length;
  p.candidates = NAME_SETS[seed].map((name, index) => makeCandidate(name, index, Number(p.preferences.maxAnnualPrice) || 100));
  p.selectedCandidateId = null;
  p.finalDecision = null;
  p.stage = 'results';
  p.updatedAt = now();
  return p;
}

export function updateCheck(project, candidateId, checkKey, result) {
  if (!CHECK_KEYS.includes(checkKey)) throw new Error('Unknown check type');
  const p = clone(project);
  const candidate = p.candidates.find(item => item.id === candidateId);
  if (!candidate) throw new Error('Candidate not found');
  candidate.checks[checkKey] = { ...candidate.checks[checkKey], ...result, checkedAt: now(), isMock: result.source?.toLowerCase().startsWith('mock') ?? false };
  p.updatedAt = now();
  return p;
}

export function candidateScore(candidate) {
  return CHECK_KEYS.reduce((score, key) => score + ({ pass: 3, review: 1, pending: 0, fail: -5 }[candidate.checks[key].status] ?? 0), 0);
}

export function getRecommendation(project) {
  return [...project.candidates].filter(candidate => !Object.values(candidate.checks).some(check => check.status === 'fail')).sort((a, b) => candidateScore(b) - candidateScore(a))[0] || null;
}

export function selectCandidate(project, candidateId) {
  if (!project.candidates.some(candidate => candidate.id === candidateId)) throw new Error('Candidate not found');
  const p = clone(project);
  p.selectedCandidateId = candidateId;
  p.stage = 'compare';
  p.updatedAt = now();
  return p;
}

export function canFinalize(project) {
  const candidate = project.candidates.find(item => item.id === project.selectedCandidateId);
  const resolvedStatuses = new Set(['pass', 'review']);
  return Boolean(candidate && CHECK_KEYS.every(key => candidate.checks?.[key] && resolvedStatuses.has(candidate.checks[key].status)));
}

export function finalizeSelection(project) {
  if (!canFinalize(project)) throw new Error('This candidate cannot be finalized while a check has failed.');
  const p = clone(project);
  const candidate = p.candidates.find(item => item.id === p.selectedCandidateId);
  p.finalDecision = { name: candidate.name, domain: candidate.domain, checks: clone(candidate.checks), disclaimer: DISCLAIMER, approvedAt: now() };
  p.stage = 'decision';
  p.updatedAt = now();
  return p;
}

export function buildReport(project) {
  if (!project.finalDecision) throw new Error('Finalize a name before building the report.');
  return {
    title: 'App name discovery report',
    brief: project.brief,
    name: project.finalDecision.name,
    domain: project.finalDecision.domain,
    checks: CHECK_KEYS.map(key => ({ key, ...project.finalDecision.checks[key] })),
    approvedAt: project.finalDecision.approvedAt,
    disclaimer: DISCLAIMER,
    containsMockData: CHECK_KEYS.some(key => project.finalDecision.checks[key].isMock),
  };
}

export function resetProject() { return createNamingProject(); }
export { CHECK_KEYS, DISCLAIMER };

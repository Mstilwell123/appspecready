import {
  createNamingProject, updateBrief, generateCandidates, selectCandidate,
  getRecommendation, candidateScore, canFinalize, finalizeSelection,
  buildReport, buildPack, resetProject, updateInterview, CHECK_KEYS
} from './app_state.js';
import { INTERVIEW_QUESTIONS } from './interview.js';

const STORAGE_KEY = 'appspecready.naming-project.v1';
const CHECK_LABELS = { availability: 'Existing name usage', domain: 'Domain availability', affordability: 'Domain affordability', trademark: 'Trademark screen' };
const $ = id => document.getElementById(id);
const views = ['brief', 'results', 'compare', 'decision'];
let project = createNamingProject();
let activeFilter = 'all';
let savedProject = loadSaved();

function validSavedProject(value) {
  return Boolean(value && value.version === 1 && ['brief','results','compare','decision'].includes(value.stage) && typeof value.brief === 'string' && value.preferences && Array.isArray(value.candidates));
}
function loadSaved() { try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY)); return validSavedProject(value) ? value : null; } catch { return null; } }
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    savedProject = structuredClone(project);
    $('save-status').textContent = `Saved on this device · ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  } catch {
    $('save-status').textContent = 'Could not save on this device';
    toast('This browser could not save the project. You can continue, but refresh will lose your work.');
  }
}
function toast(message) { const el = $('toast'); el.textContent = message; el.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { el.hidden = true; }, 2600); }
function icon(status) { return status === 'pass' ? '✓' : status === 'fail' ? '×' : '!'; }
function safeText(el, text) { el.textContent = String(text ?? ''); }

function renderInterview() {
  const container = $('interview-questions');
  if (!container) return;
  const answers = project.interview?.answers || {};
  container.replaceChildren();
  INTERVIEW_QUESTIONS.forEach((question, index) => {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'interview-question';
    const legend = document.createElement('legend');
    legend.textContent = `${index + 1}. ${question.question}`;
    const hint = document.createElement('p');
    hint.className = 'interview-hint';
    hint.textContent = question.hint;
    const choices = document.createElement('div');
    choices.className = 'interview-choices';
    Object.entries(question.scale).forEach(([value, label]) => {
      const choice = document.createElement('label');
      choice.className = 'interview-choice';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = `interview-${question.id}`; input.value = value;
      input.checked = Number(answers[question.id]) === Number(value);
      input.addEventListener('change', () => {
        project = updateInterview(project, { [question.id]: Number(value) });
        persist();
        renderInterviewSummary();
      });
      const copy = document.createElement('span');
      copy.textContent = `${value} — ${label}`;
      choice.append(input, copy); choices.append(choice);
    });
    fieldset.append(legend, hint, choices); container.append(fieldset);
  });
  renderInterviewSummary();
}

function renderInterviewSummary() {
  const interview = project.interview || { analyzed: 0, totalQuestions: 9, score: 0, interpretation: null };
  safeText($('interview-progress'), `${interview.analyzed || 0} of ${interview.totalQuestions || 9} answered`);
  if (!interview.analyzed) {
    safeText($('interview-score'), 'Not scored yet');
    safeText($('interview-guidance'), 'Choose one answer for each question to see a weighted planning score.');
    return;
  }
  const interpretation = interview.interpretation || {};
  safeText($('interview-score'), `${interview.score}/100 · ${interpretation.level || 'In progress'}`);
  safeText($('interview-guidance'), `${interpretation.emoji || '•'} ${interpretation.recommendation || 'Complete more questions for guidance.'}`);
}

function showView(stage, { focus = true } = {}) {
  views.forEach(name => { $(`view-${name}`).hidden = name !== stage; });
  document.querySelectorAll('.step').forEach((step, index) => {
    const stepStage = step.dataset.step;
    const current = views.indexOf(stage);
    step.classList.toggle('active', stepStage === stage);
    step.classList.toggle('complete', index < current);
    if (stepStage === stage) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
    step.disabled = index > current || (stepStage === 'compare' && !project.selectedCandidateId) || (stepStage === 'decision' && !project.finalDecision);
  });
  project.stage = stage;
  $('project-title').textContent = project.finalDecision?.name || project.brief.slice(0, 42) || 'New naming project';
  document.querySelector('.sidebar').classList.remove('open');
  $('menu-toggle').setAttribute('aria-expanded', 'false');
  if (focus) { window.scrollTo({ top: 0, behavior: 'smooth' }); $('main').focus(); }
}

function renderCandidates() {
  const recommended = getRecommendation(project);
  let items = [...project.candidates];
  if (activeFilter === 'clear') items = items.filter(c => Object.values(c.checks).every(x => x.status !== 'fail'));
  if (activeFilter === 'review') items = items.filter(c => Object.values(c.checks).some(x => x.status === 'review' || x.status === 'fail'));
  if ($('sort').value === 'az') items.sort((a,b) => a.name.localeCompare(b.name));
  else items.sort((a,b) => candidateScore(b) - candidateScore(a));
  const grid = $('candidate-grid'); grid.replaceChildren();
  $('empty-results').hidden = items.length > 0;
  items.forEach(candidate => {
    const card = document.createElement('article');
    card.className = `surface candidate-card${recommended?.id === candidate.id ? ' recommended' : ''}`;
    const top = document.createElement('div'); top.className = 'card-top';
    const info = document.createElement('div');
    const name = document.createElement('h2'); name.className = 'candidate-name'; safeText(name, candidate.name);
    const domain = document.createElement('div'); domain.className = 'candidate-domain'; safeText(domain, candidate.domain);
    const rationale = document.createElement('p'); rationale.className = 'candidate-rationale'; safeText(rationale, candidate.rationale);
    info.append(name, domain, rationale); top.append(info);
    if (recommended?.id === candidate.id) { const badge = document.createElement('span'); badge.className = 'recommend-badge'; badge.textContent = 'Recommended'; top.append(badge); }
    const checks = document.createElement('div'); checks.className = 'mini-checks';
    CHECK_KEYS.forEach(key => {
      const result = candidate.checks[key]; const row = document.createElement('div'); row.className = `mini-check ${result.status}`;
      const mark = document.createElement('span'); mark.className = 'status-dot'; mark.textContent = icon(result.status);
      const label = document.createElement('span'); label.textContent = CHECK_LABELS[key];
      row.append(mark, label); checks.append(row);
    });
    const choose = document.createElement('button'); choose.className = 'secondary candidate-action'; choose.type = 'button'; choose.textContent = 'Review this name';
    choose.addEventListener('click', () => { project = selectCandidate(project, candidate.id); persist(); renderCompare(); showView('compare'); });
    card.append(top, checks, choose); grid.append(card);
  });
}

function renderCompare() {
  const candidate = project.candidates.find(c => c.id === project.selectedCandidateId); if (!candidate) return;
  const recommended = getRecommendation(project);
  safeText($('selected-name'), candidate.name); safeText($('selected-domain'), candidate.domain); safeText($('selected-rationale'), candidate.rationale);
  $('selection-badge').textContent = candidate.id === recommended?.id ? 'Recommended candidate' : 'Selected candidate';
  const list = $('check-list'); list.replaceChildren();
  CHECK_KEYS.forEach(key => {
    const result = candidate.checks[key]; const row = document.createElement('div'); row.className = `check-row ${result.status}`;
    const mark = document.createElement('span'); mark.className = 'check-icon'; mark.textContent = icon(result.status);
    const copy = document.createElement('div'); copy.className = 'check-copy';
    const title = document.createElement('b'); title.textContent = CHECK_LABELS[key];
    const label = document.createElement('span'); label.textContent = result.label;
    const detail = document.createElement('small'); detail.textContent = result.detail;
    copy.append(title, label, detail);
    const source = document.createElement('span'); source.className = 'check-source'; source.textContent = `${result.source}\n${result.isMock ? 'Simulated' : 'Provider result'}`;
    row.append(mark, copy, source); list.append(row);
  });
  const allowed = canFinalize(project); $('finalize-button').disabled = !allowed;
  $('decision-guidance').textContent = allowed ? 'No check has failed. Review cautions, then record your decision if you are comfortable proceeding.' : 'This name has a failed check and cannot be finalized. Choose another candidate or re-check it with a live provider.';
}

function renderDecision() {
  const report = buildReport(project);
  ['final-name','report-name'].forEach(id => safeText($(id), report.name)); safeText($('report-domain'), report.domain);
  safeText($('approved-date'), `Recorded ${new Date(report.approvedAt).toLocaleDateString()}`); safeText($('report-disclaimer'), report.disclaimer);
  const dl = $('report-checks'); dl.replaceChildren();
  report.checks.forEach(check => { const wrap = document.createElement('div'); const dt = document.createElement('dt'); dt.textContent = CHECK_LABELS[check.key]; const dd = document.createElement('dd'); dd.textContent = `${check.label} — ${check.detail} Source: ${check.source}${check.isMock ? ' (simulated result)' : ''}`; wrap.append(dt, dd); dl.append(wrap); });
  $('report-mock-warning').hidden = !report.containsMockData;
}

function restoreProject(saved) {
  project = structuredClone(saved);
  if (!project.interview) project = updateInterview(project, {});
  $('app-brief').value = project.brief || ''; $('tone').value = project.preferences?.tone || 'Clear and professional'; $('extension').value = project.preferences?.extension || 'Either .com or .ai'; $('budget').value = project.preferences?.maxAnnualPrice || 100; updateCount();
  renderInterview();
  if (project.stage === 'results') renderCandidates(); if (project.stage === 'compare') { renderCandidates(); renderCompare(); } if (project.stage === 'decision') { renderCandidates(); renderDecision(); }
  showView(project.stage || 'brief'); persist();
}
function updateCount() { $('char-count').textContent = `${$('app-brief').value.length} / 600`; }
function downloadReport() {
  const report = buildReport(project); const content = [`APPSPECREADY.AI — APP NAME DISCOVERY REPORT`,``,`App: ${report.brief}`,`Selected name: ${report.name}`,`Domain: ${report.domain}`,`Recorded: ${new Date(report.approvedAt).toLocaleString()}`,``,...report.checks.flatMap(c => [CHECK_LABELS[c.key].toUpperCase(),`${c.label}: ${c.detail}`,`Source: ${c.source}`,``]),`DISCLAIMER`,report.disclaimer].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type:'text/plain' })); a.download = `${report.name.replace(/[^a-z0-9]+/gi,'-')}-naming-report.txt`; a.click(); URL.revokeObjectURL(a.href);
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]); }
function downloadBuildPack() {
  const pack = buildPack(project);
  const answerRows = INTERVIEW_QUESTIONS.map(question => {
    const answer = pack.interview.answers?.[question.id];
    return `<tr><td>${escapeHtml(question.section)}</td><td>${escapeHtml(question.question)}</td><td>${answer ? `${answer}/5 — ${escapeHtml(question.scale[answer])}` : 'Not answered'}</td></tr>`;
  }).join('');
  const checkRows = pack.checks.map(check => `<tr><td>${escapeHtml(CHECK_LABELS[check.key])}</td><td>${escapeHtml(check.label)}</td><td>${escapeHtml(check.detail)}</td><td>${escapeHtml(check.source)}${check.isMock ? ' (preliminary/simulated)' : ''}</td></tr>`).join('');
  const score = pack.interview.score || 0;
  const level = pack.interview.interpretation?.level || 'Not scored';
  const guidance = pack.interview.interpretation?.recommendation || 'Complete the interview to add planning guidance.';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(pack.name)} — AppSpecReady Build Pack</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:40px auto;padding:0 24px;color:#182238;line-height:1.55}h1{color:#14213d}h2{margin-top:34px;border-bottom:2px solid #dce2ed;padding-bottom:7px}.eyebrow{font-size:12px;font-weight:bold;color:#3157d5;text-transform:uppercase;letter-spacing:.08em}.score{display:inline-block;background:#edf3ff;color:#14213d;padding:10px 14px;border-radius:8px;font-weight:bold}table{border-collapse:collapse;width:100%;margin:14px 0}th,td{border:1px solid #dce2ed;padding:10px;vertical-align:top;text-align:left}th{background:#f4f6fa}.note{background:#fff5df;border-left:4px solid #9a641b;padding:14px}.muted{color:#667086}</style></head><body><p class="eyebrow">AppSpecReady Build Pack v1</p><h1>${escapeHtml(pack.name)}</h1><p><b>Preferred domain:</b> ${escapeHtml(pack.domain)}<br><b>Founder decision recorded:</b> ${escapeHtml(new Date(pack.approvedAt).toLocaleString())}</p><h2>Product brief</h2><p>${escapeHtml(pack.brief)}</p><h2>Viability interview</h2><p class="score">Planning score: ${score}/100 · ${escapeHtml(level)}</p><p>${escapeHtml(guidance)}</p><p class="muted">${pack.interview.analyzed || 0} of ${pack.interview.totalQuestions || 9} questions answered. This is a planning aid, not a prediction of business success.</p><table><thead><tr><th>Area</th><th>Question</th><th>Founder answer</th></tr></thead><tbody>${answerRows}</tbody></table><h2>Preliminary name checks</h2><table><thead><tr><th>Check</th><th>Result</th><th>Detail</th><th>Source</th></tr></thead><tbody>${checkRows}</tbody></table>${pack.containsMockData ? '<p class="note"><b>Important:</b> One or more check results are preliminary or simulated. Verify domains with a registrar and obtain qualified legal advice before relying on a trademark conclusion.</p>' : ''}<h2>Founder responsibility</h2><p>${escapeHtml(pack.disclaimer)}</p></body></html>`;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type:'text/html' })); a.download = `${pack.name.replace(/[^a-z0-9]+/gi,'-')}-build-pack.html`; a.click(); URL.revokeObjectURL(a.href);
}

$('app-brief').addEventListener('input', updateCount);
$('brief-form').addEventListener('submit', async (event) => { 
  event.preventDefault(); 
  const brief = $('app-brief').value.trim(); 
  if (brief.length < 12) { 
    $('brief-error').hidden = false; 
    $('app-brief').focus(); 
    return; 
  } 
  $('brief-error').hidden = true; 
  $('generate-status').textContent = 'Generating names...';
  project = updateBrief(project, brief, { tone:$('tone').value, extension:$('extension').value, maxAnnualPrice:Number($('budget').value) || 100 }); 
  project = await generateCandidates(project, { 
    endpoint: 'https://web-production-e3722.up.railway.app/api/generate-names' 
  }); // Now async, calls production server
  persist(); 
  renderCandidates(); 
  showView('results'); 
  const source = project.candidates[0]?.sourceProvider === 'mock' ? 'mock frontend data' : 'AI-generated names (Gemini)';
  toast(`Names generated from ${source}.`); 
  $('generate-status').textContent = '';
});
$('edit-brief').addEventListener('click', () => showView('brief'));
$('back-results').addEventListener('click', () => { renderCandidates(); showView('results'); });
$('change-selection').addEventListener('click', () => { renderCandidates(); showView('results'); });
$('finalize-button').addEventListener('click', () => { project = finalizeSelection(project); persist(); renderDecision(); showView('decision'); toast('Founder naming decision recorded.'); });
$('print-report').addEventListener('click', () => window.print()); $('download-report').addEventListener('click', downloadReport); $('download-build-pack').addEventListener('click', downloadBuildPack);
['new-project','reset-button'].forEach(id => $(id).addEventListener('click', () => { if (!confirm('Start over and remove the saved naming project from this device?')) return; project = resetProject(); try { localStorage.removeItem(STORAGE_KEY); } catch {} savedProject = null; $('resume-button').hidden = true; $('app-brief').value=''; updateCount(); showView('brief'); toast('Naming project cleared.'); }));
$('resume-button').addEventListener('click', () => { restoreProject(savedProject); $('resume-button').hidden = true; toast('Saved naming project restored.'); });
$('menu-toggle').addEventListener('click', () => { const side=document.querySelector('.sidebar'); const open=side.classList.toggle('open'); $('menu-toggle').setAttribute('aria-expanded',String(open)); });
function renderFilterState() { document.querySelectorAll('.filter').forEach(button => { const active = button.dataset.filter === activeFilter; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); }); }
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => { activeFilter=button.dataset.filter; renderFilterState(); renderCandidates(); }));
document.querySelector('[data-filter-reset]').addEventListener('click', () => { activeFilter='all'; renderFilterState(); renderCandidates(); });
$('sort').addEventListener('change', renderCandidates);
document.querySelectorAll('.step').forEach(step => step.addEventListener('click', () => { if (!step.disabled) { if (step.dataset.step==='results') renderCandidates(); if(step.dataset.step==='compare') renderCompare(); if(step.dataset.step==='decision') renderDecision(); showView(step.dataset.step); } }));

updateCount(); renderInterview(); showView('brief', { focus:false });
renderFilterState();
if (savedProject?.brief) $('resume-button').hidden = false;

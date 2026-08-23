// AppSpecReady.ai — Adaptive Interview & Question Selection Engine (Milestone 3)
// Implements FR-INT-01..09, FR-CON-01..02, Stage 2 Problem Discovery

export const INTERVIEW_DOMAINS = [
  'user_persona',
  'problem_frequency_severity',
  'current_workarounds',
  'switching_hurdles',
  'economic_buyer_vs_user',
  'third_party_dependencies',
  'data_security_privacy'
];

export class InterviewEngine {
  constructor(decisionEngine) {
    this.decisionEngine = decisionEngine;
  }

  // FR-INT-03: Priority order for next question:
  // 1. Critical blocker / missing gate requirements
  // 2. Contradiction / Conflict resolution
  // 3. High-risk assumption needing evidence
  // 4. Highest-value unanswered domain
  getNextQuestion(goalStatement) {
    // 1. Check for active conflicts
    const conflicts = [...this.decisionEngine.decisions.values()].filter(d => d.state === 'Conflict');
    if (conflicts.length > 0) {
      const c = conflicts[0];
      return {
        type: 'conflict_resolution',
        domain: c.domain,
        question: `We noticed a contradiction in ${c.domain}: ${c.question}. How would you like to resolve this?`,
        why: 'Contradictions must be resolved by the founder before downstream technical decisions are locked in (FR-CON-02).'
      };
    }

    // 2. Check for unanswered Stage 2 core discovery domains
    for (const domain of INTERVIEW_DOMAINS) {
      const existing = this.decisionEngine.byDomain(domain);
      if (existing.length === 0 || existing.some(d => d.state === 'Unasked')) {
        return this.generateDomainQuestion(domain, goalStatement);
      }
    }

    return {
      type: 'complete',
      message: 'Stage 2 Problem & Experience Discovery complete. Ready for Viability & Vendor Analysis.',
      why: 'All core decision domains have been explored and recorded.'
    };
  }

  generateDomainQuestion(domain, goal) {
    const templates = {
      user_persona: {
        question: `Specifically who is the primary person using this app on a daily basis?`,
        why: 'Defining a specific user persona prevents AI builders from guessing generic workflows and permissions.'
      },
      problem_frequency_severity: {
        question: `How often does this problem occur, and what happens when it goes unsolved?`,
        why: 'Urgency and frequency determine if this is a high-retention pain point or an occasional nice-to-have.'
      },
      current_workarounds: {
        question: `How is your target user dealing with this problem right now without your app?`,
        why: 'Understanding existing manual habits (spreadsheets, texts, sticky notes) reveals what habits your app must replace.'
      },
      switching_hurdles: {
        question: `Why might a user resist switching or just continue doing nothing?`,
        why: 'Inertia is the #1 competitor for new SaaS products.'
      },
      economic_buyer_vs_user: {
        question: `Is the person using the app also the person paying for it?`,
        why: 'B2B workflows separate user permissions from billing administration.'
      },
      third_party_dependencies: {
        question: `Will your app need to connect to outside services like credit card processing, text messaging, or external APIs?`,
        why: 'Identifying 3rd-party services early prevents walled-garden lock-in and defines founder credential boundaries (Stage 6b).'
      },
      data_security_privacy: {
        question: `Will your users be storing sensitive customer info, payment data, or confidential notes?`,
        why: 'Determines database Row-Level Security rules, encryption, and compliance tier.'
      }
    };

    const q = templates[domain] || {
      question: `Tell us more about the ${domain} requirements for this app.`,
      why: 'Needed to establish reliable architecture specifications.'
    };

    return {
      type: 'discovery',
      domain,
      question: q.question,
      why: q.why
    };
  }
}

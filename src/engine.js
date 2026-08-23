// AppSpecReady.ai — Decision Engine (Milestone 2)
// Deterministic state machine + gate framework (PRD v4 §11, DM-02).
// Language models may propose, but ONLY this engine changes decision state,
// and "Approved" requires an explicit founder action (P-05).

export const STATES = [
  'Unasked', 'Asked', 'Partial', 'Proposed', 'Needs Evidence',
  'Assumption', 'Unknown', 'Conflict', 'Approved', 'Deferred',
  'Rejected', 'Superseded',
];

// Legal transitions — deterministic and auditable (DM-02).
const TRANSITIONS = {
  Unasked:           ['Asked'],
  Asked:             ['Partial', 'Proposed', 'Unknown'],
  Partial:           ['Proposed', 'Unknown'],
  Proposed:          ['Approved', 'Assumption', 'Needs Evidence', 'Conflict', 'Rejected'],
  'Needs Evidence':  ['Proposed', 'Assumption', 'Unknown'],
  Assumption:        ['Proposed', 'Conflict', 'Approved'],   // Approved only via explicit owner acceptance
  Unknown:           ['Asked', 'Assumption'],
  Conflict:          ['Proposed'],                            // conflicts resolve only to a new proposal — never silently (FR-CON-02)
  Approved:          ['Superseded'],                          // changing an approved decision = new version (FR-CON-03)
  Deferred:          ['Asked', 'Proposed'],
  Rejected:          ['Asked'],
  Superseded:       [],                                       // terminal; immutable history
};

// Which transitions require the founder (not the system) to trigger
const OWNER_ONLY = new Set(['Proposed->Approved', 'Assumption->Approved', 'Conflict->Proposed']);

export class DecisionEngine {
  constructor() {
    this.decisions = new Map();   // id -> decision record
    this.history = [];            // append-only audit trail (NFR-04)
  }

  add(decision) {
    const d = {
      id: decision.id ?? crypto.randomUUID(),
      domain: decision.domain,
      question: decision.question ?? '',
      rawAnswer: null,
      interpretation: null,
      approvedAnswer: null,
      state: 'Unasked',
      confidence: 0,
      version: 1,
      changeReason: null,
      createdAt: new Date().toISOString(),
      ...decision,
    };
    this.decisions.set(d.id, d);
    this.#log(d.id, 'created', d.state);
    return d;
  }

  // The ONLY way state changes. actor: 'founder' | 'system'
  transition(id, toState, actor, patch = {}) {
    const d = this.decisions.get(id);
    if (!d) throw new Error(`Unknown decision ${id}`);
    const key = `${d.state}->${toState}`;
    if (!TRANSITIONS[d.state].includes(toState)) {
      throw new Error(`Illegal transition: ${key}`);
    }
    if (OWNER_ONLY.has(key) && actor !== 'founder') {
      throw new Error(`Owner approval required for ${key} (P-05)`);
    }
    if (toState === 'Superseded' && !patch.changeReason) {
      throw new Error('Superseding requires a change reason (FR-CON-03)');
    }
    const from = d.state;
    Object.assign(d, patch, { state: toState });
    if (toState === 'Approved') d.approvedAt = new Date().toISOString();
    if (toState === 'Superseded') d.version += 1;
    this.#log(id, `${from} -> ${toState}`, actor, patch.changeReason ?? null);
    return d;
  }

  #log(id, action, detail, reason) {
    this.history.push({ id, action, detail, reason, at: new Date().toISOString() });
  }

  byDomain(domain) {
    return [...this.decisions.values()].filter((d) => d.domain === domain);
  }

  // FR-INT-08: progress by decision domain — never a raw question count.
  progress() {
    const out = {};
    for (const d of this.decisions.values()) {
      out[d.domain] ??= { total: 0, approved: 0, blockers: 0 };
      out[d.domain].total++;
      if (d.state === 'Approved') out[d.domain].approved++;
      if (d.state === 'Conflict' || d.state === 'Needs Evidence') out[d.domain].blockers++;
    }
    return out;
  }

  serialize() {
    return {
      decisions: [...this.decisions.values()],
      history: this.history,
    };
  }

  static restore(data) {
    const e = new DecisionEngine();
    for (const d of data.decisions ?? []) e.decisions.set(d.id, d);
    e.history = data.history ?? [];
    return e;
  }
}

// ---------- Gate framework (PRD v4 §6) ----------
// Each gate is a pure function over engine state. No gate can be passed
// by a score alone (FR-VIA-03) — criteria are explicit and checkable.
export const GATES = {
  G1: {
    name: 'Capture',
    check(engine) {
      const missing = [];
      for (const domain of ['goal', 'user', 'problem', 'outcome']) {
        const ds = engine.byDomain(domain);
        if (!ds.some((d) => d.state === 'Approved')) {
          missing.push(domain === 'goal' ? 'Goal' : domain);
        }
      }
      return { passed: missing.length === 0, missing };
    },
  },
  G1b: {
    name: 'Name check',
    check(engine) {
      const d = engine.byDomain('name').find((x) => x.state === 'Approved');
      return { passed: Boolean(d), missing: d ? [] : ['approved name'] };
    },
  },
};

export function gateStatus(engine) {
  return Object.entries(GATES).map(([id, g]) => ({ id, name: g.name, ...g.check(engine) }));
}

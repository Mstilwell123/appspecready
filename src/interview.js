/**
 * Interview Questions & Scoring Engine
 * 9 core questions about app viability
 * Produces viability score (0-100)
 */

export const INTERVIEW_QUESTIONS = [
  {
    id: 'market-clarity',
    section: 'Market & Customer',
    question: 'How clearly can you describe the specific problem your app solves?',
    hint: 'e.g., "Restaurant managers waste 2+ hours/week managing walk-in waitlists"',
    type: 'scale',
    scale: {
      1: 'Vague idea, still figuring it out',
      2: 'General problem area, not specific',
      3: 'Clear problem, but for a broad audience',
      4: 'Specific problem for a defined customer',
      5: 'Crystal clear problem with quantified impact',
    },
    weight: 0.14, // Adjusted to sum to 1.0
  },
  {
    id: 'customer-willingness',
    section: 'Market & Customer',
    question: 'Would customers actively pay for a solution to this problem?',
    hint: 'Have you talked to potential users? Do they currently spend money on alternatives?',
    type: 'scale',
    scale: {
      1: 'Probably not — it\'s a "nice to have"',
      2: 'Maybe — depends on the price',
      3: 'Likely — they mention budgets for this',
      4: 'Very likely — they\'re actively looking',
      5: 'Absolutely — they\'re desperate for it',
    },
    weight: 0.14,
  },
  {
    id: 'market-size',
    section: 'Market & Customer',
    question: 'What\'s your estimate of potential customers (addressable market)?',
    hint: 'Can be rough: is it 100s, 1000s, millions, or more?',
    type: 'scale',
    scale: {
      1: 'Tiny niche (< 100 potential customers)',
      2: 'Small market (100 - 1K customers)',
      3: 'Medium market (1K - 100K customers)',
      4: 'Large market (100K - 1M customers)',
      5: 'Huge market (1M+ customers)',
    },
    weight: 0.12,
  },
  {
    id: 'competition',
    section: 'Competitive Landscape',
    question: 'How much direct competition exists?',
    hint: 'Are there established players? New startups? Or is it wide open?',
    type: 'scale',
    scale: {
      1: 'Dominated by entrenched players with high switching costs',
      2: 'Several established competitors with strong market share',
      3: 'Some competitors, but room for new approaches',
      4: 'Few competitors, mostly outdated solutions',
      5: 'No direct competitors (blue ocean)',
    },
    weight: 0.12,
  },
  {
    id: 'technical-feasibility',
    section: 'Execution',
    question: 'How complex is the technical build?',
    hint: 'Can it be built by a small team in 2-4 months?',
    type: 'scale',
    scale: {
      1: 'Very complex — requires specialized expertise',
      2: 'Significant complexity — 4+ months for MVP',
      3: 'Moderate — 2-3 months for solid MVP',
      4: 'Straightforward — 4-8 weeks for MVP',
      5: 'Simple — 1-3 weeks for working MVP',
    },
    weight: 0.12,
  },
  {
    id: 'team-fit',
    section: 'Execution',
    question: 'Does your team have relevant skills or experience?',
    hint: 'Prior experience in this market/tech, or willingness to learn?',
    type: 'scale',
    scale: {
      1: 'No relevant experience, steep learning curve',
      2: 'Some adjacent experience but not in this space',
      3: 'Experience in one key area (tech or market)',
      4: 'Experience in the market or strong technical skills',
      5: 'Strong background in both market and tech',
    },
    weight: 0.12,
  },
  {
    id: 'funding-needs',
    section: 'Resources',
    question: 'How much funding do you need to launch?',
    hint: 'Rough estimate: $10k, $100k, $1M+?',
    type: 'scale',
    scale: {
      1: '$1M+ funding required (high barrier)',
      2: '$500k - $1M (significant capital needed)',
      3: '$100k - $500k (moderate capital)',
      4: '$10k - $100k (bootstrap-friendly)',
      5: '< $10k (can bootstrap easily)',
    },
    weight: 0.11,
  },
  {
    id: 'monetization-clarity',
    section: 'Business Model',
    question: 'How confident are you about your monetization model?',
    hint: 'Subscription, one-time purchase, freemium, B2B, etc.?',
    type: 'scale',
    scale: {
      1: 'No clear model, still figuring it out',
      2: 'Rough idea, but uncertain about execution',
      3: 'Defined model, but unproven in market',
      4: 'Tested model with early traction',
      5: 'Proven model with paying customers',
    },
    weight: 0.11,
  },
  {
    id: 'timeline-commitment',
    section: 'Timeline',
    question: 'Are you committed to working on this full-time?',
    hint: 'This significantly affects execution speed and success',
    type: 'scale',
    scale: {
      1: 'Part-time / exploring, no commitment yet',
      2: 'Part-time, planning to go full-time later',
      3: 'Mostly full-time, some other commitments',
      4: 'Full-time commitment (1-2 other small projects)',
      5: 'Full-time, exclusive focus',
    },
    weight: 0.10,
  },
];

/**
 * Calculate viability score from interview answers
 * @param {object} answers - { questionId: score, ... }
 * @returns {object} { score: 0-100, details, analysis }
 */
export function scoreInterview(answers) {
  if (!answers || typeof answers !== 'object') {
    return { error: 'Invalid answers', score: 0 };
  }

  let totalScore = 0;
  let totalWeight = 0;
  const details = {};

  INTERVIEW_QUESTIONS.forEach(question => {
    const answer = answers[question.id];

    if (answer !== undefined && answer !== null) {
      // Normalize answer to 0-5 scale if needed
      const score = Math.max(0, Math.min(5, Number(answer)));
      const weighted = score * question.weight;

      totalScore += weighted;
      totalWeight += question.weight;

      details[question.id] = {
        answer: score,
        weight: question.weight,
        contribution: weighted,
        questionText: question.question,
      };
    }
  });

  // Convert to 0-100 scale
  const normalizedScore = totalWeight > 0 ? (totalScore / totalWeight) * 20 : 0; // Each question max is 5, so 5*20=100
  const finalScore = Math.round(Math.max(0, Math.min(100, normalizedScore)));

  return {
    score: finalScore,
    details,
    analyzed: Object.keys(details).length,
    totalQuestions: INTERVIEW_QUESTIONS.length,
    timestamp: new Date().toISOString(),
    interpretation: interpretScore(finalScore),
  };
}

/**
 * Interpret viability score with guidance
 * @param {number} score - 0-100 viability score
 * @returns {object} { level, recommendation, emoji }
 */
function interpretScore(score) {
  if (score >= 80) {
    return {
      level: 'Excellent',
      recommendation: 'This app shows strong market fit and feasibility. Consider building immediately.',
      emoji: '🚀',
      color: 'success',
    };
  } else if (score >= 65) {
    return {
      level: 'Strong',
      recommendation: 'Good fundamentals. Validate key assumptions before full build.',
      emoji: '👍',
      color: 'success',
    };
  } else if (score >= 50) {
    return {
      level: 'Moderate',
      recommendation: 'Viable but with some gaps. Address 2-3 critical questions before committing.',
      emoji: '⚠️',
      color: 'warning',
    };
  } else if (score >= 35) {
    return {
      level: 'Challenging',
      recommendation: 'Several concerns. Consider pivoting or deeply validating assumptions.',
      emoji: '❓',
      color: 'warning',
    };
  } else {
    return {
      level: 'At Risk',
      recommendation: 'Significant barriers to success. Strongly reconsider or make major changes.',
      emoji: '⛔',
      color: 'danger',
    };
  }
}

/**
 * Get interview section (question groupings)
 * @returns {array} Sections with their questions
 */
export function getInterviewSections() {
  const sections = {};

  INTERVIEW_QUESTIONS.forEach(q => {
    if (!sections[q.section]) {
      sections[q.section] = [];
    }
    sections[q.section].push(q);
  });

  return Object.entries(sections).map(([name, questions]) => ({
    name,
    questions,
    count: questions.length,
  }));
}

/**
 * Validate interview answers
 * @param {object} answers - User answers
 * @returns {object} { valid: bool, errors: [...] }
 */
export function validateInterviewAnswers(answers) {
  const errors = [];

  INTERVIEW_QUESTIONS.forEach(question => {
    const answer = answers[question.id];

    if (answer === undefined || answer === null) {
      // Optional for now
      return;
    }

    const score = Number(answer);
    if (isNaN(score) || score < 1 || score > 5) {
      errors.push(`${question.id}: Score must be 1-5`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    answered: Object.keys(answers).filter(
      k => answers[k] !== undefined && answers[k] !== null
    ).length,
  };
}

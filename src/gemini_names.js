// AppSpecReady.ai — Gemini name generation (ASR-03)
// Server-side only; API key never exposed to browser.
// Generates six app name candidates with rationales.

const GEMINI_MODEL = 'gemini-3.7-flash';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function generateNamesViaGemini(appBrief, options = {}) {
  const { apiKey = null, dryRun = false } = options;

  if (!apiKey) {
    throw new Error('API key required: generateNamesViaGemini(brief, { apiKey })');
  }

  // Dry run mode: return mock data for testing structure
  if (dryRun) {
    return {
      source: 'gemini',
      names: [
        { name: 'LaunchFlow', rationale: 'Clear, directional, describes app as enabler.' },
        { name: 'QuickStart', rationale: 'Fast, accessible, suggests ease of use.' },
        { name: 'StreamLine', rationale: 'Modern, professional, implies efficiency.' },
      ],
      usedTokens: 0,
    };
  }

  // Real API call to Gemini
  const systemPrompt = `You are a professional app naming strategist. Generate exactly six app name candidates for a SaaS product. 
Each name should be:
- Memorable and easy to say
- Suitable for domain registration (.com or .ai)
- Avoid trademarked names or obvious competitors
- Include a clear, one-sentence rationale for each

Return ONLY a JSON array with no markdown, no explanations, like:
[
  {"name": "...", "rationale": "..."},
  ...
]`;

  const userPrompt = `App description: ${appBrief}

Generate six distinctive app names.`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.7, // Creative but consistent
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 500,
      responseMimeType: 'application/json',
    },
  };

  const url = `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('Empty response from Gemini');
    }

    // Parse JSON response
    let names;
    try {
      names = JSON.parse(candidateText);
    } catch (e) {
      throw new Error(`Failed to parse Gemini JSON: ${candidateText}`);
    }

    // Ensure exactly 6 names
    if (!Array.isArray(names) || names.length === 0) {
      throw new Error('Gemini returned invalid names structure');
    }

    // Trim to 6 and validate structure
    const validNames = names
      .slice(0, 6)
      .filter(n => n.name && typeof n.name === 'string' && n.rationale && typeof n.rationale === 'string')
      .map(n => ({
        name: n.name.trim(),
        rationale: n.rationale.trim(),
      }));

    if (validNames.length === 0) {
      throw new Error('No valid names in Gemini response');
    }

    return {
      source: 'gemini',
      names: validNames,
      usedTokens: data.usageMetadata?.totalTokenCount || 0,
    };
  } catch (e) {
    throw new Error(`Gemini name generation failed: ${e.message}`);
  }
}

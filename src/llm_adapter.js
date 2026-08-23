// AppSpecReady.ai — LLM Provider Adapter (PRD v4 NFR-05, SEC-01)
// Provider-agnostic adapter boundary. Server-side only (Edge Function / Backend).
// Default configured provider: Google Gemini 3.7 Flash (Mountain View, CA, USA).

export class LLMAdapter {
  constructor(apiKey, model = 'gemini-3.7-flash') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateStructured(prompt, systemInstruction = '', schema = null) {
    if (!this.apiKey) {
      throw new Error('LLM API key not configured. SEC-01: Must be set in server-side secrets.');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
      generationConfig: {
        temperature: 0.2, // Low temperature for deterministic analysis and structured consistency
        responseMimeType: schema ? 'application/json' : 'text/plain',
        responseSchema: schema || undefined,
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('Empty response from Gemini 3.7 Flash');
    }

    if (schema) {
      try {
        return JSON.parse(candidateText);
      } catch (e) {
        throw new Error(`Failed to parse structured JSON from LLM response: ${candidateText}`);
      }
    }

    return candidateText;
  }
}

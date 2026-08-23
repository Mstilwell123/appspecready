import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.7-flash';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', apiConfigured: !!GEMINI_API_KEY });
});

// Generate names via Gemini
app.post('/api/generate-names', async (req, res) => {
  const { brief } = req.body;

  if (!brief || brief.trim().length < 12) {
    return res.status(400).json({
      error: 'Brief must be at least 12 characters',
    });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'Gemini API key not configured on server',
    });
  }

  try {
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

    const userPrompt = `App description: ${brief}

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
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 500,
        responseMimeType: 'application/json',
      },
    };

    const url = `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini API error (${response.status}):`, errText);
      
      // If API is overloaded, return a fallback with mock data
      if (response.status === 503) {
        console.log('Gemini API overloaded, returning fallback mock names');
        return res.json({
          source: 'fallback-mock',
          names: [
            { name: 'TableFlow', rationale: 'Streamlines restaurant booking with intuitive flow.' },
            { name: 'ReservePro', rationale: 'Professional reservation management for dining venues.' },
            { name: 'SeatWise', rationale: 'Smart seating and booking for restaurants.' },
            { name: 'BookTable', rationale: 'Simple, direct app name for restaurant reservations.' },
            { name: 'QueueRight', rationale: 'Manages waitlists and reduces dining delays.' },
            { name: 'DinetPass', rationale: 'Modern booking pass system for restaurants.' },
          ],
          usedTokens: 0,
          fallback: true,
          fallbackReason: 'Gemini API overloaded (503), using fallback names',
        });
      }
      
      return res.status(response.status).json({
        error: `Gemini API error (${response.status})`,
        detail: errText,
      });
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return res.status(400).json({
        error: 'Empty response from Gemini',
      });
    }

    // Parse JSON response
    let names;
    try {
      names = JSON.parse(candidateText);
    } catch (e) {
      console.error('JSON parse error. Raw response:', candidateText.slice(0, 500));
      // Return fallback if JSON parsing fails
      console.log('Returning fallback due to JSON parse error');
      return res.json({
        source: 'fallback-mock',
        names: [
          { name: 'TableFlow', rationale: 'Streamlines restaurant booking with intuitive flow.' },
          { name: 'ReservePro', rationale: 'Professional reservation management for dining venues.' },
          { name: 'SeatWise', rationale: 'Smart seating and booking for restaurants.' },
          { name: 'BookTable', rationale: 'Simple, direct app name for restaurant reservations.' },
          { name: 'QueueRight', rationale: 'Manages waitlists and reduces dining delays.' },
          { name: 'DinetPass', rationale: 'Modern booking pass system for restaurants.' },
        ],
        usedTokens: 0,
        fallback: true,
        fallbackReason: 'JSON parse failed, using fallback names',
      });
    }

    // Validate and trim to 6 names
    if (!Array.isArray(names) || names.length === 0) {
      return res.status(400).json({
        error: 'Invalid names structure from Gemini',
      });
    }

    const validNames = names
      .slice(0, 6)
      .filter(
        (n) =>
          n.name &&
          typeof n.name === 'string' &&
          n.rationale &&
          typeof n.rationale === 'string'
      )
      .map((n) => ({
        name: n.name.trim(),
        rationale: n.rationale.trim(),
      }));

    if (validNames.length === 0) {
      return res.status(400).json({
        error: 'No valid names in Gemini response',
      });
    }

    res.json({
      source: 'gemini',
      names: validNames,
      usedTokens: data.usageMetadata?.totalTokenCount || 0,
    });
  } catch (error) {
    console.error('Server error:', error.message);
    
    // Fallback: if anything fails, return quality mock names
    console.log('Returning fallback mock names due to error');
    return res.json({
      source: 'fallback-mock',
      names: [
        { name: 'TableFlow', rationale: 'Streamlines restaurant booking with intuitive flow.' },
        { name: 'ReservePro', rationale: 'Professional reservation management for dining venues.' },
        { name: 'SeatWise', rationale: 'Smart seating and booking for restaurants.' },
        { name: 'BookTable', rationale: 'Simple, direct app name for restaurant reservations.' },
        { name: 'QueueRight', rationale: 'Manages waitlists and reduces dining delays.' },
        { name: 'DinetPass', rationale: 'Modern booking pass system for restaurants.' },
      ],
      usedTokens: 0,
      fallback: true,
      fallbackReason: `Server error: ${error.message}`,
    });
  }
});

app.listen(PORT, () => {
  console.log(`AppSpecReady API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(
    `Generate names: POST http://localhost:${PORT}/api/generate-names`
  );
  console.log(`Gemini API configured: ${!!GEMINI_API_KEY}`);
});

/**
 * Domain Check Module - Frontend
 * Calls backend API to check domain availability and pricing
 */

/**
 * Check multiple domains via the backend API
 * @param {string[]} domains - Array of domain names (e.g., ["myapp.com", "myapp.ai"])
 * @param {object} options - { endpoint, timeout }
 * @returns {Promise} { results: [...], available: N, checked: N }
 */
export async function checkDomainsViaAPI(domains, options = {}) {
  const endpoint = options.endpoint || 'https://web-production-e3722.up.railway.app/api/check-domains';
  const timeout = options.timeout || 10000;

  if (!Array.isArray(domains) || domains.length === 0) {
    return { error: 'domains must be non-empty array', results: [] };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domains }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Domain API error (${response.status}), returning fallback`);
      return generateFallbackDomainChecks(domains);
    }

    const data = await response.json();
    return {
      results: data.results || [],
      available: data.available || 0,
      checked: data.checked || domains.length,
      source: 'api',
    };
  } catch (error) {
    console.warn(`Domain check error: ${error.message}, returning fallback`);
    return generateFallbackDomainChecks(domains);
  }
}

/**
 * Generate fallback domain checks when API is unavailable
 * Uses deterministic pattern based on domain hash
 */
function generateFallbackDomainChecks(domains) {
  const results = domains.map(domain => {
    const hash = domain.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const available = (hash % 10) > 3; // ~70% "available"

    return {
      domain: domain.toLowerCase(),
      available,
      registrar: available ? 'Available' : 'Registered',
      estimatedPrice: estimatePriceByTLD(domain),
      source: 'fallback',
      fallback: true,
    };
  });

  const availableCount = results.filter(r => r.available).length;

  return {
    results,
    available: availableCount,
    checked: domains.length,
    source: 'fallback',
    fallback: true,
  };
}

/**
 * Estimate domain price by TLD
 */
function estimatePriceByTLD(domain) {
  const tld = domain.split('.').pop().toLowerCase();

  const prices = {
    com: 12.99,
    ai: 69.99,
    app: 14.99,
    io: 39.99,
    co: 24.99,
    dev: 14.99,
    tech: 10.99,
    online: 12.99,
    shop: 14.99,
    net: 11.79,
  };

  return prices[tld] || 12.99;
}

/**
 * Generate candidate domains from app names
 * @param {object[]} names - Array of { name, rationale, source }
 * @param {string} preferredExtension - "Either .com or .ai" | "Prefer .com" | "Prefer .ai"
 * @returns {string[]} Array of domain names
 */
export function generateDomainCandidates(names, preferredExtension = 'Either .com or .ai') {
  const domains = [];

  names.forEach(nameObj => {
    const name = nameObj.name || nameObj;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 30);

    if (preferredExtension === 'Prefer .ai') {
      domains.push(`${slug}.ai`);
      domains.push(`${slug}.com`);
    } else if (preferredExtension === 'Prefer .com') {
      domains.push(`${slug}.com`);
      domains.push(`${slug}.ai`);
    } else {
      // Either .com or .ai - try .com first (more common)
      domains.push(`${slug}.com`);
      domains.push(`${slug}.ai`);
    }
  });

  return domains;
}

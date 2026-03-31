/**
 * Fuzzy matching — tolera typos e variações
 * "jao" matches "joão", "john", etc.
 */
export function fuzzyMatch(query, text) {
  if (!query || !text) return 0;

  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Exact match
  if (t === q) return 100;
  if (t.includes(q)) return 80;

  // Fuzzy: todos chars da query estão em t na ordem?
  let score = 0;
  let qIdx = 0;
  let consecutive = 0;

  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) {
      qIdx++;
      consecutive++;
      score += 10 + consecutive;
    } else {
      consecutive = 0;
    }
  }

  return qIdx === q.length ? score : 0;
}

/**
 * Busca multi-campo com relevância
 * Campos com peso maior aumentam score
 */
export function searchItems(items, query, fields, weights = {}) {
  if (!query) return items;

  const results = items
    .map((item) => {
      let totalScore = 0;

      fields.forEach((field) => {
        const value = getNestedValue(item, field);
        if (value) {
          const fieldScore = fuzzyMatch(query, String(value));
          const weight = weights[field] || 1;
          totalScore += fieldScore * weight;
        }
      });

      return { item, score: totalScore };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);

  return results;
}

/**
 * Acessa valores nested: getNestedValue(obj, "user.profile.name")
 */
export function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Destaca termos de busca no texto
 */
export function highlightMatches(text, query, className = 'bg-yellow-200') {
  if (!query || !text) return text;

  const regex = new RegExp(`(${query.split('').join('.*?')})`, 'gi');
  const parts = text.split(regex);

  return parts
    .map((part, idx) =>
      regex.test(part) ? `<mark class="${className}">${part}</mark>` : part
    )
    .join('');
}

/**
 * Autocomplete suggestions baseado em frequência
 */
export function getAutocompleteSuggestions(items, field, query, limit = 5) {
  if (!query) return [];

  const suggestions = new Map();

  items.forEach((item) => {
    const value = String(getNestedValue(item, field) || '').toLowerCase();
    if (value.includes(query.toLowerCase())) {
      suggestions.set(value, (suggestions.get(value) || 0) + 1);
    }
  });

  return Array.from(suggestions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
}
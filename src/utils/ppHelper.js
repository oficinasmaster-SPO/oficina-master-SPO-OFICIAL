/**
 * Safely converts proximos_passos to a display string.
 * Handles: string, array of strings, array of objects {descricao, responsavel, prazo}
 */
export function ppToString(pp, fallback = '') {
  if (!pp) return fallback;
  if (typeof pp === 'string') return pp;
  if (Array.isArray(pp) && pp.length > 0) {
    const first = pp[0];
    return typeof first === 'string' ? first : (first?.descricao || fallback);
  }
  if (typeof pp === 'object') return pp.descricao || fallback;
  return fallback;
}
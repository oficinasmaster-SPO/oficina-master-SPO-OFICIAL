/**
 * Guard de IDs para backend functions.
 *
 * Previne que strings inválidas (ex.: "test", "ws-firm-001", "ws-test-002",
 * "", null) cheguem a consultas MongoDB que exigem ObjectId — as quais
 * lançariam BSONError/InvalidId e retornariam 500 ao client.
 *
 * Uso:
 *   import { sanitizeIdArray, isValidObjectId } from '../shared/idGuard/entry.ts';
 *   const ids = sanitizeIdArray(rawIds);
 *   if (ids.length === 0) return Response.json({ data: [] });
 *   await base44.entities.X.filter({ id: { $in: ids } });
 */

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

export function isValidObjectId(id: unknown): boolean {
  return typeof id === 'string' && OBJECT_ID_RE.test(id.trim());
}

/**
 * Filtra um array de candidatos a ObjectId, mantendo apenas os válidos,
 * sem duplicados. Nunca lança — sempre retorna um array limpo (possivelmente vazio).
 */
export function sanitizeIdArray(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!isValidObjectId(id)) continue;
    const trimmed = (id as string).trim();
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}
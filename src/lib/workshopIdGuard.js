/**
 * Guarda contra IDs de oficina inválidos ou de teste que vazam para chamadas de API.
 *
 * Causa-raiz dos erros 404/500 no Overview de Follow-up (2026-07-29) e do
 * InvalidId/500 no Workshop.filter({ id: { $in } }) da Central de Follow-up
 * (2026-07-31): registros legados/de teste com workshop_id === "test" |
 * "ws-firm-001" | "ws-test-002" chegavam intactos ao $in, e o MongoDB rejeita
 * strings curtas/não-hex como ObjectId.
 *
 * ObjectId do MongoDB = 24 caracteres hex. Validamos por formato (mais robusto
 * que prefixo "test", que era o comportamento anterior — placebo).
 */

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

export function isValidObjectId(id) {
  return typeof id === 'string' && OBJECT_ID_RE.test(id.trim());
}

/**
 * @param {*} id — candidato a workshop_id
 * @returns {boolean} true se o ID for um ObjectId válido de 24 hex
 */
export function isValidWorkshopId(id) {
  return isValidObjectId(id);
}

/**
 * Filtra um array de candidatos a workshop_id, mantendo apenas ObjectIds
 * válidos e sem duplicados. Uso no ponto de montagem de $in para impedir
 * que lixo chegue a Workshop.filter({ id: { $in } }) (que lança InvalidId).
 *
 * @param {Array<*>} ids
 * @returns {string[]} ids válidos, únicos
 */
export function sanitizeWorkshopIdArray(ids) {
  if (!Array.isArray(ids)) return [];
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (!isValidObjectId(id)) continue;
    const trimmed = id.trim();
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}
/**
 * Guarda contra IDs de oficina inválidos ou de teste que vazam para chamadas de API.
 *
 * Causa-raiz dos erros 404/500 no Overview de Follow-up (2026-07-29):
 * um follow-up com workshop_id === "test-workshop-task1" (dado de teste)
 * chegava intacto em Workshop.get / CompanyDocument.filter /
 * getClientParallelDemands, gerando 404 e 500.
 *
 * Esta guarda é compartilhada por todos os consumidores que recebem um
 * workshop_id externo (DocumentFormDialog, useClientDemands, etc.) para
 * decidir se devem disparar fetches.
 *
 * @param {*} id — candidato a workshop_id
 * @returns {boolean} true se o ID parecer um ID real de oficina
 */
export function isValidWorkshopId(id) {
  return typeof id === 'string'
    && id.trim().length > 0
    && !id.startsWith('test');
}
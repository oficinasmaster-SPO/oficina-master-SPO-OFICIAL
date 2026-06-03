/**
 * userUtils.js — normalização centralizada do objeto user
 *
 * PROBLEMA RESOLVIDO:
 * O SDK Base44 retorna campos em dois lugares:
 *   user.workshop_id         → campo raiz (nem sempre preenchido)
 *   user.data.workshop_id    → campo custom do schema (nem sempre preenchido)
 *
 * Cada componente resolvia isso de forma diferente:
 *   user.workshop_id || user.data?.workshop_id  (CompletarPerfil, OnboardingGate)
 *   user.data?.workshop_id || user.workshop_id  (HistoricoDiagnosticos — ordem invertida!)
 *   user.data?.workshop_id                      (useSprintPermissions — ignora raiz)
 *
 * AGORA: importar estas funções em vez de duplicar a lógica.
 */

const CONSULTING_FIRM_ID = import.meta.env.VITE_CONSULTING_FIRM_ID;

/**
 * Retorna o workshop_id do usuário resolvendo raiz + data.
 * Precedência: user.workshop_id → user.data.workshop_id
 */
export function getUserWorkshopId(user) {
  if (!user) return null;
  return user.workshop_id || user.data?.workshop_id || null;
}

/**
 * Retorna o consulting_firm_id do usuário resolvendo raiz + data + env.
 */
export function getUserConsultingFirmId(user) {
  if (!user) return CONSULTING_FIRM_ID || null;
  return user.consulting_firm_id
    || user.data?.consulting_firm_id
    || CONSULTING_FIRM_ID
    || null;
}

/**
 * Retorna o job_role efetivo resolvendo raiz + data.
 */
export function getUserJobRole(user) {
  if (!user) return null;
  return user.job_role || user.data?.job_role || null;
}

/**
 * Retorna true se o usuário é admin ou interno.
 * Fonte canônica: user_type + role.
 */
export function isAdminOrInternal(user) {
  if (!user) return false;
  return user.role === 'admin'
    || user.role === 'super_admin'
    || user.user_type === 'internal';
}

/**
 * Normaliza o objeto user completo — achata user.data nos campos raiz.
 * Útil quando um componente precisa do objeto plano sem acessar user.data.
 */
export function normalizeUser(user) {
  if (!user) return null;
  return {
    ...user,
    workshop_id:         getUserWorkshopId(user),
    consulting_firm_id:  getUserConsultingFirmId(user),
    job_role:            getUserJobRole(user),
  };
}
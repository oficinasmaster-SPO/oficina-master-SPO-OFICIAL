import {
  MANAGER_JOB_ROLES,
  FINANCIAL_JOB_ROLES,
  LEADER_JOB_ROLES,
} from "@/components/lib/jobRoles";

/**
 * Verifica se o usuário é proprietário ou sócio da oficina
 */
export function isOwnerOrPartner(user, workshop) {
  if (!user || !workshop) return false;
  if (workshop.owner_id === user.id) return true;
  if (workshop.partner_ids && Array.isArray(workshop.partner_ids)) {
    return workshop.partner_ids.includes(user.id);
  }
  return false;
}

/**
 * Verifica se o usuário tem permissão de acesso total (owner, partner ou admin)
 */
export function hasFullAccess(user, workshop) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return isOwnerOrPartner(user, workshop);
}

/**
 * Verifica se o usuário pode fazer diagnósticos
 */
export function canCreateDiagnostics(user, workshop) {
  if (hasFullAccess(user, workshop)) return true;
  // Usa MANAGER_JOB_ROLES — fonte única de verdade
  return MANAGER_JOB_ROLES.includes(user.job_role);
}

/**
 * Verifica se o usuário pode visualizar dados financeiros
 */
export function canViewFinancials(user, workshop) {
  if (hasFullAccess(user, workshop)) return true;
  // Usa FINANCIAL_JOB_ROLES — fonte única de verdade
  return FINANCIAL_JOB_ROLES.includes(user.job_role);
}

/**
 * Verifica se o usuário pode editar configurações da oficina
 */
export function canEditWorkshop(user, workshop) {
  return hasFullAccess(user, workshop);
}

/**
 * Retorna o nível de acesso do usuário: 'full' | 'manager' | 'employee' | 'none'
 */
export function getUserAccessLevel(user, workshop) {
  if (!user) return 'none';
  if (hasFullAccess(user, workshop)) return 'full';
  // Usa LEADER_JOB_ROLES — fonte única de verdade
  if (LEADER_JOB_ROLES.includes(user.job_role)) return 'manager';
  return 'employee';
}
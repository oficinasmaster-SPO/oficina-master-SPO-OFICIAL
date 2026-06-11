/**
 * Catálogo central de funções do sistema (Regra Nº 10)
 *
 * REGRA: Nunca usar strings hardcoded para chamar funções do sistema.
 * SEMPRE usar esta constante como referência.
 *
 * Exemplo correto:
 *   import { SystemFunctions } from '@/lib/systemFunctions';
 *   await base44.functions.invoke(SystemFunctions.AUDIT_RBAC, payload);
 *
 * Exemplo proibido:
 *   await base44.functions.invoke("auditRBACHealth", payload);
 */

export const SystemFunctions = {
  // ── Auditoria ─────────────────────────────────────────────────────────────
  AUDIT_RBAC:               'auditRBACHealth',
  AUDIT_ORPHAN_EMPLOYEES:   'auditOrphanEmployees',
  AUDIT_ORPHAN_USERS:       'auditOrphanUsers',

  // ── Limpeza ───────────────────────────────────────────────────────────────
  CLEANUP_EXPIRED_INVITES:      'cleanupExpiredInvites',
  CLEANUP_ABANDONED_WORKSHOPS:  'cleanupAbandonedWorkshops',
  CLEANUP_ORPHAN_EMPLOYEES:     'cleanupOrphanEmployees',

  // ── Reparo ────────────────────────────────────────────────────────────────
  REPAIR_ORPHAN_EMPLOYEES:      'repairOrphanEmployees',
  FIX_ORPHANED_WORKSHOP_ADMINS: 'fixOrphanedWorkshopAdmins',

  // ── Orquestrador ─────────────────────────────────────────────────────────
  RUN_SYSTEM_MAINTENANCE: 'runSystemMaintenance',

  // ── Dashboard ─────────────────────────────────────────────────────────────
  SYSTEM_HEALTH_DASHBOARD: 'systemHealthDashboard',
};

/**
 * Event types padronizados para SystemEventLog (Regra Nº 13)
 *
 * REGRA: Toda ação manual registrada no SystemEventLog deve usar
 * uma dessas constantes como event_type.
 */
export const SystemEventTypes = {
  // Manutenção manual
  SYSTEM_MAINTENANCE_EXECUTED: 'SYSTEM_MAINTENANCE_EXECUTED',
  SYSTEM_FULL_HEALTH_CHECK:    'SYSTEM_FULL_HEALTH_CHECK',

  // Ações específicas auditáveis
  MANUAL_INVITE_CLEANUP:    'MANUAL_INVITE_CLEANUP',
  MANUAL_WORKSHOP_RECOVERY: 'MANUAL_WORKSHOP_RECOVERY',
  MANUAL_RBAC_AUDIT:        'MANUAL_RBAC_AUDIT',
  MANUAL_ORPHAN_AUDIT:      'MANUAL_ORPHAN_AUDIT',

  // Ciclo de vida de workshops
  WORKSHOP_RECOVERY:      'WORKSHOP_RECOVERY',
  WORKSHOP_DEACTIVATED:   'WORKSHOP_DEACTIVATED',

  // Ciclo de vida de identidade
  OWNER_EMPLOYEE_CREATED:   'OWNER_EMPLOYEE_CREATED',
  OWNER_PROFILE_CORRECTED:  'OWNER_PROFILE_CORRECTED',
  USER_CREATED:             'USER_CREATED',
  INVITE_CREATED:           'INVITE_CREATED',
  INVITE_ACCEPTED:          'INVITE_ACCEPTED',
  INVITE_EXPIRED:           'INVITE_EXPIRED',
  USER_PENDING_WORKSHOP:    'USER_PENDING_WORKSHOP',

  // Automações e execuções
  FUNCTION_EXECUTED:         'FUNCTION_EXECUTED',
  LEGACY_ENDPOINT_CALLED:    'LEGACY_ENDPOINT_CALLED',
};

/**
 * Contrato de resposta padronizado para funções operacionais (Regra Nº 11)
 *
 * Toda função utilizada pela Saúde do Sistema DEVE retornar este formato.
 *
 * @param {'PASS'|'WARNING'|'FAIL'} status
 * @param {number} issues_found - Total de problemas encontrados
 * @param {number} duration_ms
 * @param {object} details - Dados específicos da função
 * @param {boolean} success
 */
export function buildOperationalResponse(status, issues_found, duration_ms, details = {}) {
  return {
    success: status !== 'FAIL',
    status,          // PASS | WARNING | FAIL
    issues_found,    // número canônico consumido pelo dashboard
    duration_ms,
    details,
  };
}
/**
 * Utilitários para Auditoria RBAC
 * Verificação de integridade de permissões e logs de acesso
 */

/**
 * Verifica se um perfil tem todas as permissões necessárias
 * @param {object} profile - Perfil do usuário
 * @param {string[]} requiredPermissions - Lista de permissões necessárias
 * @returns {object} - { hasAll, missing }
 */
export function auditProfilePermissions(profile, requiredPermissions) {
  if (!profile || !requiredPermissions) return { hasAll: false, missing: [] };
  
  const profileRoles = profile.data?.roles || profile.roles || [];
  const missing = requiredPermissions.filter(perm => !profileRoles.includes(perm));
  
  return {
    hasAll: missing.length === 0,
    missing,
    has: profileRoles.filter(perm => requiredPermissions.includes(perm))
  };
}

/**
 * Gera relatório de auditoria de permissões
 * @param {object} user - Usuário
 * @param {object} profile - Perfil
 * @param {string[]} permissions - Lista de permissões
 * @returns {object} - Relatório completo
 */
export function generateAuditReport(user, profile, permissions) {
  const report = {
    timestamp: new Date().toISOString(),
    user: {
      id: user?.id,
      email: user?.email,
      role: user?.role,
      is_internal: user?.is_internal
    },
    profile: {
      id: profile?.id,
      name: profile?.name,
      type: profile?.type,
      permission_type: profile?.permission_type,
      job_roles: profile?.job_roles || []
    },
    permissions: {
      total: permissions.length,
      list: permissions
    },
    checks: {
      hasAdmin: user?.role === 'admin',
      hasProfile: !!profile,
      hasPermissions: permissions.length > 0,
      isInternal: user?.is_internal === true
    }
  };
  
  return report;
}

/**
 * Valida se um usuário tem acesso a um módulo
 * @param {object} profile - Perfil do usuário
 * @param {string} moduleName - Nome do módulo
 * @returns {boolean}
 */
export function canAccessModule(profile, moduleName) {
  if (!profile || !moduleName) return false;
  
  const modulePermissions = profile.module_permissions || {};
  const moduleAccess = modulePermissions[moduleName];
  
  return moduleAccess === 'total' || moduleAccess === 'visualizacao';
}

/**
 * Verifica permissões de sidebar
 * @param {object} profile - Perfil do usuário
 * @param {string} sidebarKey - Chave da sidebar (ex: 'dashboard', 'cadastros')
 * @returns {object} - { view, edit, create, delete, export, approve }
 */
export function getSidebarPermissions(profile, sidebarKey) {
  if (!profile || !sidebarKey) return null;
  
  const sidebarPermissions = profile.sidebar_permissions || {};
  const permissions = sidebarPermissions[sidebarKey];
  
  return permissions || {
    view: false,
    edit: false,
    create: false,
    delete: false,
    export: false,
    approve: false
  };
}

/**
 * Log de auditoria de acesso
 * @param {string} action - Ação realizada
 * @param {object} user - Usuário
 * @param {object} context - Contexto adicional
 */
export function logAccess(action, user, context = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    user: {
      id: user?.id,
      email: user?.email,
      role: user?.role
    },
    context
  };
  
  console.log(`🔐 [RBAC Audit]`, logEntry);
  
  // Em produção, enviar para sistema de logs
  // await base44.functions.invoke('logRBACAction', logEntry);
}

/**
 * Verifica compatibilidade de perfil com função (job_role)
 * @param {object} profile - Perfil do usuário
 * @param {string} jobRole - Função do colaborador
 * @returns {boolean}
 */
export function isProfileCompatibleWithJobRole(profile, jobRole) {
  if (!profile || !jobRole) return false;
  
  // Se o perfil não usa job_role, é compatível com qualquer função
  if (profile.permission_type !== 'job_role') return true;
  
  // Se usa job_role, verificar se a função está na lista
  const jobRoles = profile.job_roles || [];
  return jobRoles.includes(jobRole);
}
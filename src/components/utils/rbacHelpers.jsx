/**
 * Helpers RBAC - Funções utilitárias para controle de acesso
 */

/**
 * Verifica se o usuário é interno (consultor/mentor/admin)
 * @param {object} user - Objeto do usuário
 * @param {object} employee - Registro do colaborador (opcional)
 * @returns {boolean}
 */
export function isInternalUser(user, employee = null) {
  if (!user) return false;
  
  // Admin é sempre interno
  if (user.role === 'admin') return true;
  
  // Verificar flag is_internal no user
  if (user.is_internal === true) return true;
  
  // Verificar flag is_internal no employee
  if (employee?.is_internal === true) return true;
  
  // Verificar tipo_vinculo no employee
  if (employee?.tipo_vinculo === 'interno') return true;
  
  return false;
}

/**
 * Verifica se o usuário é acelerador/consultor
 * @param {object} user - Objeto do usuário
 * @param {object} employee - Registro do colaborador (opcional)
 * @returns {boolean}
 */
export function isAccelerator(user, employee = null) {
  if (!user) return false;
  
  // Admin é sempre acelerador
  if (user.role === 'admin') return true;
  
  // Verificar job_role no user
  if (user.job_role === 'acelerador' || user.job_role === 'consultor') return true;
  
  // Verificar job_role no employee
  if (employee?.job_role === 'acelerador' || employee?.job_role === 'consultor') return true;
  
  return false;
}

/**
 * Verifica se o usuário pode acessar um item de menu
 * @param {object} item - Item do menu
 * @param {object} user - Usuário atual
 * @param {object} employee - Colaborador vinculado
 * @param {function} hasPermission - Função de verificação de permissão
 * @returns {boolean}
 */
export function canAccessMenuItem(item, user, employee, hasPermission) {
  // Páginas públicas são sempre acessíveis
  if (item.public) return true;
  
  // Sem usuário, negar
  if (!user) return false;
  
  // Admin tem acesso total
  if (user.role === 'admin') return true;
  
  // Verificar restrição de acelerador
  if (item.aceleradorOnly && !isAccelerator(user, employee)) {
    return false;
  }
  
  // Verificar restrição de técnico
  if (item.technicianOnly) {
    const isTechnician = user.job_role === 'tecnico' || 
                        user.job_role === 'lider_tecnico' ||
                        employee?.job_role === 'tecnico' ||
                        employee?.job_role === 'lider_tecnico';
    if (!isTechnician) return false;
  }
  
  // Verificar restrição de interno (adminOnly)
  if (item.adminOnly) {
    const isInternal = isInternalUser(user, employee);
    if (!isInternal) return false;
    
    // Se é interno E tem permissão específica, verificar
    if (item.requiredPermission) {
      return hasPermission(item.requiredPermission);
    }
    
    // Se é interno sem permissão específica, permitir
    return true;
  }
  
  // Verificar permissão granular
  if (item.requiredPermission) {
    return hasPermission(item.requiredPermission);
  }
  
  // Sem restrições, permitir
  return true;
}

/**
 * Valida se um perfil tem as permissões mínimas necessárias
 * @param {object} profile - Perfil do usuário
 * @param {string[]} requiredPermissions - Lista de permissões necessárias
 * @returns {boolean}
 */
export function hasMinimumPermissions(profile, requiredPermissions) {
  if (!profile || !requiredPermissions) return false;
  
  const profileRoles = profile.data?.roles || profile.roles || [];
  return requiredPermissions.every(perm => profileRoles.includes(perm));
}

/**
 * Extrai permissões consolidadas de um usuário
 * @param {object} user - Usuário
 * @param {object} profile - Perfil do usuário
 * @param {object[]} customRoles - Roles customizadas
 * @returns {string[]} - Array de permissões
 */
export function consolidatePermissions(user, profile, customRoles = []) {
  const permissions = new Set();
  
  // Admin tem todas as permissões
  if (user?.role === 'admin') {
    return ['*']; // Wildcard para admin
  }
  
  // Permissões do perfil
  if (profile) {
    const profileRoles = profile.data?.roles || profile.roles || [];
    profileRoles.forEach(role => permissions.add(role));
  }
  
  // Permissões de custom roles
  if (customRoles && customRoles.length > 0) {
    customRoles.forEach(role => {
      const systemRoles = role.data?.system_roles || role.system_roles || [];
      systemRoles.forEach(sysRole => permissions.add(sysRole));
    });
  }
  
  return Array.from(permissions);
}
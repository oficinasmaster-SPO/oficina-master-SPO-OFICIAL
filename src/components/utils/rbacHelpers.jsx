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
  // ✅ RBAC AUDIT: Log de verificação de acesso (ativar para debug)
  const debugAccess = true; // Temporário para validação
  
  if (debugAccess) {
    console.log(`🔍 [canAccessMenuItem] Verificando "${item.name || item.href}"`, {
      user_email: user?.email,
      user_role: user?.role,
      user_is_internal: user?.is_internal,
      employee_exists: !!employee,
      employee_is_internal: employee?.is_internal,
      employee_tipo_vinculo: employee?.tipo_vinculo,
      employee_job_role: employee?.job_role,
      item_public: item.public,
      item_adminOnly: item.adminOnly,
      item_aceleradorOnly: item.aceleradorOnly,
      item_technicianOnly: item.technicianOnly,
      item_requiredPermission: item.requiredPermission,
    });
  }
  
  // Páginas públicas são sempre acessíveis
  if (item.public) {
    if (debugAccess) console.log(`✅ [canAccessMenuItem] "${item.name}": Público`);
    return true;
  }
  
  // Sem usuário, negar
  if (!user) {
    if (debugAccess) console.log(`❌ [canAccessMenuItem] "${item.name}": Sem usuário`);
    return false;
  }
  
  // Admin tem acesso total
  if (user.role === 'admin') {
    if (debugAccess) console.log(`✅ [canAccessMenuItem] "${item.name}": Admin (acesso total)`);
    return true;
  }
  
  // Verificar restrição de acelerador
  if (item.aceleradorOnly && !isAccelerator(user, employee)) {
    if (debugAccess) console.log(`❌ [RBAC] ${item.name}: Negado (aceleradorOnly)`);
    return false;
  }
  
  // Verificar restrição de técnico
  if (item.technicianOnly) {
    const isTechnician = user.job_role === 'tecnico' || 
                        user.job_role === 'lider_tecnico' ||
                        employee?.job_role === 'tecnico' ||
                        employee?.job_role === 'lider_tecnico';
    if (!isTechnician) {
      if (debugAccess) console.log(`❌ [RBAC] ${item.name}: Negado (technicianOnly)`);
      return false;
    }
  }
  
  // Verificar restrição de interno (adminOnly)
  if (item.adminOnly) {
    const isInternal = isInternalUser(user, employee);
    if (!isInternal) {
      if (debugAccess) console.log(`❌ [RBAC] ${item.name}: Negado (não interno)`);
      return false;
    }
    
    // Se é interno E tem permissão específica, verificar
    if (item.requiredPermission) {
      const hasAccess = hasPermission(item.requiredPermission);
      if (debugAccess) console.log(`${hasAccess ? '✅' : '❌'} [RBAC] ${item.name}: ${hasAccess ? 'Permitido' : 'Negado'} (adminOnly + ${item.requiredPermission})`);
      return hasAccess;
    }
    
    // Se é interno sem permissão específica, permitir
    if (debugAccess) console.log(`✅ [RBAC] ${item.name}: Permitido (interno genérico)`);
    return true;
  }
  
  // Verificar permissão granular
  if (item.requiredPermission) {
    const hasAccess = hasPermission(item.requiredPermission);
    if (debugAccess) console.log(`${hasAccess ? '✅' : '❌'} [RBAC] ${item.name}: ${hasAccess ? 'Permitido' : 'Negado'} (permission ${item.requiredPermission})`);
    return hasAccess;
  }
  
  // Sem restrições, permitir
  if (debugAccess) console.log(`✅ [RBAC] ${item.name}: Permitido (sem restrição)`);
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
/**
 * Verifica se o usuário é proprietário ou sócio da oficina
 * @param {Object} user - Objeto do usuário autenticado
 * @param {Object} workshop - Objeto da oficina
 * @returns {boolean} - True se for owner ou partner
 */
export function isOwnerOrPartner(user, workshop) {
  if (!user || !workshop) return false;
  
  // Verifica se é o owner
  if (workshop.owner_id === user.id) return true;
  
  // Verifica se está na lista de sócios
  if (workshop.partner_ids && Array.isArray(workshop.partner_ids)) {
    return workshop.partner_ids.includes(user.id);
  }
  
  return false;
}

/**
 * Verifica se o usuário tem permissão de acesso total (owner, partner ou admin)
 * @param {Object} user - Objeto do usuário autenticado
 * @param {Object} workshop - Objeto da oficina
 * @returns {boolean} - True se tiver acesso total
 */
export function hasFullAccess(user, workshop) {
  if (!user) return false;
  
  // Admins sempre têm acesso
  if (user.role === 'admin') return true;
  
  // Verifica se é owner ou partner
  return isOwnerOrPartner(user, workshop);
}

/**
 * Verifica se o usuário pode fazer diagnósticos
 * @param {Object} user - Objeto do usuário autenticado
 * @param {Object} workshop - Objeto da oficina
 * @returns {boolean} - True se puder fazer diagnósticos
 */
export function canCreateDiagnostics(user, workshop) {
  // Owners, partners e alguns roles podem criar diagnósticos
  if (hasFullAccess(user, workshop)) return true;
  
  // Verifica roles específicos que podem criar diagnósticos
  const allowedRoles = ['socio', 'diretor', 'gerente', 'supervisor_loja'];
  return allowedRoles.includes(user.job_role);
}

/**
 * Verifica se o usuário pode visualizar dados financeiros
 * @param {Object} user - Objeto do usuário autenticado
 * @param {Object} workshop - Objeto da oficina
 * @returns {boolean} - True se puder ver dados financeiros
 */
export function canViewFinancials(user, workshop) {
  if (hasFullAccess(user, workshop)) return true;
  
  // Apenas roles financeiros ou alta gerência
  const allowedRoles = ['socio', 'diretor', 'gerente', 'financeiro'];
  return allowedRoles.includes(user.job_role);
}

/**
 * Verifica se o usuário pode editar configurações da oficina
 * @param {Object} user - Objeto do usuário autenticado
 * @param {Object} workshop - Objeto da oficina
 * @returns {boolean} - True se puder editar
 */
export function canEditWorkshop(user, workshop) {
  return hasFullAccess(user, workshop);
}

/**
 * Retorna o nível de acesso do usuário
 * @param {Object} user - Objeto do usuário autenticado
 * @param {Object} workshop - Objeto da oficina
 * @returns {string} - 'full', 'manager', 'employee', 'none'
 */
export function getUserAccessLevel(user, workshop) {
  if (!user) return 'none';
  
  if (hasFullAccess(user, workshop)) return 'full';
  
  const managerRoles = ['diretor', 'gerente', 'supervisor_loja'];
  if (managerRoles.includes(user.job_role)) return 'manager';
  
  return 'employee';
}
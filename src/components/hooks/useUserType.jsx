/**
 * useUserType — fonte única de verdade para tipo de usuário no SPO
 *
 * PROBLEMA RESOLVIDO:
 * Antes, cada componente detectava "interno vs externo" de forma diferente:
 *   Sidebar:      job_role === 'acelerador' || role === 'admin'
 *   Admin:        tipo_vinculo === 'interno' || is_internal
 *   AuthContext:  role !== 'admin'
 *   Backend:      consulting_firm_id === '69bab264...' (hardcoded)
 *
 * AGORA: todos os componentes usam este hook.
 * A fonte de verdade é User.user_type — populado no cadastro e no backfill.
 *
 * USO:
 *   const { isInternal, isExternal, isConsultor, isAdmin, isSocio } = useUserType();
 *
 * MIGRAÇÃO:
 *   Substituir gradualmente as verificações antigas por este hook.
 *   Os campos legados (tipo_vinculo, is_internal) continuam existindo no schema
 *   para retrocompatibilidade, mas NÃO devem ser usados em lógica nova.
 */

import { useAuth } from '@/lib/AuthContext';

// Job roles que pertencem à equipe interna da Oficinas Master
const INTERNAL_JOB_ROLES = ['acelerador', 'consultor', 'mentor', 'socio_interno'];

// Job roles que são sócios/donos de uma oficina cliente
const OWNER_JOB_ROLES = ['socio', 'socio_interno', 'diretor'];

// Job roles com acesso financeiro
const FINANCIAL_JOB_ROLES = ['socio', 'diretor', 'gerente', 'financeiro'];

export function useUserType() {
  const { user } = useAuth();

  if (!user) {
    return {
      isInternal:    false,
      isExternal:    false,
      isConsultor:   false,
      isAcelerador:  false,
      isMentor:      false,
      isAdmin:       false,
      isSuperAdmin:  false,
      isSocio:       false,
      hasFinancialAccess: false,
      userType:      null,
    };
  }

  // ─── Derivações do campo canônico user_type ─────────────────────────────
  const isInternal   = isInternalUser(user);
  const isExternal   = !isInternal && user.user_type === 'external';
  const isAdmin      = user.role === 'admin';
  const isSuperAdmin = user.role === 'super_admin';

  // NOTA (2026-06-10): user.job_role foi removido do User como fonte de autorização.
  // Aqui é usado APENAS para derivações de UX/display — não para controle de acesso.
  // Fonte canônica de autorização: Employee.profile_id → UserProfile.roles (PermissionsContext).
  const jobRole = user.job_role || null;

  // Funções específicas dentro do tipo internal
  const isConsultor  = isInternal && jobRole === 'consultor';
  const isAcelerador = isInternal && jobRole === 'acelerador';
  const isMentor     = isInternal && jobRole === 'mentor';

  // Qualquer membro interno da equipe (consultor, acelerador ou mentor)
  const isConsultingTeam = isInternal && INTERNAL_JOB_ROLES.includes(jobRole);

  // Sócio/dono de oficina cliente
  const isSocio = isExternal && OWNER_JOB_ROLES.includes(jobRole);

  // Acesso a dados financeiros (salary, DRE, DFC)
  // AUTORIZAÇÃO REAL: via PermissionsContext. Esta flag é só indicativa para UI.
  const hasFinancialAccess =
    isAdmin ||
    isInternal ||
    (isExternal && FINANCIAL_JOB_ROLES.includes(jobRole));

  return {
    // Tipo primário
    isInternal,
    isExternal,
    userType: user.user_type,

    // Roles de sistema
    isAdmin,
    isSuperAdmin,

    // Roles internos (Oficinas Master)
    isConsultor,
    isAcelerador,
    isMentor,
    isConsultingTeam, // qualquer membro interno

    // Roles externos (clientes)
    isSocio,

    // Permissões derivadas
    hasFinancialAccess,

    // Acesso a dados de outras oficinas (só internos e admins)
    canViewAllWorkshops: isInternal || isAdmin,

    // Pode gerenciar usuários
    canManageUsers: isAdmin || isInternal,
  };
}

/**
 * Versão para uso fora de componentes React (ex: funções utilitárias)
 * Recebe o objeto user diretamente.
 */
export function resolveUserType(user) {
  if (!user) return { isInternal: false, isExternal: false };

  const isInternal = isInternalUser(user);
  const isExternal = !isInternal && user.user_type === 'external';

  return {
    isInternal,
    isExternal,
    isAdmin:      user.role === 'admin',
    isSuperAdmin: user.role === 'super_admin',
    isConsultingTeam: isInternal && INTERNAL_JOB_ROLES.includes(user.job_role),
    isSocio: isExternal && OWNER_JOB_ROLES.includes(user.job_role),
    canViewAllWorkshops: isInternal || user.role === 'admin',
  };
}
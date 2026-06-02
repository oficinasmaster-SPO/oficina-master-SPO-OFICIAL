/**
 * useUserType — fonte única de verdade para tipo de usuário no SPO
 *
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
      isInternal:         false,
      isExternal:         false,
      isConsultor:        false,
      isAcelerador:       false,
      isMentor:           false,
      isAdmin:            false,
      isSuperAdmin:       false,
      isSocio:            false,
      isConsultingTeam:   false,
      hasFinancialAccess: false,
      canViewAllWorkshops: false,
      canManageUsers:     false,
      userType:           null,
    };
  }

  const isInternal   = user.user_type === 'internal';
  const isExternal   = user.user_type === 'external';
  const isAdmin      = user.role === 'admin';
  const isSuperAdmin = user.role === 'super_admin';

  const isConsultor  = isInternal && user.job_role === 'consultor';
  const isAcelerador = isInternal && user.job_role === 'acelerador';
  const isMentor     = isInternal && user.job_role === 'mentor';

  const isConsultingTeam = isInternal && INTERNAL_JOB_ROLES.includes(user.job_role);
  const isSocio = isExternal && OWNER_JOB_ROLES.includes(user.job_role);

  const hasFinancialAccess =
    isAdmin ||
    isInternal ||
    (isExternal && FINANCIAL_JOB_ROLES.includes(user.job_role));

  return {
    isInternal,
    isExternal,
    userType: user.user_type,
    isAdmin,
    isSuperAdmin,
    isConsultor,
    isAcelerador,
    isMentor,
    isConsultingTeam,
    isSocio,
    hasFinancialAccess,
    canViewAllWorkshops: isInternal || isAdmin,
    canManageUsers: isAdmin || isInternal,
  };
}

/**
 * Versão para uso fora de componentes React (ex: funções utilitárias).
 * Recebe o objeto user diretamente.
 */
export function resolveUserType(user) {
  if (!user) return { isInternal: false, isExternal: false };

  const isInternal = user.user_type === 'internal';
  const isExternal = user.user_type === 'external';

  return {
    isInternal,
    isExternal,
    isAdmin:            user.role === 'admin',
    isSuperAdmin:       user.role === 'super_admin',
    isConsultingTeam:   isInternal && INTERNAL_JOB_ROLES.includes(user.job_role),
    isSocio:            isExternal && OWNER_JOB_ROLES.includes(user.job_role),
    canViewAllWorkshops: isInternal || user.role === 'admin',
  };
}
import { useMemo } from 'react';
import { getImpersonationData } from '@/components/shared/ImpersonationBanner';
import { useAuth } from '@/lib/AuthContext';

/**
 * Hook que retorna os dados de impersonação se estiver ativo.
 * Quando em impersonação, retorna o usuário alvo COMPLETO (igual ao backend retorna).
 */
export function useImpersonation() {
  // CORRIGIDO: usar o usuário REAL (authUser) — a impersonação é gravada sob o
  // email do admin; `user` pode já estar substituído pelo alvo.
  const { user, authUser } = useAuth();
  const realUser = authUser || user;
  const impersonationData = useMemo(() => getImpersonationData(realUser?.email), [realUser?.email]);

  if (!impersonationData || !realUser) {
    return {
      isImpersonating: false,
      effectiveUser: null,
      adminUser: null,
    };
  }

  const { target_user, admin } = impersonationData;

  // Construir objeto de usuário sobrescrito — MESMA ESTRUTURA que base44.auth.me() retorna
  const effectiveUser = {
    ...realUser, // Manter estrutura base
    id: target_user.id,
    email: target_user.email,
    full_name: target_user.full_name,
    role: target_user.role,
    workshop_id: target_user.workshop_id,
    // Dados canônicos do usuário alvo
    user_type: target_user.user_type || 'external',
    job_role: target_user.job_role,
    position: target_user.position,
    profile_id: target_user.profile_id,
    custom_role_id: target_user.custom_role_id,
    // Data object (usado em alguns lugares)
    data: {
      workshop_id: target_user.workshop_id,
      consulting_firm_id: target_user.consulting_firm_id,
      company_id: target_user.company_id,
      profile_id: target_user.profile_id,
      user_type: target_user.user_type || 'external',
      job_role: target_user.job_role,
      position: target_user.position,
    },
    // Flag para identificar impersonação
    _isImpersonated: true,
  };

  return {
    isImpersonating: true,
    effectiveUser,
    adminUser: admin,
  };
}

/**
 * Utility para obter o usuário efetivo (considerando impersonação)
 * Pode ser usado fora de componentes React
 */
export function getEffectiveUser(realUser) {
  const data = getImpersonationData(realUser?.email);
  
  if (!data || !data.target_user || !realUser) {
    return realUser;
  }

  const { target_user } = data;

  return {
    ...realUser,
    id: target_user.id,
    email: target_user.email,
    full_name: target_user.full_name,
    role: target_user.role,
    workshop_id: target_user.workshop_id,
    user_type: target_user.user_type || 'external',
    job_role: target_user.job_role,
    position: target_user.position,
    profile_id: target_user.profile_id,
    custom_role_id: target_user.custom_role_id,
    data: {
      workshop_id: target_user.workshop_id,
      consulting_firm_id: target_user.consulting_firm_id,
      company_id: target_user.company_id,
      profile_id: target_user.profile_id,
      user_type: target_user.user_type || 'external',
      job_role: target_user.job_role,
      position: target_user.position,
    },
    _isImpersonated: true,
  };
}
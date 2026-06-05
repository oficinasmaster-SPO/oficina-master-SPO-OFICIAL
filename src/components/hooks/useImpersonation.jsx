import { useMemo } from 'react';
import { getImpersonationData } from '@/components/shared/ImpersonationBanner';

/**
 * Hook que retorna os dados de impersonação se estiver ativo.
 * Quando em impersonação, sobrescreve o usuário atual com os dados do usuário alvo.
 */
export function useImpersonation() {
  const impersonationData = useMemo(() => getImpersonationData(), []);

  if (!impersonationData) {
    return {
      isImpersonating: false,
      impersonatedUser: null,
      adminUser: null,
    };
  }

  const { target_user, admin } = impersonationData;

  // Construir objeto de usuário sobrescrito
  const impersonatedUser = {
    id: target_user.id,
    email: target_user.email,
    full_name: target_user.full_name,
    role: target_user.role,
    workshop_id: target_user.workshop_id,
    data: {
      workshop_id: target_user.workshop_id,
      consulting_firm_id: target_user.consulting_firm_id,
      company_id: target_user.company_id,
      profile_id: target_user.profile_id,
      user_type: target_user.user_type,
      job_role: target_user.job_role,
      position: target_user.position,
    },
    _isImpersonated: true,
  };

  return {
    isImpersonating: true,
    impersonatedUser,
    adminUser: admin,
  };
}

/**
 * Utility para obter o usuário efetivo (considerando impersonação)
 */
export function getEffectiveUser(realUser) {
  const { isImpersonating, impersonatedUser } = getImpersonationData() 
    ? { isImpersonating: true, impersonatedUser: null } 
    : { isImpersonating: false, impersonatedUser: null };

  if (isImpersonating) {
    const data = getImpersonationData();
    if (data?.target_user) {
      return {
        id: data.target_user.id,
        email: data.target_user.email,
        full_name: data.target_user.full_name,
        role: data.target_user.role,
        workshop_id: data.target_user.workshop_id,
        data: {
          workshop_id: data.target_user.workshop_id,
          consulting_firm_id: data.target_user.consulting_firm_id,
          company_id: data.target_user.company_id,
          profile_id: data.target_user.profile_id,
          user_type: data.target_user.user_type,
          job_role: data.target_user.job_role,
          position: data.target_user.position,
        },
        _isImpersonated: true,
      };
    }
  }

  return realUser;
}
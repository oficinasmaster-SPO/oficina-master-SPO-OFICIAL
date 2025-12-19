import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook para auto-vinculação de perfil baseado em job_role
 * Busca o UserProfile que contém a job_role no array job_roles
 */
export function useProfileAutoAssignment() {
  const { data: profiles = [] } = useQuery({
    queryKey: ["user-profiles"],
    queryFn: async () => {
      const data = await base44.entities.UserProfile.list();
      return data || [];
    },
  });

  /**
   * Encontra o perfil correto baseado na job_role
   * @param {string} jobRole - A função do usuário (ex: "tecnico", "gerente")
   * @returns {string|null} - O ID do perfil correspondente ou null
   */
  const findProfileByJobRole = (jobRole) => {
    if (!jobRole) return null;
    
    // Busca perfil ativo que contenha essa job_role
    const matchingProfile = profiles.find(
      (profile) =>
        profile.status === "ativo" &&
        profile.job_roles &&
        Array.isArray(profile.job_roles) &&
        profile.job_roles.includes(jobRole)
    );

    return matchingProfile?.id || null;
  };

  /**
   * Retorna o perfil completo baseado na job_role
   */
  const getProfileByJobRole = (jobRole) => {
    if (!jobRole) return null;
    
    return profiles.find(
      (profile) =>
        profile.status === "ativo" &&
        profile.job_roles &&
        Array.isArray(profile.job_roles) &&
        profile.job_roles.includes(jobRole)
    );
  };

  return {
    profiles,
    findProfileByJobRole,
    getProfileByJobRole,
  };
}
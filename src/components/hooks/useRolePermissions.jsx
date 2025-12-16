import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { systemRoles } from "@/components/lib/systemRoles";

/**
 * Hook para gerenciar permissões baseadas em roles customizadas
 * Combina as system roles das CustomRoles atribuídas ao perfil do usuário
 */
export function useRolePermissions(user) {
  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.profile_id],
    queryFn: async () => {
      if (!user?.profile_id) return null;
      return await base44.entities.UserProfile.get(user.profile_id);
    },
    enabled: !!user?.profile_id,
  });

  const { data: customRoles = [] } = useQuery({
    queryKey: ["user-custom-roles", profile?.custom_role_ids],
    queryFn: async () => {
      if (!profile?.custom_role_ids || profile.custom_role_ids.length === 0) {
        return [];
      }
      const roles = await base44.entities.CustomRole.list();
      return roles.filter((r) => profile.custom_role_ids.includes(r.id));
    },
    enabled: !!profile?.custom_role_ids,
  });

  // Combinar todas as system_roles das custom roles
  const allSystemRoles = customRoles.reduce((acc, role) => {
    return [...acc, ...(role.system_roles || [])];
  }, []);

  // Verificar se tem uma role específica
  const hasRole = (roleId) => {
    if (user?.role === "admin") return true;
    return allSystemRoles.includes(roleId);
  };

  // Verificar permissões específicas (view, edit, create, delete, etc)
  const hasPermission = (moduleId, permission) => {
    if (user?.role === "admin") return true;

    // Buscar todas as roles do módulo que o usuário possui
    const module = systemRoles.find((m) => m.id === moduleId);
    if (!module) return false;

    // Verificar se alguma role do módulo tem a permissão
    return module.roles.some((role) => {
      return (
        allSystemRoles.includes(role.id) &&
        role.permissions.includes(permission)
      );
    });
  };

  // Funções auxiliares
  const canView = (moduleId) => hasPermission(moduleId, "view");
  const canEdit = (moduleId) => hasPermission(moduleId, "edit");
  const canCreate = (moduleId) => hasPermission(moduleId, "create");
  const canDelete = (moduleId) => hasPermission(moduleId, "delete");
  const canExport = (moduleId) => hasPermission(moduleId, "export");
  const canApprove = (moduleId) => hasPermission(moduleId, "approve");

  return {
    profile,
    customRoles,
    allSystemRoles,
    hasRole,
    hasPermission,
    canView,
    canEdit,
    canCreate,
    canDelete,
    canExport,
    canApprove,
    isAdmin: user?.role === "admin",
    isLoading: !profile,
  };
}
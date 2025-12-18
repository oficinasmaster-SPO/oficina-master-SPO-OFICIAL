import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function usePermissions(user) {
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      try {
        const perms = await base44.entities.UserPermission.filter({ 
          user_id: user.id,
          is_active: true
        });
        
        return perms && perms.length > 0 ? perms[0] : null;
      } catch (error) {
        console.error("Erro ao buscar permissões:", error);
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 300000, // 5 minutos
    retry: 1
  });

  const hasPermission = (module, action) => {
    // Admin sempre tem acesso
    if (user?.role === 'admin') return true;
    
    // Se não tem permissões configuradas, nega acesso
    if (!permissions || !permissions.modules_access) return false;
    
    const modulePerms = permissions.modules_access[module];
    if (!modulePerms) return false;
    
    return modulePerms[action] === true;
  };

  const canViewModule = (module) => hasPermission(module, 'view');
  const canEditModule = (module) => hasPermission(module, 'edit');
  const canDeleteModule = (module) => hasPermission(module, 'delete');
  const canCreateModule = (module) => hasPermission(module, 'create');

  return {
    permissions,
    isLoading,
    hasPermission,
    canViewModule,
    canEditModule,
    canDeleteModule,
    canCreateModule,
    isAdmin: user?.role === 'admin',
    permissionLevel: permissions?.permission_level || 'visualizador'
  };
}
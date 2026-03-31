import React, { createContext, useContext, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { systemRoles } from "@/components/lib/systemRoles";
import { pagePermissions } from "@/components/lib/pagePermissions";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const { workshopId, workshop, isAdminMode } = useWorkshopContext();
  const { user } = useAuth();

  const { data: permissionsData, isLoading: loading } = useQuery({
    queryKey: ['permissions', user?.id, workshopId, isAdminMode],
    queryFn: async () => {
      if (!user) return { permissions: [], profile: null, customRole: null, currentRole: null, isOwnerOrPartner: false, granularConfig: {} };

      let aggregatedPermissions = [];
      let activeRole = user.role === 'admin' ? 'admin' : (user.job_role || 'outros');
      let activeProfileId = user.profile_id;
      let isOwnerOrPartner = false;
      let granularConfig = {};

      const queries = [];

      // Carregar configuração granular
      queries.push(
        base44.entities.SystemSetting.filter({ key: 'granular_permissions' })
          .then(settings => {
            if (settings && settings.length > 0) {
              granularConfig = JSON.parse(settings[0].value || '{}');
            }
          })
          .catch(() => {})
      );

      // Admin com acesso total
      if (user.role === 'admin' && (isAdminMode || !workshopId)) {
        await Promise.all(queries); // Espera a granularConfig
        aggregatedPermissions = systemRoles.flatMap(m => m.roles.map(r => r.id));
        return {
          permissions: [...new Set(aggregatedPermissions)],
          profile: null,
          customRole: null,
          currentRole: activeRole,
          isOwnerOrPartner: false,
          granularConfig
        };
      }

      // Se oficina está selecionada, busca dados do colaborador em paralelo
      if (workshopId) {
        const wsPromise = workshop ? Promise.resolve(workshop) : base44.entities.Workshop.get(workshopId).catch(() => null);
        const empPromise = base44.entities.Employee.filter({ user_id: user.id, workshop_id: workshopId }).catch(() => null);
        
        const [ws, employees] = await Promise.all([wsPromise, empPromise]);

        if (employees && employees.length > 0) {
          if (employees[0].profile_id) activeProfileId = employees[0].profile_id;
          if (employees[0].job_role) activeRole = employees[0].job_role;
        } else if (ws && (ws.owner_id === user.id || (ws.partner_ids && ws.partner_ids.includes(user.id)))) {
          isOwnerOrPartner = true;
          aggregatedPermissions = systemRoles.flatMap(m => m.roles.map(r => r.id));
          activeRole = 'socio';
        }
      }

      let userProfile = null;
      let customRoleObj = null;

      // Carregar UserProfile e CustomRole em paralelo
      if (activeProfileId) {
        queries.push(
          base44.entities.UserProfile.get(activeProfileId)
            .then(p => { userProfile = p; })
            .catch(e => console.warn("Erro ao carregar UserProfile", e))
        );
      }

      if (user.custom_role_id) {
        queries.push(
          base44.entities.CustomRole.get(user.custom_role_id)
            .then(r => { customRoleObj = r; })
            .catch(e => console.warn("Erro ao carregar CustomRole", e))
        );
      }

      if (queries.length > 0) {
        await Promise.all(queries);
      }

      // Consolidar permissões do Profile
      if (userProfile && userProfile.id) {
        const profileRoles = userProfile.data?.roles || userProfile.roles || [];
        aggregatedPermissions = [...aggregatedPermissions, ...profileRoles];

        const customRoleIds = userProfile.data?.custom_role_ids || userProfile.custom_role_ids || [];
        if (customRoleIds && customRoleIds.length > 0) {
          const customRolesPromises = customRoleIds.map(roleId => 
            base44.entities.CustomRole.get(roleId).catch(() => null)
          );
          const roles = await Promise.all(customRolesPromises);
          for (const role of roles) {
            if (role) {
              const roleSysRoles = role.data?.system_roles || role.system_roles || [];
              aggregatedPermissions = [...aggregatedPermissions, ...roleSysRoles];
            }
          }
        }
      }

      // Consolidar permissões do CustomRole
      if (customRoleObj && customRoleObj.id) {
        const roleSysRoles = customRoleObj.data?.system_roles || customRoleObj.system_roles || [];
        aggregatedPermissions = [...aggregatedPermissions, ...roleSysRoles];
      }

      return {
        permissions: [...new Set(aggregatedPermissions)],
        profile: userProfile,
        customRole: customRoleObj,
        currentRole: activeRole,
        isOwnerOrPartner,
        granularConfig
      };
    },
    staleTime: 10 * 60 * 1000, // 10 min de cache
    refetchOnWindowFocus: false,
    enabled: !!user
  });

  const { 
    permissions = [], 
    profile = null, 
    customRole = null, 
    currentRole = null, 
    isOwnerOrPartner = false, 
    granularConfig = {} 
  } = permissionsData || {};

  const hasPermission = (permissionId) => {
    if (!user) return false;
    if (user.role === 'admin' && isAdminMode) return true;
    return permissions.includes(permissionId);
  };

  const hasGranularPermission = async (resourceId, actionId) => {
    if (!user) return false;
    if (user.role === 'admin' && isAdminMode) return true;
    if (isOwnerOrPartner) return true;

    try {
      if (profile?.job_roles && profile.job_roles.length > 0) {
        for (const jobRole of profile.job_roles) {
          const roleConfig = granularConfig[jobRole];
          if (roleConfig && roleConfig.resources && roleConfig.resources[resourceId]) {
            const actions = roleConfig.resources[resourceId].actions || [];
            if (actions.includes(actionId)) return true;
          }
        }
      }
      
      if (profile?.job_roles?.includes('socio') && resourceId === 'employees') return true;
      if ((profile?.job_roles?.includes('diretor') || profile?.job_roles?.includes('gerente')) && resourceId === 'employees') {
        if (actionId === 'read' || actionId === 'create' || actionId === 'update') return true;
      }
      
      if (profile?.module_permissions) {
        const moduleAccess = profile.module_permissions[resourceId];
        if (moduleAccess === 'total') return true;
        if (moduleAccess === 'visualizacao' && actionId === 'read') return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  };

  const canAccessPage = (pageName) => {
    try {
      if (!user) return false;
      if (user.role === 'admin' && isAdminMode) return true;

      const isPublicPage = pagePermissions[pageName] === null;
      if (isPublicPage) return true;

      const requiredPermission = pagePermissions[pageName];
      if (!requiredPermission) return true;
      if (requiredPermission === "public_authenticated") return !!user;

      return hasPermission(requiredPermission);
    } catch (error) {
      return user?.role === 'admin';
    }
  };

  const canPerform = (action) => {
    if (!user) return false;
    if (user.role === 'admin' && isAdminMode) return true;

    const actionPermissions = {
      'criar_usuario': ['user_create', 'admin_full'],
      'editar_usuario': ['user_update', 'admin_full'],
      'deletar_usuario': ['user_delete', 'admin_full'],
      'gerenciar_roles': ['roles_manage', 'admin_full'],
      'gerenciar_planos': ['plans_manage', 'admin_full'],
      'aprovar_usuarios': ['user_approve', 'admin_full'],
      'ver_dashboard': ['dashboard_view', 'admin_full'],
      'gerenciar_oficina': ['workshop_manage', 'admin_full'],
    };

    const requiredPerms = actionPermissions[action] || [];
    return requiredPerms.some(perm => permissions.includes(perm));
  };

  const isInternal = () => {
    return user?.is_internal === true || user?.tipo_vinculo === 'interno';
  };

  const value = useMemo(() => ({
    user: user || null,
    profile,
    customRole,
    currentRole,
    permissions,
    loading,
    hasPermission,
    hasGranularPermission,
    canAccessPage,
    canPerform,
    isInternal,
  }), [user, profile, customRole, currentRole, permissions, loading, isOwnerOrPartner, granularConfig]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionsContext() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissionsContext deve ser usado dentro de PermissionsProvider");
  }
  return context;
}
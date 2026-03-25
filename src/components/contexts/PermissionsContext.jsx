import React, { createContext, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { systemRoles } from "@/components/lib/systemRoles";
import { pagePermissions } from "@/components/lib/pagePermissions";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const { workshopId, isAdminMode } = useWorkshopContext();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [customRole, setCustomRole] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadPermissions = async () => {
      try {
        setLoading(true);
        const currentUser = await base44.auth.me().catch(() => null);
        if (!mounted) return;
        
        setUser(currentUser);
        let aggregatedPermissions = [];
        let activeRole = currentUser?.role === 'admin' ? 'admin' : (currentUser?.job_role || 'outros');

        if (currentUser) {
          if (currentUser.role === 'admin' && isAdminMode) {
            // Admin mode gives full access
            aggregatedPermissions = systemRoles.flatMap(m => m.roles.map(r => r.id));
          } else if (currentUser.role === 'admin' && !workshopId) {
             // Admin outside workshop
             aggregatedPermissions = systemRoles.flatMap(m => m.roles.map(r => r.id));
          } else {
            // Normal user or admin viewing their own workshop -> check Employee profile
            let activeProfileId = currentUser.profile_id;
            
            // If workshop is selected, find the Employee record for this specific workshop
            if (workshopId) {
              const employees = await base44.entities.Employee.filter({ 
                user_id: currentUser.id,
                workshop_id: workshopId
              });
              if (employees && employees.length > 0) {
                if (employees[0].profile_id) activeProfileId = employees[0].profile_id;
                if (employees[0].job_role) activeRole = employees[0].job_role;
              } else {
                // Se o owner_id da oficina é este usuário, garantir permissão total na oficina
                try {
                  const ws = await base44.entities.Workshop.get(workshopId);
                  if (ws && (ws.owner_id === currentUser.id || (ws.partner_ids && ws.partner_ids.includes(currentUser.id)))) {
                    // Owner/Partner gets full access
                    aggregatedPermissions = systemRoles.flatMap(m => m.roles.map(r => r.id));
                  }
                } catch(e) {}
              }
            }
            
            if (activeProfileId) {
              try {
                const userProfile = await base44.entities.UserProfile.get(activeProfileId);
                if (!mounted) return;
                
                if (userProfile && userProfile.id) {
                  setProfile(userProfile);
                  const profileRoles = userProfile.data?.roles || userProfile.roles || [];
                  aggregatedPermissions = [...aggregatedPermissions, ...profileRoles];
                  
                  const customRoleIds = userProfile.data?.custom_role_ids || userProfile.custom_role_ids || [];
                  if (customRoleIds && customRoleIds.length > 0) {
                    for (const roleId of customRoleIds) {
                      try {
                        const role = await base44.entities.CustomRole.get(roleId);
                        const roleSysRoles = role.data?.system_roles || role.system_roles || [];
                        if (mounted && roleSysRoles.length > 0) {
                          aggregatedPermissions = [...aggregatedPermissions, ...roleSysRoles];
                        }
                      } catch (e) {
                        console.warn("CustomRole não encontrada:", roleId);
                      }
                    }
                  }
                }
              } catch (e) {
                console.error("Erro ao carregar UserProfile:", e);
              }
            }

            if (currentUser.custom_role_id) {
              try {
                const role = await base44.entities.CustomRole.get(currentUser.custom_role_id);
                if (!mounted) return;
                setCustomRole(role);
                const roleSysRoles = role.data?.system_roles || role.system_roles || [];
                aggregatedPermissions = [...aggregatedPermissions, ...roleSysRoles];
              } catch (e) {
                console.error("Erro ao carregar CustomRole:", e);
              }
            }
          }
        }

        if (mounted) {
          setCurrentRole(activeRole);
          setPermissions([...new Set(aggregatedPermissions)]);
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro ao carregar permissões:", error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setCustomRole(null);
          setCurrentRole(null);
          setPermissions([]);
          setLoading(false);
        }
      }
    };

    loadPermissions();

    return () => {
      mounted = false;
    };
  }, [workshopId, isAdminMode]);

  const hasPermission = (permissionId) => {
    if (!user) return false;
    if (user.role === 'admin' && isAdminMode) return true;
    return permissions.includes(permissionId);
  };

  const hasGranularPermission = async (resourceId, actionId) => {
    if (!user) return false;
    if (user.role === 'admin' && isAdminMode) return true;
    
    // Se é o dono/sócio da filial, dar acesso total
    if (workshopId) {
      try {
        const ws = await base44.entities.Workshop.get(workshopId);
        if (ws && (ws.owner_id === user.id || (ws.partner_ids && ws.partner_ids.includes(user.id)))) {
          return true;
        }
      } catch (err) {}
    }

    try {
      const settings = await base44.entities.SystemSetting.filter({ key: 'granular_permissions' });
      if (!settings || settings.length === 0) return false;
      
      const granularConfig = JSON.parse(settings[0].value || '{}');
      
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

  const value = {
    user: user || null,
    profile: profile || null,
    customRole: customRole || null,
    currentRole: currentRole || null,
    permissions: permissions || [],
    loading,
    hasPermission,
    hasGranularPermission,
    canAccessPage,
    canPerform,
    isInternal,
  };

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
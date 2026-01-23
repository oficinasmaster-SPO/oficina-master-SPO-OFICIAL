import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { systemRoles } from "@/components/lib/systemRoles";
import { pagePermissions } from "@/components/lib/pagePermissions";

/**
 * Hook para verificar permissões do usuário atual
 * Retorna funções para validar acesso a páginas, módulos e ações
 */
export function usePermissions() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [customRole, setCustomRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const load = async () => {
      if (mounted) {
        await loadUserPermissions();
      }
    };
    
    load();
    
    return () => {
      mounted = false;
    };
  }, []);

  const loadUserPermissions = async () => {
    try {
      setLoading(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      let aggregatedPermissions = [];

      if (currentUser) {
        if (currentUser.role === 'admin') {
          aggregatedPermissions = systemRoles.flatMap(m => m.roles.map(r => r.id));
        } else {
          let employeeProfileId = null;
          try {
            const result = await base44.functions.invoke('getUserProfile', {});
            if (result?.data?.success && result.data.profile_id) {
              employeeProfileId = result.data.profile_id;
            }
          } catch (empError) {
            console.error("Erro ao buscar profile_id:", empError);
          }

          const profileId = currentUser.profile_id || employeeProfileId;
          
          if (profileId) {
            try {
              const userProfile = await base44.entities.UserProfile.get(profileId);

              if (!userProfile || !userProfile.id) {
                setProfile(null);
              } else {
                setProfile(userProfile);
                aggregatedPermissions = [...aggregatedPermissions, ...(userProfile.roles || [])];
                
                if (userProfile.custom_role_ids && userProfile.custom_role_ids.length > 0) {
                  for (const roleId of userProfile.custom_role_ids) {
                    try {
                      const customRole = await base44.entities.CustomRole.get(roleId);
                      if (customRole && customRole.system_roles) {
                        aggregatedPermissions = [...aggregatedPermissions, ...(customRole.system_roles || [])];
                      }
                    } catch (roleError) {
                      console.warn("CustomRole não encontrada:", roleId);
                    }
                  }
                }
              }
            } catch (profileError) {
              console.error("Erro ao carregar UserProfile:", profileError);
              setProfile(null);
            }
          }

          if (currentUser.custom_role_id) {
            try {
              const role = await base44.entities.CustomRole.get(currentUser.custom_role_id);
              setCustomRole(role);
              aggregatedPermissions = [...aggregatedPermissions, ...(role.system_roles || [])];
            } catch (customRoleError) {
              setCustomRole(null);
            }
          }
        }
      }

      const finalPermissions = [...new Set(aggregatedPermissions)];
      setPermissions(finalPermissions);
      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      setUser(null);
      setProfile(null);
      setCustomRole(null);
      setPermissions([]);
      setLoading(false);
    }
  };

  /**
   * Verifica se o usuário tem uma permissão específica
   */
  const hasPermission = (permissionId) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return permissions.includes(permissionId);
  };

  /**
   * Verifica permissão granular (recurso + ação)
   * @param {string} resourceId - ID do recurso (ex: 'employees', 'workshops')
   * @param {string} actionId - ID da ação (ex: 'create', 'read', 'update', 'delete')
   * @returns {boolean} - true se o usuário tem a permissão
   */
  const hasGranularPermission = async (resourceId, actionId) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    try {
      // Buscar configuração de permissões granulares
      const settings = await base44.entities.SystemSetting.filter({ key: 'granular_permissions' });
      
      if (!settings || settings.length === 0) {
        console.warn("⚠️ [hasGranularPermission] Configuração granular não encontrada");
        return false;
      }
      
      const granularConfig = JSON.parse(settings[0].value || '{}');
      
      // Verificar permissão por job_role via Employee
      if (profile?.job_roles && profile.job_roles.length > 0) {
        for (const jobRole of profile.job_roles) {
          const roleConfig = granularConfig[jobRole];
          if (roleConfig && roleConfig.resources && roleConfig.resources[resourceId]) {
            const actions = roleConfig.resources[resourceId].actions || [];
            if (actions.includes(actionId)) {
              console.log(`✅ [hasGranularPermission] ${jobRole} tem ${actionId} em ${resourceId}`);
              return true;
            }
          }
        }
      }
      
      // Fallback: Sócios têm permissão total (CRUD completo) para employees
      if (profile?.job_roles?.includes('socio') && resourceId === 'employees') {
        console.log(`✅ [hasGranularPermission] Sócio tem permissão ${actionId} em employees (CRUD completo)`);
        return true;
      }
      
      // Gestores tem permissão limitada (read, create, update) para employees
      if ((profile?.job_roles?.includes('diretor') || profile?.job_roles?.includes('gerente')) && resourceId === 'employees') {
        if (actionId === 'read' || actionId === 'create' || actionId === 'update') {
          console.log(`✅ [hasGranularPermission] ${profile.job_roles[0]} tem acesso ${actionId} a employees`);
          return true;
        }
      }
      
      // Verificar permissões de módulos
      if (profile?.module_permissions) {
        const moduleAccess = profile.module_permissions[resourceId];
        if (moduleAccess === 'total') return true;
        if (moduleAccess === 'visualizacao' && actionId === 'read') return true;
      }
      
      console.log(`❌ [hasGranularPermission] Sem permissão ${actionId} em ${resourceId}`);
      return false;
    } catch (error) {
      console.error("❌ [hasGranularPermission] Erro:", error);
      return false;
    }
  };

  /**
   * Verifica se o usuário pode acessar uma página
   * Sistema RBAC Granular: Usa mapeamento de página → permissão
   * Browser-safe: Não usa require() ou imports dinâmicos
   */
  const canAccessPage = (pageName) => {
    try {
      if (!user) return false;
      if (user.role === 'admin') return true;

      // Páginas públicas não requerem autenticação
      const isPublicPage = pagePermissions[pageName] === null;
      if (isPublicPage) {
        return true;
      }

      // Obter permissão necessária para a página
      const requiredPermission = pagePermissions[pageName];
      
      // Se não há permissão mapeada, permitir acesso (fallback)
      if (!requiredPermission) {
        return true;
      }

      // Verificar se o usuário tem a permissão granular necessária
      return hasPermission(requiredPermission);
    } catch (error) {
      console.error("❌ Erro ao verificar acesso à página:", error);
      // Em caso de erro, bloquear acesso por segurança
      return user?.role === 'admin';
    }
  };

  /**
   * Verifica se o usuário pode executar uma ação
   */
  const canPerform = (action) => {
    if (!user) return false;
    if (user.role === 'admin') return true;

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

  /**
   * Verifica se é usuário interno (consultor/mentor)
   */
  const isInternal = () => {
    return user?.is_internal === true || user?.tipo_vinculo === 'interno';
  };

  return {
    user: user || null,
    profile: profile || null,
    customRole: customRole || null,
    permissions: permissions || [],
    loading,
    hasPermission,
    hasGranularPermission,
    canAccessPage,
    canPerform,
    isInternal,
  };
}
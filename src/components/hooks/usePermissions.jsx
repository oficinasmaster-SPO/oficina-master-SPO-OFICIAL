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
    loadUserPermissions();
  }, []);

  const loadUserPermissions = async () => {
    try {
      setLoading(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      console.log("🔐 [usePermissions] Usuário:", currentUser.email, "| Role:", currentUser.role);

      let aggregatedPermissions = [];

      if (currentUser) {
        // Admin tem todas as permissões
        if (currentUser.role === 'admin') {
          aggregatedPermissions = systemRoles.flatMap(m => m.roles.map(r => r.id));
          console.log("👑 [usePermissions] Admin detectado - permissões totais");
        } else {
          // Buscar Employee vinculado para obter profile_id via backend
          // Usar backend para evitar problemas de RLS
          let employeeProfileId = null;
          try {
            console.log("🔍 [usePermissions] Buscando profile_id via backend...");
            const result = await base44.functions.invoke('getUserProfile', {});
            console.log("📦 [usePermissions] Resultado backend:", result?.data);
            
            if (result?.data?.success && result.data.profile_id) {
              employeeProfileId = result.data.profile_id;
              console.log("✅ [usePermissions] Profile ID obtido via backend:", employeeProfileId);
            } else {
              console.warn("⚠️ [usePermissions] Nenhum profile_id retornado pelo backend:", result?.data?.message);
            }
          } catch (empError) {
            console.error("❌ [usePermissions] Erro ao buscar profile_id:", empError?.message || empError);
            // Não bloquear o fluxo - usuário pode estar em pending approval
          }

          // Carregar perfil do usuário
          const profileId = currentUser.profile_id || employeeProfileId;
          console.log("🎯 [usePermissions] Profile ID a buscar:", profileId);
          
          if (profileId) {
            try {
              const userProfile = await base44.entities.UserProfile.get(profileId);

              // Verificar se o perfil existe e é válido
              if (!userProfile || !userProfile.id) {
                console.warn("⚠️ [usePermissions] UserProfile retornado é inválido ou null");
                setProfile(null);
                // Limpar profile_id inválido do Employee
                try {
                  const employees = await base44.entities.Employee.filter({ user_id: currentUser.id });
                  if (employees && employees.length > 0 && employees[0].profile_id === profileId) {
                    await base44.entities.Employee.update(employees[0].id, { profile_id: null });
                    console.log("🧹 [usePermissions] profile_id inválido removido do Employee");
                  }
                } catch (cleanupError) {
                  console.error("❌ [usePermissions] Erro ao limpar profile_id:", cleanupError);
                }
              } else {
                console.log("✅ [usePermissions] Perfil carregado:", userProfile.name || 'sem nome');
                console.log("📦 [usePermissions] Roles do perfil:", userProfile.roles || []);
                console.log("🔗 [usePermissions] Custom role IDs:", userProfile.custom_role_ids || []);
                setProfile(userProfile);
                
                // Agregar permissões do perfil (roles antigas)
                aggregatedPermissions = [...aggregatedPermissions, ...(userProfile.roles || [])];
                console.log("➕ [usePermissions] Permissões adicionadas do perfil:", userProfile.roles?.length || 0);
                
                // Agregar custom_role_ids do perfil
                if (userProfile.custom_role_ids && userProfile.custom_role_ids.length > 0) {
                  for (const roleId of userProfile.custom_role_ids) {
                    try {
                      const customRole = await base44.entities.CustomRole.get(roleId);
                      if (customRole && customRole.system_roles) {
                        aggregatedPermissions = [...aggregatedPermissions, ...(customRole.system_roles || [])];
                        console.log("➕ [usePermissions] Permissões da CustomRole:", customRole.name, "->", customRole.system_roles?.length || 0);
                      }
                    } catch (roleError) {
                      console.warn(`⚠️ [usePermissions] CustomRole ${roleId} não encontrada (ignorando)`, roleError?.message || roleError);
                    }
                  }
                }
              }
            } catch (profileError) {
              // Perfil não encontrado ou erro ao carregar
              console.error("❌ [usePermissions] Erro ao carregar UserProfile:", profileError?.message || profileError);
              setProfile(null);
            }
          } else {
            console.warn("⚠️ [usePermissions] Nenhum profile_id encontrado!");
          }

          // Carregar custom role se existir (fallback antigo)
          if (currentUser.custom_role_id) {
            try {
              const role = await base44.entities.CustomRole.get(currentUser.custom_role_id);
              setCustomRole(role);
              aggregatedPermissions = [...aggregatedPermissions, ...(role.system_roles || [])];
              console.log("➕ [usePermissions] Permissões da CustomRole antiga:", role.system_roles?.length || 0);
            } catch (customRoleError) {
              console.error("❌ [usePermissions] Erro ao carregar CustomRole:", customRoleError);
              setCustomRole(null);
            }
          }
        }
      }

      const finalPermissions = [...new Set(aggregatedPermissions)];
      setPermissions(finalPermissions);
      console.log("🎉 [usePermissions] PERMISSÕES FINAIS:", finalPermissions.length, "permissões");
      console.log("📜 [usePermissions] Lista:", finalPermissions);
      setLoading(false);
    } catch (error) {
      console.error("❌ [usePermissions] Erro fatal ao carregar permissões:", error);
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
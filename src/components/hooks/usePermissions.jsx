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

      let aggregatedPermissions = [];

      if (currentUser) {
        // Admin tem todas as permissões
        if (currentUser.role === 'admin') {
          aggregatedPermissions = systemRoles.flatMap(m => m.roles.map(r => r.id));
        } else {
          // Buscar Employee vinculado para obter profile_id
          let employeeProfileId = null;
          try {
            const employees = await base44.entities.Employee.filter({ user_id: currentUser.id });
            if (employees && employees.length > 0) {
              employeeProfileId = employees[0].profile_id;
            }
          } catch (empError) {
            console.error("Erro ao buscar Employee:", empError);
          }

          // Carregar perfil do usuário
          const profileId = currentUser.profile_id || employeeProfileId;
          if (profileId) {
            try {
              const userProfile = await base44.entities.UserProfile.get(profileId);
              
              // Verificar se o perfil existe e é válido
              if (userProfile && userProfile.id) {
                setProfile(userProfile);
                
                // Agregar permissões do perfil (roles antigas)
                aggregatedPermissions = [...aggregatedPermissions, ...(userProfile.roles || [])];
                
                // Agregar custom_role_ids do perfil
                if (userProfile.custom_role_ids && userProfile.custom_role_ids.length > 0) {
                  for (const roleId of userProfile.custom_role_ids) {
                    try {
                      const customRole = await base44.entities.CustomRole.get(roleId);
                      if (customRole && customRole.system_roles) {
                        aggregatedPermissions = [...aggregatedPermissions, ...(customRole.system_roles || [])];
                      }
                    } catch (roleError) {
                      console.warn(`⚠️ CustomRole ${roleId} não encontrada (ignorando)`, roleError.message);
                    }
                  }
                }
              }
            } catch (profileError) {
              // Perfil não encontrado ou erro ao carregar
              console.warn("⚠️ UserProfile não encontrado ou inválido (ignorando):", profileError.message);
              setProfile(null);
              
              // Se o perfil não existe, limpar o profile_id do Employee
              if (profileError.message?.includes('not found') && employeeProfileId) {
                try {
                  const employees = await base44.entities.Employee.filter({ user_id: currentUser.id });
                  if (employees && employees.length > 0) {
                    await base44.entities.Employee.update(employees[0].id, { profile_id: null });
                    console.log("🧹 profile_id inválido removido do Employee");
                  }
                } catch (cleanupError) {
                  console.error("Erro ao limpar profile_id:", cleanupError);
                }
              }
            }
          }

          // Carregar custom role se existir (fallback antigo)
          if (currentUser.custom_role_id) {
            try {
              const role = await base44.entities.CustomRole.get(currentUser.custom_role_id);
              setCustomRole(role);
              aggregatedPermissions = [...aggregatedPermissions, ...(role.system_roles || [])];
            } catch (customRoleError) {
              console.error("Erro ao carregar CustomRole:", customRoleError);
              setCustomRole(null);
            }
          }
        }
      }

      setPermissions([...new Set(aggregatedPermissions)]);
      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar permissões ou usuário não autenticado:", error);
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
    user,
    profile,
    customRole,
    permissions,
    loading,
    hasPermission,
    canAccessPage,
    canPerform,
    isInternal,
  };
}
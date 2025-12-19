import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { systemRoles } from "@/components/lib/systemRoles";

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
          // Carregar perfil do usuário
          if (currentUser.profile_id) {
            try {
              const userProfile = await base44.entities.UserProfile.get(currentUser.profile_id);
              setProfile(userProfile);
              aggregatedPermissions = [...aggregatedPermissions, ...(userProfile.roles || [])];
            } catch (profileError) {
              console.error("Erro ao carregar UserProfile:", profileError);
              setProfile(null);
            }
          }

          // Carregar custom role se existir
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
   * UNIFICADO: Agora usa apenas o UserProfile.modules_allowed
   */
  const canAccessPage = (pageName) => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    // Se tem perfil definido, verificar módulos permitidos
    if (profile?.modules_allowed) {
      return profile.modules_allowed.includes(pageName);
    }

    // Se não tem perfil configurado, permitir acesso (fallback)
    return true;
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
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
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Admin tem todas as permissões
      if (currentUser.role === 'admin') {
        const allPermissions = systemRoles.flatMap(m => m.roles.map(r => r.id));
        setPermissions(allPermissions);
        setLoading(false);
        return;
      }

      // Carregar perfil do usuário
      if (currentUser.profile_id) {
        try {
          const userProfile = await base44.entities.UserProfile.get(currentUser.profile_id);
          setProfile(userProfile);
          setPermissions(userProfile.roles || []);
        } catch (error) {
          console.error("Erro ao carregar perfil:", error);
        }
      }

      // Carregar custom role se existir
      if (currentUser.custom_role_id) {
        try {
          const role = await base44.entities.CustomRole.get(currentUser.custom_role_id);
          setCustomRole(role);
          setPermissions(prev => [...new Set([...prev, ...(role.system_roles || [])])]);
        } catch (error) {
          console.error("Erro ao carregar custom role:", error);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
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
   */
  const canAccessPage = (pageName) => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    // Páginas bloqueadas por job_role
    const blockedPages = {
      'mentor': ['Planos', 'GerenciarPlanos', 'MeuPlano'],
      'tecnico': ['GerenciarPlanos', 'AdminClientes', 'Usuarios'],
    };

    const userJobRole = user.job_role || 'outros';
    if (blockedPages[userJobRole]?.includes(pageName)) {
      return false;
    }

    // Verificar módulos permitidos no perfil
    if (profile?.modules_allowed) {
      return profile.modules_allowed.includes(pageName);
    }

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
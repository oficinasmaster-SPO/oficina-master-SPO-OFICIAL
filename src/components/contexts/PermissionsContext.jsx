import React, { createContext, useContext, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { systemRoles } from "@/components/lib/systemRoles";
import { pagePermissions } from "@/components/lib/pagePermissions";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useImpersonation } from "@/components/hooks/useImpersonation";

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const { workshopId: realWorkshopId, workshop: realWorkshop, isAdminMode } = useWorkshopContext();
  const { user: realUser } = useAuth();
  const { isImpersonating, effectiveUser } = useImpersonation();
  
  // Usar usuário efetivo (impersonado) ou usuário real
  const user = effectiveUser || realUser;
  
  // Em impersonação, usar workshop_id do usuário alvo
  const workshopId = isImpersonating && effectiveUser?.workshop_id ? effectiveUser.workshop_id : realWorkshopId;
  const workshop = realWorkshop; // Manter workshop do contexto

  const { data: permissionsData, isLoading: loading } = useQuery({
    queryKey: ['permissions', user?.id, workshopId, isAdminMode, isImpersonating],
    queryFn: async () => {
      if (!user) return { permissions: [], profile: null, customRole: null, currentRole: null, isOwnerOrPartner: false, granularConfig: {} };
      
      // Em impersonação, NÃO aplicar lógica de admin/internal — usar permissões do usuário alvo
      const isImpersonated = user._isImpersonated === true;

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

      // Admin ou usuário interno têm acesso total — MAS NÃO em impersonação!
      if ((user.role === 'admin' || user.user_type === 'internal') && !isImpersonated) {
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

      // Busca dados do colaborador e do workshop em paralelo
      // CORREÇÃO: buscar Employee sempre por user_id (sem filtro workshop_id para evitar race condition)
      // e buscar workshop pelo workshopId do user.data se ainda não disponível no contexto
      const effectiveWorkshopId = workshopId || user?.data?.workshop_id || user?.workshop_id;
      
      const wsPromise = effectiveWorkshopId
        ? ((workshop && workshop.id === effectiveWorkshopId)
          ? Promise.resolve(workshop)
          : base44.entities.Workshop.get(effectiveWorkshopId).catch(() => null))
        : Promise.resolve(null);
      
      // CORREÇÃO BUG #1: filtrar Employee apenas por user_id — sem workshop_id para evitar race condition
      const empPromise = base44.entities.Employee.filter({ user_id: user.id }).catch(() => null);
      
      const [ws, employees] = await Promise.all([wsPromise, empPromise]);

      if (employees && employees.length > 0) {
        // Pegar o Employee vinculado ao workshop correto, se houver múltiplos
        const matchingEmployee = effectiveWorkshopId
          ? (employees.find(e => e.workshop_id === effectiveWorkshopId) || employees[0])
          : employees[0];
        activeProfileId = matchingEmployee.profile_id || user.profile_id || user.data?.profile_id;
        if (matchingEmployee.job_role) activeRole = matchingEmployee.job_role;
      }
      
      // CORREÇÃO BUG #4: verificar owner_id independente de ter encontrado Employee
      if (ws && (ws.owner_id === user.id || (ws.partner_ids && ws.partner_ids.includes(user.id)))) {
        isOwnerOrPartner = true;
        // owner/sócio sempre tem acesso total — mas ainda carrega o profile para granularidade
        aggregatedPermissions = systemRoles.flatMap(m => m.roles.map(r => r.id));
        if (!employees || employees.length === 0) activeRole = 'socio';
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
    // Em impersonação, NÃO usar permissões de admin — usar permissões do usuário alvo
    const isImpersonated = user._isImpersonated === true;
    if ((user.role === 'admin' || user.user_type === 'internal') && !isImpersonated) return true;
    return permissions.includes(permissionId);
  };

  const hasGranularPermission = async (resourceId, actionId) => {
    if (!user) return false;
    const isImpersonated = user._isImpersonated === true;
    if ((user.role === 'admin') && !isImpersonated) return true;
    if (isOwnerOrPartner && !isImpersonated) return true;

    try {
      // 1. Verificar granular config por job_role do perfil
      if (profile?.job_roles && profile.job_roles.length > 0) {
        for (const jobRole of profile.job_roles) {
          const roleConfig = granularConfig[jobRole];
          if (roleConfig && roleConfig.resources && roleConfig.resources[resourceId]) {
            const actions = roleConfig.resources[resourceId].actions || [];
            if (actions.includes(actionId)) return true;
          }
        }
      }
      
      // 2. Atalhos por cargo
      if (profile?.job_roles?.includes('socio') && resourceId === 'employees') return true;
      if ((profile?.job_roles?.includes('diretor') || profile?.job_roles?.includes('gerente')) && resourceId === 'employees') {
        if (actionId === 'read' || actionId === 'create' || actionId === 'update') return true;
      }
      
      // 3. Verificar module_permissions do perfil
      if (profile?.module_permissions) {
        const moduleAccess = profile.module_permissions[resourceId];
        if (moduleAccess === 'total') return true;
        if (moduleAccess === 'visualizacao' && actionId === 'read') return true;
      }
      
      // 4. Fallback: se nenhuma configuração granular existe, verificar permissão de página
      // Isso permite que usuários com permissão de nível de página acessem os recursos
      const resourceToPagePermMap = {
        employees: { read: 'employees.view', create: 'employees.create', update: 'employees.edit', delete: 'employees.delete' },
        workshop: { read: 'workshop.view', update: 'workshop.manage_goals' },
        diagnostics: { read: 'diagnostics.view', create: 'diagnostics.create' },
        processes: { read: 'processes.view', create: 'processes.create' },
        documents: { read: 'documents.upload', create: 'documents.upload' },
        training: { read: 'training.view', create: 'training.create', update: 'training.manage' },
        culture: { read: 'culture.view', create: 'culture.edit', update: 'culture.manage_rituals' },
        operations: { read: 'operations.view_qgp', create: 'operations.manage_tasks' },
        dashboard: { read: 'dashboard.view' },
      };
      const permMap = resourceToPagePermMap[resourceId];
      if (permMap && permMap[actionId]) {
        if (permissions.includes(permMap[actionId])) return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  };

  const canAccessPage = (pageName) => {
    try {
      if (!user) return false;
      const isImpersonated = user._isImpersonated === true;
      if ((user.role === 'admin' || user.user_type === 'internal') && !isImpersonated) return true;

      // Sócio/proprietário tem acesso total a todas as páginas não-admin
      if (isOwnerOrPartner && !isImpersonated) {
        const requiredPermission = pagePermissions[pageName];
        // Só bloquear páginas que exigem role 'admin' explicitamente (plataforma admin)
        if (requiredPermission === 'admin') return false;
        if (requiredPermission === 'admin.rbac') return false;
        if (requiredPermission === 'admin.financeiro') return false;
        if (requiredPermission === 'admin.audit') return false;
        return true;
      }

      const isPublicPage = pagePermissions[pageName] === null;
      if (isPublicPage) return true;

      const requiredPermission = pagePermissions[pageName];
      // RISK-04: páginas não mapeadas requerem autenticação básica (não ficam abertas)
      if (requiredPermission === undefined) return hasPermission('dashboard.view');
      if (requiredPermission === null) return true; // explicitamente pública
      if (requiredPermission === "public_authenticated") return !!user;

      return hasPermission(requiredPermission);
    } catch (error) {
      return user?.role === 'admin';
    }
  };

  const canPerform = (action) => {
    if (!user) return false;
    const isImpersonated = user._isImpersonated === true;
    if ((user.role === 'admin' || user.user_type === 'internal') && !isImpersonated) return true;

    // IDs mapeados para as roles reais de systemRoles.jsx
    // WARN-01 corrigido: mapeamento anterior usava strings inexistentes
    // ('user_create', 'admin_full') que nunca estavam em permissions[]
    const actionPermissions = {
      'criar_usuario':     ['admin.users', 'employees.create'],
      'editar_usuario':    ['admin.users', 'employees.edit'],
      'deletar_usuario':   ['admin.users', 'employees.delete'],
      'gerenciar_roles':   ['admin.profiles'],
      'gerenciar_planos':  ['admin.users'],
      'aprovar_usuarios':  ['admin.users'],
      'ver_dashboard':     ['dashboard.view'],
      'gerenciar_oficina': ['workshop.edit'],
    };

    const requiredPerms = actionPermissions[action] || [];
    return requiredPerms.some(perm => permissions.includes(perm));
  };

  // Fonte canônica: user_type. Campos legados (is_internal, tipo_vinculo) mantidos
  // apenas para retrocompatibilidade — não usar em lógica nova.
  const isInternal = () => {
    const isImpersonated = user._isImpersonated === true;
    // Em impersonação, usar user_type do usuário alvo
    return user?.user_type === 'internal' && !isImpersonated;
  };

  const value = useMemo(() => ({
    user: user || null,
    profile,
    customRole,
    currentRole,
    permissions,
    isOwnerOrPartner,
    loading,
    hasPermission,
    hasGranularPermission,
    canAccessPage,
    canPerform,
    isInternal,
  }), [user, profile, customRole, currentRole, permissions, isOwnerOrPartner, loading, granularConfig]);

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
import React, { createContext, useContext, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { systemRoles } from "@/components/lib/systemRoles";
import { pagePermissions } from "@/components/lib/pagePermissions";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useImpersonation } from "@/components/hooks/useImpersonation";

const PermissionsContext = createContext(null);

// FIX (2026-06-12): createPageUrl gera URLs em minúsculas (/colaboradores),
// mas pagePermissions usa chaves PascalCase (Colaboradores). Lookup case-insensitive
// para evitar fail-close indevido que escondia o sidebar de usuários externos.
const pagePermissionsLower = Object.fromEntries(
  Object.entries(pagePermissions).map(([k, v]) => [k.toLowerCase(), v])
);
const resolvePagePermission = (pageName) => {
  if (!pageName) return undefined;
  if (pageName in pagePermissions) return pagePermissions[pageName];
  return pagePermissionsLower[String(pageName).toLowerCase()];
};

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
    gcTime: 5 * 60 * 1000,
    retry: 2,
    queryFn: async () => {
      if (!user) return { permissions: [], profile: null, customRole: null, currentRole: null, isOwnerOrPartner: false, granularConfig: {} };
      
      // Em impersonação, NÃO aplicar lógica de admin/internal — usar permissões do usuário alvo
      const isImpersonated = user._isImpersonated === true;

      let aggregatedPermissions = [];
      let activeRole = user.role === 'admin' ? 'admin' : 'outros';
      let activeProfileId = null; // Fonte canônica: Employee.profile_id exclusivamente
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
      // Resiliente a user_type=null: verificar também consulting_firm_id como fallback
      const isInternalUser = user.user_type === 'internal' ||
        (user.user_type == null && (
          user.consulting_firm_id === '69bab264d7c3fe5d367c3959' ||
          user.role === 'admin'
        ));
      if ((user.role === 'admin' || isInternalUser) && !isImpersonated) {
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
      
      console.log('[RBAC_WORKSHOP_RESOLVE]', {
        userId: user?.id,
        workshopId,
        userDataWorkshopId: user?.data?.workshop_id,
        userWorkshopId: user?.workshop_id,
        effectiveWorkshopId,
        workshopAlreadyLoaded: !!(workshop && workshop.id === effectiveWorkshopId),
      });
      
      const wsPromise = effectiveWorkshopId
        ? ((workshop && workshop.id === effectiveWorkshopId)
          ? Promise.resolve(workshop)
          : base44.entities.Workshop.get(effectiveWorkshopId).catch(() => null))
        : Promise.resolve(null);
      
      // CORREÇÃO BUG #1: filtrar Employee apenas por user_id — sem workshop_id para evitar race condition
      const empPromise = base44.entities.Employee.filter({ user_id: user.id }).catch(() => null);
      
      const [ws, employees] = await Promise.all([wsPromise, empPromise]);

      console.log('[RBAC_FETCH_RESULT]', {
        userId: user?.id,
        wsFound: !!ws,
        wsOwnerId: ws?.owner_id,
        userIsOwner: ws?.owner_id === user?.id,
        employeesCount: employees?.length,
        employeeProfileIds: employees?.map(e => ({ id: e.id, profile_id: e.profile_id, status: e.status, user_status: e.user_status, workshop_id: e.workshop_id })),
      });

      if (employees && employees.length > 0) {
        // Filtrar apenas employees ativos para evitar que registro inativo seja retornado (P3.A 2026-06-10)
        const activeEmployees = employees.filter(e => e.status === 'ativo' || e.user_status === 'ativo');
        const pool = activeEmployees.length > 0 ? activeEmployees : employees;
        // Pegar o Employee vinculado ao workshop correto, se houver múltiplos
        const matchingEmployee = effectiveWorkshopId
          ? (pool.find(e => e.workshop_id === effectiveWorkshopId) || pool[0])
          : pool[0];
        activeProfileId = matchingEmployee.profile_id || null; // Canônico: apenas Employee.profile_id
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

      // Carregar UserProfile via Employee.profile_id (única fonte canônica)
      if (activeProfileId) {
        queries.push(
          base44.entities.UserProfile.get(activeProfileId)
            .then(p => { userProfile = p; })
            .catch(e => console.warn("Erro ao carregar UserProfile", e))
        );
      }

      // NOTA: User.profile_id, user.data.profile_id e user.custom_role_id foram removidos (2026-06-10).
      // Fonte canônica única: Employee.profile_id → UserProfile.roles (+ UserProfile.custom_role_ids)

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

      const finalPermissions = [...new Set(aggregatedPermissions)];
      console.log('[RBAC_FINAL]', {
        userId: user?.id,
        workshopId,
        effectiveWorkshopId,
        activeProfileId,
        userProfileId: userProfile?.id,
        profileRolesCount: (userProfile?.data?.roles || userProfile?.roles || []).length,
        permissionsCount: finalPermissions.length,
        isOwnerOrPartner,
        permissions: finalPermissions
      });
      return {
        permissions: finalPermissions,
        profile: userProfile,
        customRole: null,
        currentRole: activeRole,
        isOwnerOrPartner,
        granularConfig
      };
    },
    staleTime: 0, // sem cache — sempre refetch para garantir permissões frescas
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

  console.log('[RBAC_QUERY_RESULT]', {
    loading,
    permissionsCount: permissions?.length,
    hasData: !!permissionsData,
    userId: user?.id,
    workshopId,
  });

  // Sem fallback: usuário sem Employee.profile_id tem permissions = []
  // Admin tem bypass completo via queryFn acima.

  const hasPermission = (permissionId) => {
    if (!user) return false;
    // Em impersonação, NÃO usar permissões de admin — usar permissões do usuário alvo
    const isImpersonated = user._isImpersonated === true;
    const isInternalCheck = user.user_type === 'internal' ||
      (user.user_type == null && user.consulting_firm_id === '69bab264d7c3fe5d367c3959');
    if ((user.role === 'admin' || isInternalCheck) && !isImpersonated) return true;
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
      
      // 2. [REMOVIDO] Atalhos por cargo hardcoded.
      // Anteriormente Sócios, Diretores e Gerentes tinham bypass fixo no código 
      // para acessar/editar colaboradores (resourceId === 'employees').
      // Agora o acesso é definido EXCLUSIVAMENTE pelo RBAC (granularConfig ou systemRoles).
      // Isso impede que um "Superpoder" oculto burle as configurações visíveis no painel.
      
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
      const isInternalCheck = user.user_type === 'internal' ||
        (user.user_type == null && user.consulting_firm_id === '69bab264d7c3fe5d367c3959');
      if ((user.role === 'admin' || isInternalCheck) && !isImpersonated) return true;

      // Sócio/proprietário tem acesso total a todas as páginas não-admin
      if (isOwnerOrPartner && !isImpersonated) {
        const requiredPermission = resolvePagePermission(pageName);
        // Só bloquear páginas que exigem role 'admin' explicitamente (plataforma admin)
        if (requiredPermission === 'admin') return false;
        if (requiredPermission === 'admin.rbac') return false;
        if (requiredPermission === 'admin.financeiro') return false;
        if (requiredPermission === 'admin.audit') return false;
        if (requiredPermission === 'admin.profiles') return false;
        if (requiredPermission === 'admin.system_config') return false;
        if (requiredPermission === 'admin.users') return false;
        return true;
      }

      const requiredPermission = resolvePagePermission(pageName);
      if (requiredPermission === null) return true; // página pública
      // Segurança (Fail-Close): Se não está mapeado, o acesso é estritamente negado.
      if (requiredPermission === undefined) return false;
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
    const isInternalCheck = user.user_type === 'internal' ||
      (user.user_type == null && user.consulting_firm_id === '69bab264d7c3fe5d367c3959');
    if ((user.role === 'admin' || isInternalCheck) && !isImpersonated) return true;

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
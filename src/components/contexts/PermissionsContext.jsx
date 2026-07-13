import React, { createContext, useContext, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { systemRoles } from "@/components/lib/systemRoles";
import { pagePermissions } from "@/components/lib/pagePermissions";
import { useTenant } from "@/components/contexts/TenantSessionContext";
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
  const { user: realUser } = useAuth();
  const { effectiveUser } = useImpersonation();
  const {
    membership,
    membershipType,
    profileId,
    workshopId,
    isAdminMode,
    isImpersonating,
    isLoading: tenantLoading,
  } = useTenant();

  const user = effectiveUser || realUser;

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions', user?.id, workshopId, membership?.id, profileId, isAdminMode, isImpersonating],
    gcTime: 5 * 60 * 1000,
    retry: 2,
    queryFn: async () => {
      if (!user || !membership) {
        return { permissions: [], profile: null, customRole: null, currentRole: null, isOwnerOrPartner: false, granularConfig: {} };
      }

      const isImpersonated = isImpersonating || user._isImpersonated === true;
      const activeProfileId = membership.profile_id || profileId || null;
      const activeRole = membership.membership_type || membershipType || (user.role === 'admin' ? 'admin' : 'outros');
      const isOwnerOrPartner = ['owner', 'partner'].includes(membership.membership_type || membershipType);
      let granularConfig = {};

      const settings = await base44.entities.SystemSetting.filter({ key: 'granular_permissions' }).catch(() => []);
      if (settings?.length > 0) {
        try { granularConfig = JSON.parse(settings[0].value || '{}'); } catch (_) {}
      }

      const isInternalUser = user.user_type === 'internal' ||
        (user.user_type == null && (user.consulting_firm_id === '69bab264d7c3fe5d367c3959' || user.role === 'admin'));
      if ((user.role === 'admin' || isInternalUser) && !isImpersonated) {
        return {
          permissions: [...new Set(systemRoles.flatMap(module => module.roles.map(role => role.id)))],
          profile: null,
          customRole: null,
          currentRole: activeRole,
          isOwnerOrPartner,
          granularConfig
        };
      }

      let userProfile = null;
      let aggregatedPermissions = isOwnerOrPartner
        ? systemRoles.flatMap(module => module.roles.map(role => role.id))
        : [];

      if (activeProfileId) {
        userProfile = await base44.entities.UserProfile.get(activeProfileId).catch(() => null);
      }

      if (userProfile) {
        aggregatedPermissions.push(...(userProfile.data?.roles || userProfile.roles || []));
        const customRoleIds = userProfile.data?.custom_role_ids || userProfile.custom_role_ids || [];
        const customRoles = await Promise.all(
          customRoleIds.map(roleId => base44.entities.CustomRole.get(roleId).catch(() => null))
        );
        for (const role of customRoles) {
          if (role) aggregatedPermissions.push(...(role.data?.system_roles || role.system_roles || []));
        }
      }

      return {
        permissions: [...new Set(aggregatedPermissions)],
        profile: userProfile,
        customRole: null,
        currentRole: activeRole,
        isOwnerOrPartner,
        granularConfig
      };
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
    enabled: !!user && !!membership && !tenantLoading
  });

  const { 
    permissions = [], 
    profile = null, 
    customRole = null, 
    currentRole = null, 
    isOwnerOrPartner = false, 
    granularConfig = {} 
  } = permissionsData || {};
  const loading = tenantLoading || permissionsLoading;

  // Sem fallback local: profile_id e vínculo de tenant vêm exclusivamente da membership efetiva.
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
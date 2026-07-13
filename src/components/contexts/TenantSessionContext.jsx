import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useAdminMode } from '@/components/hooks/useAdminMode';
import { getImpersonationData } from '@/components/shared/ImpersonationBanner';

/**
 * TenantSessionContext — fonte única de decisão de tenant no frontend.
 *
 * Toda resolução de oficina passa pela function resolveTenant (backend =
 * autoridade). A seleção persistida no localStorage é APENAS preferência,
 * nunca autorização: se o backend negar (403), a preferência é descartada
 * e o tenant default é resolvido.
 *
 * Impersonação e admin mode são enviados como PARÂMETROS ao resolveTenant
 * (impersonated_user_id / admin_workshop_id) — não substituem o usuário
 * localmente.
 */
const TenantSessionContext = createContext(null);

const prefKeyFor = (email) => (email ? `om_tenant_workshop_${email.toLowerCase()}` : null);

export function TenantSessionProvider({ children }) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const { isAdminMode, adminWorkshopId } = useAdminMode();
  const queryClient = useQueryClient();

  const impersonationData = useMemo(() => getImpersonationData(user?.email), [user?.email]);
  const impersonatedUserId = impersonationData?.target_user?.id || null;

  const prefKey = prefKeyFor(user?.email);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState(null);

  // Carrega a preferência persistida quando o usuário estiver disponível
  useEffect(() => {
    if (!prefKey) return;
    try {
      setSelectedWorkshopId(localStorage.getItem(prefKey) || null);
    } catch (_) {
      setSelectedWorkshopId(null);
    }
  }, [prefKey]);

  // Resolução de tenant — SEMPRE via resolveTenant (backend valida membership)
  const { data: session, isLoading: isSessionLoading } = useQuery({
    queryKey: ['tenant-session', user?.id, impersonatedUserId, isAdminMode ? adminWorkshopId : null, selectedWorkshopId],
    queryFn: async () => {
      const params = {};
      if (impersonatedUserId) params.impersonated_user_id = impersonatedUserId;
      if (!impersonatedUserId && isAdminMode && adminWorkshopId) {
        params.admin_workshop_id = adminWorkshopId;
      } else if (selectedWorkshopId) {
        params.workshop_id = selectedWorkshopId;
      }
      try {
        const res = await base44.functions.invoke('resolveTenant', params);
        return res.data;
      } catch (err) {
        const status = err?.status || err?.response?.status;
        if (status === 403 && params.workshop_id) {
          // Preferência sem autorização — descartar e resolver o default
          try { if (prefKey) localStorage.removeItem(prefKey); } catch (_) {}
          const retryParams = impersonatedUserId ? { impersonated_user_id: impersonatedUserId } : {};
          const res = await base44.functions.invoke('resolveTenant', retryParams);
          return res.data;
        }
        if (status === 404) return null; // usuário sem tenant
        throw err;
      }
    },
    enabled: isAuthenticated && !isLoadingAuth && !!user?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  // Enriquecimento: dados completos das oficinas (nome, cidade, custom_css_url, etc)
  // via BFF getUserWorkshops (service role) — resolveTenant retorna só dados básicos.
  const { data: fullWorkshops = [] } = useQuery({
    queryKey: ['tenant-session-workshops', session?.effective_user_id],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('getUserWorkshops', {});
        return res?.data?.workshops || [];
      } catch (_) {
        return [];
      }
    },
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  // Workshop efetivo: básico do resolveTenant + campos completos do BFF (quando houver)
  const workshop = useMemo(() => {
    if (!session?.workshop) return null;
    const full = fullWorkshops.find((w) => w.id === session.workshop.id);
    return full ? { ...session.workshop, ...full } : session.workshop;
  }, [session, fullWorkshops]);

  // Todas as filiais das memberships (seletor do header / dono multi-filial)
  const availableWorkshops = useMemo(() => {
    if (!session) return [];
    const byId = new Map(fullWorkshops.map((w) => [w.id, w]));
    const seen = new Set();
    const list = [];
    for (const m of session.memberships || []) {
      if (!m.workshop_id || seen.has(m.workshop_id)) continue;
      seen.add(m.workshop_id);
      list.push(byId.get(m.workshop_id) || (m.workshop_id === session.workshop?.id ? workshop : { id: m.workshop_id, name: 'Oficina' }));
    }
    if (session.workshop?.id && !seen.has(session.workshop.id)) {
      list.unshift(workshop);
    }
    return list;
  }, [session, fullWorkshops, workshop]);

  // Troca de oficina: persiste preferência e REVALIDA via resolveTenant
  const switchWorkshop = useCallback((id) => {
    if (!id) return;
    try { if (prefKey) localStorage.setItem(prefKey, id); } catch (_) {}
    // Limpa caches de dados do tenant anterior (evita vazamento entre filiais)
    queryClient.removeQueries({
      predicate: (q) => q.queryKey?.[0] !== 'tenant-session' && q.queryKey?.[0] !== 'tenant-session-workshops',
    });
    setSelectedWorkshopId(id);
  }, [prefKey, queryClient]);

  const value = useMemo(() => ({
    workshop,
    workshopId: workshop?.id || null,
    company: session?.company_id || null,
    companyId: session?.company_id || null,
    consultingFirmId: session?.consulting_firm_id || null,
    membership: session?.membership || null,
    memberships: session?.memberships || [],
    membershipType: session?.membership_type || null,
    profile: session?.profile_id || null,
    profileId: session?.profile_id || null,
    isAdmin: session?.isAdmin ?? user?.role === 'admin',
    isImpersonating: session?.isImpersonating ?? !!impersonatedUserId,
    isAdminMode,
    availableWorkshops,
    switchWorkshop,
    effectiveUserId: session?.effective_user_id || user?.id || null,
    fallbackUsed: session?.fallback_used || false,
    isLoading: isLoadingAuth || (isAuthenticated && !!user?.id && isSessionLoading),
  }), [workshop, session, user, impersonatedUserId, isAdminMode, availableWorkshops, switchWorkshop, isLoadingAuth, isAuthenticated, isSessionLoading]);

  return (
    <TenantSessionContext.Provider value={value}>
      {children}
    </TenantSessionContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantSessionContext);
  if (!ctx) {
    throw new Error('useTenant deve ser usado dentro de TenantSessionProvider');
  }
  return ctx;
}

// Alias explícito para evitar colisão de nome com o TenantContext legado
export const useTenantSession = useTenant;
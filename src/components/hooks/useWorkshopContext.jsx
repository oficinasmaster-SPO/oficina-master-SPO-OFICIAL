import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAdminMode } from './useAdminMode';
import { useTenant } from '@/components/contexts/TenantContext';
import { base44 } from '@/api/base44Client';

/**
 * Hook que SEMPRE retorna o workshop correto:
 * - Se em modo admin, retorna o workshop admin
 * - Senão, retorna o workshop do usuário
 */
export function useWorkshopContext() {
  const { isAdminMode, adminWorkshopId } = useAdminMode();
  const { selectedFirmId, selectedCompanyId, changeCompany, isLoading: isTenantLoading, user: tenantUser } = useTenant();

  // 1. Busca a lista de workshops disponíveis do usuário. Isso ocorre apenas uma vez e é cacheado.
  const { data: available = [], isLoading: isAvailableLoading } = useQuery({
    queryKey: ['workshops-available', tenantUser?.id],
    queryFn: async () => {
      const user = tenantUser || await base44.auth.me().catch(() => null);
      if (!user) return [];

      try {
        const response = await base44.functions.invoke('getUserWorkshops', {});
        if (response?.data?.workshops) {
          return response.data.workshops;
        }
      } catch (err) {
        const status = err?.status || err?.response?.status;
        if (status === 429) {
          // LOAD-04: rate limit — lançar erro para que o React Query mantenha o cache anterior (keepPreviousData)
          throw new Error('rate_limit');
        }
        console.warn('Erro ao buscar workshops via BFF:', status || err?.message);
        return [];
      }
      return [];
    },
    enabled: !isTenantLoading,
    staleTime: 2 * 60 * 1000, // DS-FIX-D1: reduzido de 15min → 2min para refletir dados corrigidos mais rápido
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      // LOAD-04: retry automático após rate limit (aguarda 8s)
      if (error?.message === 'rate_limit') return failureCount < 2;
      return failureCount < 1;
    },
    retryDelay: (attempt, error) => error?.message === 'rate_limit' ? 8000 : 5000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // LOAD-04: manter dados anteriores em caso de erro — não limpar workshop em erros transitórios
    placeholderData: (previousData) => previousData,
  });

  // 2. Determina o workshop atual DE FORMA SÍNCRONA baseado na lista 'available'
  // FIX-03: Priorizar selectedCompanyId > available > profile.workshop_id
  let userWorkshop = null;
  let missingWorkshopIdToFetch = null;

  if (isAdminMode && adminWorkshopId) {
    userWorkshop = available.find(w => w.id === adminWorkshopId);
    if (!userWorkshop) missingWorkshopIdToFetch = adminWorkshopId;
  } else if (selectedCompanyId) {
    userWorkshop = available.find(w => w.id === selectedCompanyId);
    // FIX-03: Se selectedCompanyId não está em available, buscar mesmo que seja diferente do perfil
    if (!userWorkshop) missingWorkshopIdToFetch = selectedCompanyId;
  } else if (available.length > 0) {
    userWorkshop = available.find(w => !w.company_id) || available[0];
  } else if (tenantUser) {
    // FIX-03: Se BFF retornou vazio, tentar profile.workshop_id como fallback
    const userWorkshopId = tenantUser?.data?.workshop_id || tenantUser?.workshop_id;
    if (userWorkshopId) {
      // Sempre buscar do perfil se BFF não retornou nada
      missingWorkshopIdToFetch = userWorkshopId;
    }
  }

  // 3. Caso o workshop selecionado não esteja na lista de disponíveis, busca individualmente (Fallback)
  const { data: fetchedWorkshop, isLoading: isFetchedLoading, error: fetchError } = useQuery({
    queryKey: ['workshop-single', missingWorkshopIdToFetch],
    queryFn: async () => {
      if (!missingWorkshopIdToFetch) return null;
      try {
        // GAP-01: chamar BFF que tem asServiceRole — evita bloqueio por RLS no frontend
        const response = await base44.functions.invoke('getUserWorkshops', {
          workshopId: missingWorkshopIdToFetch
        });
        if (response?.data?.workshops?.length > 0) {
          const found = response.data.workshops.find(w => w.id === missingWorkshopIdToFetch);
          if (found) return found;
          return response.data.workshops[0];
        }
        // Fallback local apenas se BFF também não encontrar
        const wsList = await base44.entities.Workshop.filter({ id: missingWorkshopIdToFetch });
        return wsList?.[0] || null;
      } catch (e) {
        // QA-FIX-01: Log detalhado do erro para diagnóstico
        console.error(`[useWorkshopContext] Falha ao buscar workshop ${missingWorkshopIdToFetch}:`, e?.message || e);
        return null;
      }
    },
    enabled: !!missingWorkshopIdToFetch && !isAvailableLoading,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const workshop = userWorkshop || fetchedWorkshop || null;
  const workshopsDisponiveis = available;
  // isLoading só é true se AINDA estamos carregando dados iniciais
  // Se o fetch do workshop individual terminou (mesmo sem resultado), não estamos mais loading
  const isFetchingMissing = !!missingWorkshopIdToFetch && isFetchedLoading && !userWorkshop;
  const isLoading = isTenantLoading || isAvailableLoading || isFetchingMissing;

  // FIX-05: Debug logging para auxiliar diagnóstico
  // QA-FIX-01: Adicionado log de erro quando workshop não existe
  useEffect(() => {
    if (!workshop && !isLoading) {
      console.warn('DEBUG [useWorkshopContext]:', {
        available: available.length,
        selectedCompanyId,
        missingWorkshopIdToFetch,
        fetchedWorkshop: fetchedWorkshop?.id || null,
        userProfileWorkshopId: tenantUser?.data?.workshop_id || tenantUser?.workshop_id || null,
        isLoadingBFF: isAvailableLoading,
        isLoadingFallback: isFetchedLoading,
        fetchError: fetchError?.message || null,
      });
    }
    
    // QA-FIX-02: Alertar quando workshop referenciado não existe
    if (fetchError && missingWorkshopIdToFetch) {
      console.error(`[QA-FIX-02] Workshop ${missingWorkshopIdToFetch} não existe mais. Usuário ${tenantUser?.email} pode precisar atualizar perfil.`);
    }
  }, [workshop, isLoading, available, selectedCompanyId, missingWorkshopIdToFetch, fetchedWorkshop, tenantUser, isAvailableLoading, isFetchedLoading, fetchError]);

  const setCurrentWorkshop = (id) => {
    if (changeCompany) {
      changeCompany(id);
    }
  };

  return {
    workshop,
    workshopId: workshop?.id || null,
    workshopsDisponiveis,
    setCurrentWorkshop,
    isLoading,
    isAdminMode
  };
}
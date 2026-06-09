import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAdminMode } from './useAdminMode';
import { useTenant } from '@/components/contexts/TenantContext';
import { base44 } from '@/api/base44Client';
import { getImpersonationData } from '@/components/shared/ImpersonationBanner';

/**
 * Hook que SEMPRE retorna o workshop correto:
 * - Se em modo admin, retorna o workshop admin
 * - Senão, retorna o workshop do usuário
 */
export function useWorkshopContext() {
  const { isAdminMode, adminWorkshopId } = useAdminMode();
  const { selectedFirmId, selectedCompanyId, changeCompany, isLoading: isTenantLoading, user: tenantUser } = useTenant();
  
  // Verificar se está em modo de impersonação
  const impersonationData = useMemo(() => getImpersonationData(tenantUser?.id), [tenantUser?.id]);
  const isImpersonating = !!impersonationData;
  const targetUser = impersonationData?.target_user;
  
  // CRITICAL: Em impersonação, IGNORAR selectedCompanyId e admin mode — usar APENAS do usuário alvo
  const effectiveAdminMode = isImpersonating ? false : isAdminMode;
  const effectiveAdminWorkshopId = isImpersonating ? null : adminWorkshopId;
  const effectiveSelectedCompanyId = isImpersonating ? null : selectedCompanyId;

  // 1. Busca a lista de workshops disponíveis do usuário. Isso ocorre apenas uma vez e é cacheado.
  // IMP-01: Em modo de impersonação, usa o workshop do usuário alvo diretamente
  const { data: available = [], isLoading: isAvailableLoading } = useQuery({
    queryKey: ['workshops-available', isImpersonating ? targetUser?.id : tenantUser?.id],
    queryFn: async () => {
      // Se estiver impersonando, retorna apenas o workshop do usuário alvo
      if (isImpersonating && targetUser?.workshop_id) {
        try {
          const response = await base44.functions.invoke('getUserWorkshops', {
            workshopId: targetUser.workshop_id
          });
          if (response?.data?.workshops?.length > 0) {
            return response.data.workshops;
          }
        } catch (err) {
          console.warn('Erro ao buscar workshop impersonado:', err?.message);
        }
        // Fallback: criar objeto mínimo do workshop
        return [{ id: targetUser.workshop_id, name: 'Workshop (Impersonação)' }];
      }
      
      // Comportamento normal (sem impersonação)
      const user = tenantUser;
      if (!user) return [];

      try {
        const response = await base44.functions.invoke('getUserWorkshops', {});
        if (response?.data?.workshops) {
          return response.data.workshops;
        }
      } catch (err) {
        const status = err?.status || err?.response?.status;
        if (status === 429) {
          throw new Error('rate_limit');
        }
        console.warn('Erro ao buscar workshops via BFF:', status || err?.message);
        return [];
      }
      return [];
    },
    enabled: !isTenantLoading,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.message === 'rate_limit') return failureCount < 2;
      return failureCount < 1;
    },
    retryDelay: (attempt, error) => error?.message === 'rate_limit' ? 8000 : 5000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  // 2. Determina o workshop atual DE FORMA SÍNCRONA baseado na lista 'available'
  // IMP-02: Em modo de impersonação, usa APENAS o workshop do usuário alvo
  let userWorkshop = null;
  let missingWorkshopIdToFetch = null;

  if (isImpersonating && targetUser?.workshop_id) {
    // IMP-03: Forçar uso do workshop do usuário impersonado
    userWorkshop = available.find(w => w.id === targetUser.workshop_id);
    if (!userWorkshop) missingWorkshopIdToFetch = targetUser.workshop_id;
  } else if (effectiveAdminMode && effectiveAdminWorkshopId) {
    userWorkshop = available.find(w => w.id === effectiveAdminWorkshopId);
    if (!userWorkshop) missingWorkshopIdToFetch = effectiveAdminWorkshopId;
  } else if (effectiveSelectedCompanyId) {
    userWorkshop = available.find(w => w.id === effectiveSelectedCompanyId);
    if (!userWorkshop) missingWorkshopIdToFetch = effectiveSelectedCompanyId;
  } else if (available.length > 0) {
    userWorkshop = available.find(w => !w.company_id) || available[0];
  } else if (tenantUser) {
    const userWorkshopId = tenantUser?.data?.workshop_id || tenantUser?.workshop_id;
    if (userWorkshopId) {
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
          return found || response.data.workshops[0];
        }
        // BFF retornou vazio = workshop não existe — retornar null sem tentar novamente
        return null;
      } catch (e) {
        console.warn(`[useWorkshopContext] Falha ao buscar workshop ${missingWorkshopIdToFetch}:`, e?.message || e);
        return null;
      }
    },
    enabled: !!missingWorkshopIdToFetch && !isAvailableLoading,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 0, // ID inválido não deve ser retentado — evita bloquear o carregamento
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
    isAdminMode: effectiveAdminMode
  };
}
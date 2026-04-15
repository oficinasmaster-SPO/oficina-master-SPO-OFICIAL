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
        console.warn('Erro ao buscar workshops via BFF:', err);
        const fallbackWorkshopId = user?.data?.workshop_id || user?.workshop_id || selectedCompanyId;
        if (fallbackWorkshopId) {
          try {
            const fallbackWorkshops = await base44.entities.Workshop.filter({ id: fallbackWorkshopId });
            if (fallbackWorkshops && fallbackWorkshops.length > 0) {
              return fallbackWorkshops;
            }
          } catch (fallbackErr) {
            console.warn('Fallback de workshop também falhou (possível rate limit):', fallbackErr);
            return [];
          }
        }
      }
      return [];
    },
    enabled: !isTenantLoading,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // 2. Determina o workshop atual DE FORMA SÍNCRONA baseado na lista 'available'
  let userWorkshop = null;
  let missingWorkshopIdToFetch = null;

  if (isAdminMode && adminWorkshopId) {
    userWorkshop = available.find(w => w.id === adminWorkshopId);
    if (!userWorkshop) missingWorkshopIdToFetch = adminWorkshopId;
  } else if (selectedCompanyId) {
    userWorkshop = available.find(w => w.id === selectedCompanyId);
    if (!userWorkshop) missingWorkshopIdToFetch = selectedCompanyId;
  } else if (available.length > 0) {
    userWorkshop = available.find(w => !w.company_id) || available[0];
  } else if (tenantUser) {
    const userWorkshopId = tenantUser?.data?.workshop_id || tenantUser?.workshop_id;
    if (userWorkshopId) {
      userWorkshop = available.find(w => w.id === userWorkshopId);
      if (!userWorkshop) missingWorkshopIdToFetch = userWorkshopId;
    }
  }

  // 3. Caso o workshop selecionado não esteja na lista de disponíveis, busca individualmente (Fallback)
  const { data: fetchedWorkshop, isLoading: isFetchedLoading } = useQuery({
    queryKey: ['workshop-single', missingWorkshopIdToFetch],
    queryFn: async () => {
      if (!missingWorkshopIdToFetch) return null;
      try {
        const wsList = await base44.entities.Workshop.filter({ id: missingWorkshopIdToFetch });
        if (wsList && wsList.length > 0) return wsList[0];

        const workshops = await base44.entities.Workshop.filter({ company_id: missingWorkshopIdToFetch });
        if (workshops && workshops.length > 0) return workshops[0];

        const ws = await base44.entities.Workshop.get(missingWorkshopIdToFetch).catch(() => null);
        // Retorna null explicitamente se não encontrou - NÃO vai retentar
        return ws || null;
      } catch (e) {
        return null;
      }
    },
    enabled: !!missingWorkshopIdToFetch && !isAvailableLoading,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1, // Apenas 1 retry para não ficar em loop
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const workshop = userWorkshop || fetchedWorkshop || null;
  const workshopsDisponiveis = available;
  // isLoading só é true se AINDA estamos carregando dados iniciais
  // Se o fetch do workshop individual terminou (mesmo sem resultado), não estamos mais loading
  const isFetchingMissing = !!missingWorkshopIdToFetch && isFetchedLoading && !userWorkshop;
  const isLoading = isTenantLoading || isAvailableLoading || isFetchingMissing;

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
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

  const { data, isLoading } = useQuery({
    queryKey: ['workshop-context', isAdminMode, adminWorkshopId, selectedCompanyId, tenantUser?.id],
    queryFn: async () => {
      let available = [];
      let userWorkshop = null;
      
      try {
        const user = tenantUser || await base44.auth.me().catch(() => null);

        // 1. Sempre carrega as oficinas disponíveis para o dropdown VIA BFF (Otimizado)
        if (user) {
          try {
            const response = await base44.functions.invoke('getUserWorkshops', {});
            if (response?.data?.workshops) {
              available = response.data.workshops;
            }
          } catch (err) {
            console.warn('Erro ao buscar workshops via BFF:', err);
            // Fallback robusto: tenta buscar apenas o workshop do usuário diretamente
            const fallbackWorkshopId = user?.data?.workshop_id || user?.workshop_id || selectedCompanyId;
            if (fallbackWorkshopId) {
              try {
                const fallbackWorkshops = await base44.entities.Workshop.filter({ id: fallbackWorkshopId });
                if (fallbackWorkshops && fallbackWorkshops.length > 0) {
                  available = fallbackWorkshops;
                }
              } catch (fallbackErr) {
                console.warn('Fallback de workshop também falhou (possível rate limit):', fallbackErr);
                // Fallback final: montar objeto mínimo a partir do ID para não ficar sem workshop
                available = [{ id: fallbackWorkshopId, name: 'Carregando...', _partial: true }];
              }
            }
          }
        }

        // PRIORIDADE 0: TenantContext - Se selecionou uma Empresa específica via seletor
        if (selectedCompanyId) {
          // Tentar encontrar nos workshops já carregados primeiro (evita chamada extra)
          const fromAvailable = available.find(w => w.id === selectedCompanyId);
          if (fromAvailable) {
            userWorkshop = fromAvailable;
          } else {
            try {
              const wsList = await base44.entities.Workshop.filter({ id: selectedCompanyId });
              if (wsList && wsList.length > 0) {
                 userWorkshop = wsList[0];
              } else {
                 const workshops = await base44.entities.Workshop.filter({ company_id: selectedCompanyId });
                 if (workshops.length > 0) {
                   userWorkshop = workshops[0];
                 }
              }
            } catch (e) {
              // Se falhou por rate limit, usar dados parciais
              userWorkshop = available.find(w => w.id === selectedCompanyId) || null;
            }
          }
        }
        
        // PRIORIDADE 1: Modo Admin
        if (isAdminMode && adminWorkshopId) {
          const fromAvailable = available.find(w => w.id === adminWorkshopId);
          if (fromAvailable) {
            userWorkshop = fromAvailable;
          } else {
            try {
               const ws = await base44.entities.Workshop.get(adminWorkshopId);
               if (ws) {
                 userWorkshop = ws;
               }
            } catch(e) {
              userWorkshop = available.find(w => w.id === adminWorkshopId) || null;
            }
          }
        }

        // PRIORIDADE 2: Oficina do usuário logado (caso não tenha escolhido nenhuma no TenantContext)
        if (!userWorkshop && available.length > 0) {
          userWorkshop = available.find(w => !w.company_id) || available[0];
        }

        // Fallback: workshop_id do user salvo no perfil
        if (!userWorkshop && user) {
          const userWorkshopId = user?.data?.workshop_id || user?.workshop_id;
          if (userWorkshopId) {
            userWorkshop = available.find(w => w.id === userWorkshopId) || null;
          }
        }

        return { workshop: userWorkshop, workshopsDisponiveis: available };

      } catch (error) {
        console.error('❌ Erro ao carregar workshop context:', error);
        return { workshop: null, workshopsDisponiveis: [] };
      }
    },
    enabled: !isTenantLoading,
    staleTime: 10 * 60 * 1000,  // 10 min - dados ficam "frescos" por mais tempo
    gcTime: 15 * 60 * 1000,     // 15 min - mantém em memória por mais tempo
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    refetchOnWindowFocus: false, // Não refaz ao voltar à aba
    refetchOnMount: false,       // Não refaz ao remontar componente
  });

  const setCurrentWorkshop = (id) => {
    if (changeCompany) {
      changeCompany(id);
    }
  };

  const workshop = data?.workshop || null;
  const workshopsDisponiveis = data?.workshopsDisponiveis || [];

  return {
    workshop,
    workshopId: workshop?.id || null,
    workshopsDisponiveis,
    setCurrentWorkshop,
    isLoading: isTenantLoading || isLoading,
    isAdminMode
  };
}
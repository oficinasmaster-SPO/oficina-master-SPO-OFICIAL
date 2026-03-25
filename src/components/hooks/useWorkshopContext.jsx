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

        // 1. Sempre carrega as oficinas disponíveis para o dropdown
        if (user) {
          try {
            const owned = await base44.entities.Workshop.filter({ owner_id: user.id });
            if (owned && owned.length > 0) {
              const matrizes = owned.filter(w => !w.company_id);
              const filiaisOwned = owned.filter(w => !!w.company_id);
              available = [...matrizes, ...filiaisOwned];
            }
            
            const partner = await base44.entities.Workshop.filter({ partner_ids: user.id });
            if (partner && partner.length > 0) {
              partner.forEach(p => {
                if (!available.find(a => a.id === p.id)) available.push(p);
              });
            }
          } catch(err) {
            console.warn('Erro ao buscar workshops do usuário:', err);
          }
          
          if (available.length === 0) {
            try {
              let employees = await base44.entities.Employee.filter({ user_id: user.id });
              if (!employees || employees.length === 0) {
                employees = await base44.entities.Employee.filter({ email: user.email });
              }
              if (employees && employees.length > 0) {
                for (const emp of employees) {
                  if (emp.workshop_id) {
                    try {
                      const wsFound = await base44.entities.Workshop.filter({ id: emp.workshop_id });
                      if (wsFound && wsFound.length > 0 && !available.find(a => a.id === wsFound[0].id)) {
                        available.push(wsFound[0]);
                      }
                    } catch(e) {}
                  }
                }
              }
            } catch(e) {}
          }
        }

        // PRIORIDADE 0: TenantContext - Se selecionou uma Empresa específica via seletor
        if (selectedCompanyId) {
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
          } catch (e) {}
        }
        
        // PRIORIDADE 1: Modo Admin
        if (isAdminMode && adminWorkshopId) {
          try {
             const ws = await base44.entities.Workshop.get(adminWorkshopId);
             if (ws) {
               userWorkshop = ws;
             }
          } catch(e) {}
        }

        // PRIORIDADE 2: Oficina do usuário logado (caso não tenha escolhido nenhuma no TenantContext)
        if (!userWorkshop && available.length > 0) {
          userWorkshop = available.find(w => !w.company_id) || available[0];
        }

        // Fallback para lógica legada via Employee caso available esteja vazio (devido ao RLS)
        if (!userWorkshop && user) {
          try {
            let employees = await base44.entities.Employee.filter({ user_id: user.id });
            if (!employees || employees.length === 0) {
              employees = await base44.entities.Employee.filter({ email: user.email });
            }

            if (Array.isArray(employees) && employees.length > 0) {
              const employee = employees[0];
              if (employee.workshop_id) {
                try {
                  const wsFound = await base44.entities.Workshop.filter({ id: employee.workshop_id });
                  if (wsFound && wsFound.length > 0) {
                    userWorkshop = wsFound[0];
                  } else {
                    const response = await base44.functions.invoke('checkWorkshop', { workshop_id: employee.workshop_id });
                    if (response.data && response.data.workshopFound) {
                      userWorkshop = response.data.workshopData;
                    }
                  }
                } catch(e) {
                   try {
                      const response = await base44.functions.invoke('checkWorkshop', { workshop_id: employee.workshop_id });
                      if (response.data && response.data.workshopFound) {
                        userWorkshop = response.data.workshopData;
                      }
                   } catch (err) {}
                }
              }
            }
          } catch(err) {}
        }

        // Se não encontrou, tenta por workshop_id (se salvo no usuário)
        const userWorkshopId = user?.data?.workshop_id || user?.workshop_id;
        if (!userWorkshop && userWorkshopId) {
          try {
            const found = await base44.entities.Workshop.filter({ id: userWorkshopId });
            if (found && found.length > 0) {
               userWorkshop = found[0];
            }
          } catch (err) {}
        }

        return { workshop: userWorkshop, workshopsDisponiveis: available };

      } catch (error) {
        console.error('❌ Erro ao carregar workshop context:', error);
        return { workshop: null, workshopsDisponiveis: [] };
      }
    },
    enabled: !isTenantLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
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
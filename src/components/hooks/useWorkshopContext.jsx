import { useState, useEffect } from 'react';
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
  const { selectedFirmId, selectedCompanyId } = useTenant();
  const [workshop, setWorkshop] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    
    const loadWorkshop = async () => {
      try {
        setIsLoading(true);

        // PRIORIDADE 0: TenantContext - Se o admin selecionou uma Empresa específica (que agora é a própria Oficina no seletor)
        if (selectedCompanyId) {
          // Tentamos carregar o ID como uma Oficina (Workshop)
          try {
            const ws = await base44.entities.Workshop.get(selectedCompanyId);
            if (!cancelled && ws) {
              console.log('✅ Workshop TenantContext carregado:', ws.id);
              setWorkshop(ws);
              return;
            }
          } catch (e) {
            // Se falhar, tentamos carregar como Company (comportamento legado)
            const workshops = await base44.entities.Workshop.filter({ company_id: selectedCompanyId });
            if (!cancelled && workshops.length > 0) {
              console.log('✅ Workshop TenantContext carregado via Company:', workshops[0].id);
              setWorkshop(workshops[0]);
              return;
            }
          }
          
          if (!cancelled) setWorkshop(null);
          return;
        }
        
        // PRIORIDADE 1: Modo Admin
        if (isAdminMode && adminWorkshopId) {
          console.log('🔄 Carregando workshop ADMIN:', adminWorkshopId);
          const ws = await base44.entities.Workshop.get(adminWorkshopId);
          
          if (!cancelled) {
            console.log('✅ Workshop ADMIN carregado:', {
              workshopId: ws.id,
              name: ws.name,
              city: ws.city
            });
            setWorkshop(ws);
          }
          return;
        }

        // PRIORIDADE 2: Workshop do usuário logado
        const user = await base44.auth.me();
        if (user && !cancelled) {
          let userWorkshop = null;
          
          // Tenta pegar workshop por owner_id
          const ownedWorkshops = await base44.entities.Workshop.filter({ owner_id: user.id });
          userWorkshop = Array.isArray(ownedWorkshops) && ownedWorkshops.length > 0 ? ownedWorkshops[0] : null;

          // Se não encontrou, tenta por workshop_id (se salvo no usuário)
          const userWorkshopId = user.data?.workshop_id || user.workshop_id;
          if (!userWorkshop && userWorkshopId) {
            userWorkshop = await base44.entities.Workshop.get(userWorkshopId);
          }

          // Se ainda não encontrou, busca via Employee (colaborador)
          if (!userWorkshop) {
            // Tenta buscar por ID
            let employees = await base44.entities.Employee.filter({ user_id: user.id });
            
            // Fallback: Tenta buscar por Email se falhar por ID
            if (!employees || employees.length === 0) {
              console.log('⚠️ WorkshopContext: Buscando employee por email (fallback)');
              employees = await base44.entities.Employee.filter({ email: user.email });
            }

            if (Array.isArray(employees) && employees.length > 0) {
              const employee = employees[0];
              if (employee.workshop_id) {
                userWorkshop = await base44.entities.Workshop.get(employee.workshop_id);
              }
            }
          }

          console.log('✅ Workshop NORMAL carregado:', {
            workshopId: userWorkshop?.id,
            name: userWorkshop?.name
          });
          
          setWorkshop(userWorkshop);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar workshop context:', error);
        if (!cancelled) {
          setWorkshop(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadWorkshop();
    
    return () => {
      cancelled = true;
    };
  }, [isAdminMode, adminWorkshopId, selectedCompanyId]);

  return {
    workshop,
    workshopId: workshop?.id || null,
    isLoading,
    isAdminMode
  };
}
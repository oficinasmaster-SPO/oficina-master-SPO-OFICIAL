import { useState, useEffect } from 'react';
import { useAdminMode } from './useAdminMode';
import { base44 } from '@/api/base44Client';

/**
 * Hook que SEMPRE retorna o workshop correto:
 * - Se em modo admin, retorna o workshop admin
 * - Senão, retorna o workshop do usuário
 */
export function useWorkshopContext() {
  const { isAdminMode, adminWorkshopId } = useAdminMode();
  const [workshop, setWorkshop] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    
    const loadWorkshop = async () => {
      try {
        setIsLoading(true);
        
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
          if (!userWorkshop && user.workshop_id) {
            userWorkshop = await base44.entities.Workshop.get(user.workshop_id);
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
  }, [isAdminMode, adminWorkshopId]);

  return {
    workshop,
    workshopId: workshop?.id || null,
    isLoading,
    isAdminMode
  };
}
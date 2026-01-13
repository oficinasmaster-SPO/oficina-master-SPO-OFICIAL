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
    const loadWorkshop = async () => {
      try {
        setIsLoading(true);
        
        // PRIORIDADE 1: Modo Admin
        if (isAdminMode && adminWorkshopId) {
          const ws = await base44.entities.Workshop.get(adminWorkshopId);
          console.log('🎯 useWorkshopContext: Modo ADMIN ativo', {
            workshopId: ws.id,
            name: ws.name,
            city: ws.city
          });
          setWorkshop(ws);
          return;
        }

        // PRIORIDADE 2: Workshop do usuário logado
        const user = await base44.auth.me();
        if (user) {
          let userWorkshop = null;
          
          // Tenta pegar workshop por owner_id
          const ownedWorkshops = await base44.entities.Workshop.filter({ owner_id: user.id });
          userWorkshop = Array.isArray(ownedWorkshops) && ownedWorkshops.length > 0 ? ownedWorkshops[0] : null;

          // Se não encontrou, tenta por workshop_id
          if (!userWorkshop && user.workshop_id) {
            userWorkshop = await base44.entities.Workshop.get(user.workshop_id);
          }

          console.log('🎯 useWorkshopContext: Modo NORMAL', {
            workshopId: userWorkshop?.id,
            name: userWorkshop?.name
          });
          
          setWorkshop(userWorkshop);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar workshop context:', error);
        setWorkshop(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkshop();
  }, [isAdminMode, adminWorkshopId]);

  return {
    workshop,
    workshopId: workshop?.id || null,
    isLoading,
    isAdminMode
  };
}
import { useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook para marcar automaticamente itens do cronograma como concluídos
 */
export function useCronogramaAutoComplete() {
  const markAsCompleted = useCallback(async (workshop_id, item_id, item_nome, item_tipo) => {
    if (!workshop_id || !item_id) return;

    try {
      await base44.functions.invoke('markCronogramaCompleted', {
        workshop_id,
        item_id,
        item_nome,
        item_tipo
      });
    } catch (error) {
      console.error(`Erro ao marcar ${item_tipo} no cronograma:`, error);
    }
  }, []);

  return { markAsCompleted };
}
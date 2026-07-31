import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";

/**
 * Hook para rastrear acesso a módulos/funcionalidades
 * Atualiza automaticamente o CronogramaImplementacao quando uma página é acessada
 */
export function useModuleTracking(workshop, itemId = null) {
  const location = useLocation();

  useEffect(() => {
    // Guard clause: trackImplementacao exige workshop_id + item_id (contrato
    // do backend). Sem item_id a function retorna 400 ("Parâmetros obrigatórios:
    // workshop_id, item_id"). Antes este hook enviava só page_path e 400-ava
    // em toda navegação. Agora só invoca quando ambos existem.
    // TrackingWrapper.jsx cobre tracking por item (com item_id real).
    if (!workshop?.id || !itemId) return;

    const trackAccess = async () => {
      try {
        await base44.functions.invoke('trackImplementacao', {
          workshop_id: workshop.id,
          item_id: itemId
        });
      } catch (error) {
        // Silenciar — tracking é best-effort, nunca deve bloquear navegação
      }
    };

    const timeout = setTimeout(trackAccess, 2000);

    return () => clearTimeout(timeout);
  }, [location.pathname, workshop?.id, itemId]);
}

/**
 * Função auxiliar para marcar módulo como concluído
 * Chamar quando uma ação significativa for concluída
 */
export async function markModuleCompleted(workshop_id, module_code, action_description) {
  try {
    await base44.functions.invoke('markModuleCompleted', {
      workshop_id,
      module_code,
      action_description
    });
  } catch (error) {
    console.log('Erro ao marcar módulo como concluído:', error);
  }
}
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";

/**
 * Hook para rastrear acesso a módulos/funcionalidades
 * Atualiza automaticamente o CronogramaImplementacao quando uma página é acessada
 */
export function useModuleTracking(workshop) {
  const location = useLocation();

  useEffect(() => {
    if (!workshop?.id) return;

    const trackAccess = async () => {
      try {
        await base44.functions.invoke('trackModuleAccess', {
          workshop_id: workshop.id,
          page_path: location.pathname
        });
      } catch (error) {
        console.log('Erro ao rastrear acesso ao módulo:', error);
      }
    };

    // Aguardar 2 segundos antes de registrar (evitar registros acidentais)
    const timeout = setTimeout(trackAccess, 2000);

    return () => clearTimeout(timeout);
  }, [location.pathname, workshop?.id]);
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
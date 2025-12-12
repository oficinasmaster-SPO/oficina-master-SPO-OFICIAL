import React, { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Componente wrapper para tracking automático de visualizações
 * Não afeta o layout visual, apenas registra o acesso
 */
export default function TrackingWrapper({ 
  children, 
  workshopId, 
  itemTipo, 
  itemId, 
  itemNome, 
  itemCategoria 
}) {
  const tracked = useRef(false);

  useEffect(() => {
    const trackView = async () => {
      if (tracked.current || !workshopId || !itemTipo || !itemId || !itemNome) return;
      
      tracked.current = true;

      try {
        await base44.functions.invoke('trackImplementacao', {
          workshop_id: workshopId,
          item_tipo: itemTipo,
          item_id: itemId,
          item_nome: itemNome,
          item_categoria: itemCategoria || ''
        });
      } catch (error) {
        console.error('Erro ao registrar tracking:', error);
      }
    };

    // Tracking assíncrono para não afetar performance
    setTimeout(trackView, 500);
  }, [workshopId, itemTipo, itemId, itemNome, itemCategoria]);

  return <>{children}</>;
}
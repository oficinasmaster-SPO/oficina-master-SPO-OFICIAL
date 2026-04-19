import React from 'react';
import ConsultoriaClienteTab from './ConsultoriaClienteTab';

/**
 * Wrapper que reutiliza 100% a lógica de ConsultoriaClienteTab
 * mas funciona em modo GLOBAL (sem cliente específico)
 * 
 * Modo GLOBAL: workshopId = null → busca TODOS os workshops
 * Modo CONTEXTUAL: workshopId = cliente.id → filtra por cliente
 */
export default function ConsultoriaGlobalTab() {
  // Em modo global, passamos id=null para buscar TODOS os dados agregados
  return (
    <ConsultoriaClienteTab client={{ id: null, name: 'Todas as Oficinas' }} mode="global" />
  );
}
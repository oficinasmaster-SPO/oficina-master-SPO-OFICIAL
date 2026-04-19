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
  // Em modo global, passamos um objeto vazio (sem id específico)
  // Isso faz a ConsultoriaClienteTab buscar todos os dados agregados
  const globalClient = {
    id: null, // Sem cliente específico → modo global
    name: 'Todas as Oficinas',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <ConsultoriaClienteTab client={globalClient} />
    </div>
  );
}
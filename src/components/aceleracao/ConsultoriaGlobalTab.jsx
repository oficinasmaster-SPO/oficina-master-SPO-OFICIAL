import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import ConsultoriaClienteTab from './ConsultoriaClienteTab';

/**
 * ConsultoriaGlobalTab - Wrapper que passa workshopId=null
 * para ConsultoriaClienteTab renderizar em MODO GLOBAL
 * 
 * Carrega TODOS os sprints de TODOS os clientes agregados
 */
export default function ConsultoriaGlobalTab() {
  const [allSprints, setAllSprints] = useState([]);
  
  // Carrega TODOS os sprints do sistema (sem filtro de workshop)
  const { isLoading } = useQuery({
    queryKey: ['allConsultoriaSprints'],
    queryFn: async () => {
      try {
        const data = await base44.entities.ConsultoriaSprint.list('-updated_date', 500);
        setAllSprints(data || []);
        return data;
      } catch (error) {
        console.error('Erro ao carregar todos os sprints:', error);
        return [];
      }
    },
    staleTime: 30 * 1000,
  });

  // Em modo global, passamos workshopId=null para buscar TODOS os dados agregados
  return (
    <ConsultoriaClienteTab 
      client={{ id: null, name: 'Todas as Oficinas' }} 
      mode="global"
      globalSprints={allSprints}
      isLoadingGlobal={isLoading}
    />
  );
}
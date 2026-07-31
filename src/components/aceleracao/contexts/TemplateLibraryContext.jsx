import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const TemplateLibraryContext = createContext();

/**
 * P1-B01: Context global para missions
 * Evita queries N+1 quando MissionPicker renderiza
 */
export function TemplateLibraryProvider({ children }) {
  // FIX-3: provider virou pass-through. A query de Mission agora vive no hook
  // useGlobalMissions() — lazy. Antes o provider (no App root) disparava
  // Mission.list em TODAS as páginas no boot, mesmo as que nunca usam missões.
  // Agora: zero leituras de Mission até o primeiro MissionPicker montar.
  return (
    <TemplateLibraryContext.Provider value={{}}>
      {children}
    </TemplateLibraryContext.Provider>
  );
}

export function useGlobalMissions() {
  const context = useContext(TemplateLibraryContext);
  if (!context) {
    throw new Error('useGlobalMissions deve ser usado dentro de TemplateLibraryProvider');
  }
  const { data: missions = [] } = useQuery({
    queryKey: ['global_missions_list'],
    queryFn: async () => {
      try {
        return await base44.entities.Mission.list('-updated_date', 100);
      } catch (error) {
        console.error('Erro ao carregar missões globais:', error);
        return [];
      }
    },
    // 429-FIX: lazy — só dispara quando um componente chama useGlobalMissions()
    // (hoje apenas MissionPicker). 10min de cache + sem refetch on focus/mount.
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });
  return missions;
}
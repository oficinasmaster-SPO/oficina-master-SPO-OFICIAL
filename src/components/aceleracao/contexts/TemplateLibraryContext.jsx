import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const TemplateLibraryContext = createContext();

/**
 * P1-B01: Context global para missions
 * Evita queries N+1 quando MissionPicker renderiza
 */
export function TemplateLibraryProvider({ children }) {
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
    // 429-FIX: staleTime era 5s — refetch constante em TODAS as páginas (provider está no App root).
    // Missões raramente mudam; 10min + sem refetch on focus/mount reduz tráfego drasticamente.
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

  return (
    <TemplateLibraryContext.Provider value={{ missions }}>
      {children}
    </TemplateLibraryContext.Provider>
  );
}

export function useGlobalMissions() {
  const context = useContext(TemplateLibraryContext);
  if (!context) {
    throw new Error('useGlobalMissions deve ser usado dentro de TemplateLibraryProvider');
  }
  return context.missions;
}
import React, { useMemo, useCallback } from 'react';
import { useGlobalMissions } from './contexts/TemplateLibraryContext';

const DEFAULT_MISSIONS_LIST = [
  { id: 'agenda_cheia',         icon: '📅', name: 'Agenda Cheia' },
  { id: 'fechamento_imbativel', icon: '🎯', name: 'Fechamento Imbatível' },
  { id: 'caixa_forte',          icon: '💰', name: 'Caixa Forte' },
  { id: 'empresa_organizada',   icon: '📊', name: 'Empresa Organizada' },
  { id: 'funcoes_claras',       icon: '👥', name: 'Funções Claras' },
  { id: 'contratacao_certa',    icon: '🎓', name: 'Contratação Certa' },
  { id: 'cultura_forte',        icon: '🌟', name: 'Cultura Forte' },
];

export default function MissionPicker({ selected = [], onChange }) {
  const globalMissions = useGlobalMissions();
  
  const missionsList = useMemo(() => {
    if (globalMissions.length > 0) {
      const savedIds = new Set(globalMissions.map(m => m.id));
      const newDefaults = DEFAULT_MISSIONS_LIST.filter(m => !savedIds.has(m.id));
      return [...globalMissions, ...newDefaults];
    }
    return DEFAULT_MISSIONS_LIST;
  }, [globalMissions]);

  const toggle = useCallback((id) => {
    if (selected.includes(id)) onChange(selected.filter(m => m !== id));
    else onChange([...selected, id]);
  }, [selected, onChange]);

  return (
    <div className="grid grid-cols-2 gap-2 mt-1">
      {missionsList.map(m => {
        const isSelected = selected.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => toggle(m.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
              isSelected
                ? 'bg-indigo-50 border-indigo-400 text-indigo-800 font-medium'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            <span>{m.icon}</span>
            <span className="truncate">{m.name}</span>
          </button>
        );
      })}
    </div>
  );
}
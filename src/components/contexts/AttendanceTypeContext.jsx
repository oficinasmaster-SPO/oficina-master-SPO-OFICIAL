import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useTenant } from './TenantContext';

const AttendanceTypeContext = createContext();

export function AttendanceTypeProvider({ children }) {
  const { selectedCompanyId, selectedFirmId } = useTenant();
  const [attendanceTypes, setAttendanceTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega tipos globais + específicos da oficina
  const loadAttendanceTypes = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // 1. Busca tipos globais (workshop_id = null)
      const globalTypes = await base44.entities.TipoAtendimentoConsultoria.filter({
        workshop_id: null,
        ativo: true
      }, '-updated_date', 100);

      // 2. Se tem oficina selecionada, busca tipos específicos da oficina
      let customTypes = [];
      if (selectedCompanyId) {
        try {
          customTypes = await base44.entities.TipoAtendimentoConsultoria.filter({
            workshop_id: selectedCompanyId,
            ativo: true
          }, '-updated_date', 100);
        } catch (err) {
          console.warn('Erro ao carregar tipos customizados da oficina:', err);
        }
      }

      // 3. Mescla global + customizados, removendo duplicatas (customizados têm prioridade)
      const merged = [
        ...customTypes,
        ...globalTypes.filter(g => !customTypes.some(c => c.value === g.value))
      ];

      setAttendanceTypes(merged);
    } catch (err) {
      console.error('Erro ao carregar tipos de atendimento:', err);
      setAttendanceTypes([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompanyId]);

  // Recarrega quando muda a oficina selecionada
  useEffect(() => {
    loadAttendanceTypes();
  }, [loadAttendanceTypes, selectedCompanyId, selectedFirmId]);

  const addType = useCallback((newType) => {
    setAttendanceTypes(prev => {
      const exists = prev.some(t => t.value === newType.value);
      if (exists) return prev;
      return [newType, ...prev];
    });
  }, []);

  const removeType = useCallback((typeId) => {
    setAttendanceTypes(prev => prev.filter(t => t.id !== typeId));
  }, []);

  const updateType = useCallback((typeId, updates) => {
    setAttendanceTypes(prev => 
      prev.map(t => t.id === typeId ? { ...t, ...updates } : t)
    );
  }, []);

  const refresh = loadAttendanceTypes;

  return (
    <AttendanceTypeContext.Provider value={{
      attendanceTypes,
      isLoading,
      addType,
      removeType,
      updateType,
      refresh
    }}>
      {children}
    </AttendanceTypeContext.Provider>
  );
}

export function useAttendanceTypes() {
  const context = useContext(AttendanceTypeContext);
  if (!context) {
    throw new Error('useAttendanceTypes must be used within an AttendanceTypeProvider');
  }
  return context;
}
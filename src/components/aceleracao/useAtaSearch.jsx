import { useMemo } from "react";

export function useAtaSearch(atas, filters) {
  return useMemo(() => {
    if (!atas || atas.length === 0) return [];

    let filtered = [...atas];

    // Busca por palavra-chave no conteúdo
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter((ata) => {
        const searchableFields = [
          ata.code,
          ata.pautas,
          ata.objetivos_atendimento,
          ata.objetivos_consultor,
          ata.visao_geral_projeto,
          ata.consultor_name,
          ata.plano_nome,
          ...(ata.proximos_passos || []).map(p => p.descricao),
          ...(ata.processos_vinculados || []).map(p => p.titulo),
          ...(ata.participantes || []).map(p => p.name),
        ].filter(Boolean);

        return searchableFields.some(field => 
          String(field).toLowerCase().includes(term)
        );
      });
    }

    // Filtro por workshop
    if (filters.workshop_id) {
      filtered = filtered.filter(ata => ata.workshop_id === filters.workshop_id);
    }

    // Filtro por consultor
    if (filters.consultor_id) {
      filtered = filtered.filter(ata => ata.consultor_id === filters.consultor_id);
    }

    // Filtro por status
    if (filters.status) {
      filtered = filtered.filter(ata => ata.status === filters.status);
    }

    // Filtro por tipo de aceleração
    if (filters.tipo_aceleracao) {
      filtered = filtered.filter(ata => ata.tipo_aceleracao === filters.tipo_aceleracao);
    }

    // Filtro por data inicial
    if (filters.dateFrom) {
      filtered = filtered.filter(ata => {
        const ataDate = new Date(ata.meeting_date);
        const fromDate = new Date(filters.dateFrom);
        return ataDate >= fromDate;
      });
    }

    // Filtro por data final
    if (filters.dateTo) {
      filtered = filtered.filter(ata => {
        const ataDate = new Date(ata.meeting_date);
        const toDate = new Date(filters.dateTo);
        return ataDate <= toDate;
      });
    }

    return filtered;
  }, [atas, filters]);
}
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import RelatorioFiltros from './RelatorioFiltros';
import RelatorioKPIBar from './RelatorioKPIBar';
import RelatorioTabela from './RelatorioTabela';
import WheelLoader from '@/components/ui/WheelLoader';

export default function RelatorioDetalhado({ isOpen, onClose, periodo = 'diario' }) {
  const [filters, setFilters] = useState({
    periodo,
    consultor: null,
    tipo: null,
    status: 'realizado'
  });
  const [page, setPage] = useState(0);
  const itemsPerPage = 10;

  // Calcular data baseado no período
  const getDateRange = () => {
    const today = new Date();
    let startDate, endDate = today;
    
    switch(filters.periodo) {
      case 'diario':
        startDate = today;
        break;
      case 'semanal':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
        break;
      case 'mensal':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      default:
        startDate = today;
    }
    
    return { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] };
  };

  // Buscar métricas
  const { data: metricas = {} } = useQuery({
    queryKey: ['relatorioMetricas', filters.periodo],
    queryFn: async () => {
      try {
        const result = await base44.functions.invoke('getRelatorioFollowUpMetricas', {
          tipo: filters.periodo,
          data: new Date().toISOString().split('T')[0]
        });
        return result.data || {};
      } catch (error) {
        console.error('Erro ao buscar métricas:', error);
        return { realizados: 0, pendentes: 0, taxaRealizacao: 0 };
      }
    },
    enabled: isOpen
  });

  // Buscar dados da tabela
  const { data: followUps = [], isLoading } = useQuery({
    queryKey: ['relatorioTabela', filters, page],
    queryFn: async () => {
      try {
        const queryFilter = {
          consultor_id: filters.consultor ? filters.consultor : undefined,
          tipo: filters.tipo ? filters.tipo : undefined,
        };

        // Remover undefined
        Object.keys(queryFilter).forEach(key => 
          queryFilter[key] === undefined && delete queryFilter[key]
        );

        const items = await base44.entities.FollowUpConcluido.filter(
          queryFilter,
          '-completedAt',
          100
        );

        return items || [];
      } catch (error) {
        console.error('Erro ao buscar follow-ups:', error);
        return [];
      }
    },
    enabled: isOpen
  });

  const paginatedData = followUps.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(followUps.length / itemsPerPage);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Relatório Detalhado - {filters.periodo.toUpperCase()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-4">
          {/* Filtros */}
          <RelatorioFiltros filters={filters} onChange={setFilters} onPageChange={() => setPage(0)} />

          {/* KPIs */}
          <RelatorioKPIBar 
            realizados={metricas.realizados || 0} 
            pendentes={metricas.pendentes || 0} 
            taxaRealizacao={metricas.taxaRealizacao || 0} 
          />

          {/* Tabela */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <WheelLoader size="md" />
            </div>
          ) : (
            <>
              <RelatorioTabela dados={paginatedData} />
              
              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <span className="text-sm text-gray-600">
                    Página {page + 1} de {totalPages} ({followUps.length} registros)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page === totalPages - 1}
                      className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
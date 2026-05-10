import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X, Printer, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import KPIBar from './KPIBar';
import Tabela from './Tabela';
import Filtros from './Filtros';
import WheelLoader from '@/components/ui/WheelLoader';

export default function RelatorioDetailModal({ isOpen, onClose, tipo = 'diario', periodo = 'mensal', data }) {
  const [filters, setFilters] = useState({ consultor: null, tipo: null, status: 'realizado' });
  const [expandObservacoes, setExpandObservacoes] = useState(false);
  const [page, setPage] = useState(0);
  const itemsPerPage = 10;
  const referenceDate = data || new Date().toISOString().split('T')[0];

  // Buscar métricas e dados
   const { data: relatorioData = { metricas: {}, followups: [] }, isLoading: loadingMetricas } = useQuery({
     queryKey: ['relatorioCompleto', tipo, periodo, referenceDate, filters],
     queryFn: async () => {
       if (!isOpen) return { metricas: {}, followups: [] };
       try {
         // Chamar função backend que retorna métricas + dados detalhados
         const response = await base44.functions.invoke('getRelatorioFollowUpMetricas', {
           tipo,
           data: referenceDate,
           periodo,
           consultor_id: filters.consultor || null
         });

         if (response.data?.followups) {
           const { metricas, followups } = response.data;
           return { metricas: metricas || {}, followups: followups || [] };
         }

         return { metricas: {}, followups: [] };
       } catch (error) {
         console.error('Erro ao buscar relatório:', error);
         return { metricas: { realizados: 0, pendentes: 0, taxaRealizacao: 0 }, followups: [] };
       }
     },
     enabled: isOpen,
     staleTime: 5 * 60 * 1000
   });

  const metricas = relatorioData.metricas || { realizados: 0, pendentes: 0, taxaRealizacao: 0 };
  const todasLinhas = relatorioData.followups || [];

  // Aplicar filtros de status e canal no frontend
  const linhas = todasLinhas.filter(row => {
    const statusOk = !filters.status || filters.status === 'todos'
      ? true
      : filters.status === 'realizado' ? row.status === 'realizado' : row.status === 'pendente';
    const canalOk = !filters.tipo || row.canal === filters.tipo;
    return statusOk && canalOk;
  });

  const paginatedData = linhas.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil((linhas.length || 1) / itemsPerPage);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle className="text-xl font-bold">
            Relatório Detalhado - {tipo.toUpperCase()}
          </DialogTitle>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        <div className="space-y-6 p-4">
           {/* Ações de Print/PDF */}
           <div className="flex gap-2 justify-end">
             <Button
               size="sm"
               variant="outline"
               onClick={() => {
                 setExpandObservacoes(true);
                 setTimeout(() => window.print(), 100);
               }}
               className="gap-2"
             >
               <Printer className="w-4 h-4" />
               Imprimir com Observações
             </Button>
             <Button
               size="sm"
               variant="outline"
               onClick={() => setExpandObservacoes(!expandObservacoes)}
               className="gap-2"
             >
               <Download className="w-4 h-4" />
               {expandObservacoes ? 'Visualização Normal' : 'Expandir Observações'}
             </Button>
           </div>

           {/* Filtros */}
           <Filtros 
             filters={filters} 
             onChange={(newFilters) => {
               setFilters(newFilters);
               setPage(0);
             }} 
           />

          {/* KPIs */}
          <KPIBar 
            realizados={metricas.realizados || 0} 
            pendentes={metricas.pendentes || 0} 
            taxaRealizacao={metricas.taxaRealizacao || 0} 
          />

          {/* Tabela */}
          {loadingMetricas ? (
            <div className="flex justify-center py-12">
              <WheelLoader size="md" text="Carregando dados..." />
            </div>
          ) : (
            <>
               <Tabela dados={paginatedData} expandObservacoes={expandObservacoes} />
              
              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <span className="text-sm text-gray-600">
                    Página {page + 1} de {totalPages} ({linhas.length} registros)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page === totalPages - 1}
                      className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
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
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
  const [filters, setFilters] = useState({ consultor: null, canal: null, status: 'todos' });
  const [expandObservacoes, setExpandObservacoes] = useState(false);
  const [page, setPage] = useState(0);
  const itemsPerPage = 10;
  const referenceDate = data || new Date().toISOString().split('T')[0];

  // Bug #7 fix: reset page e filtros ao abrir modal
  useEffect(() => {
    if (isOpen) {
      setPage(0);
      setFilters({ consultor: null, canal: null, status: 'todos' });
      setExpandObservacoes(false);
    }
  }, [isOpen, tipo]);

  // Buscar métricas e dados
   const { data: relatorioData = { metricas: {}, followups: [] }, isLoading: loadingMetricas } = useQuery({
     // Bug fix: queryKey só depende de consultor (filtros de status/canal são client-side)
     queryKey: ['relatorioCompleto', tipo, periodo, referenceDate, filters.consultor],
     queryFn: async () => {
       if (!isOpen) return { metricas: {}, followups: [] };
       try {
         // Chamar função backend que retorna métricas + dados detalhados
         // Bug #1/#2 fix: diario e semanal não precisam de periodo
         const payload = {
           tipo,
           data: referenceDate,
           consultor_id: filters.consultor || null
         };
         if (tipo !== 'diario' && tipo !== 'semanal') {
           payload.periodo = periodo;
         }
         const response = await base44.functions.invoke('getRelatorioFollowUpMetricas', payload);

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

  // Bug #4/#6 fix: filtros corretos — canal não exclui pendentes; status 'todos' é o padrão
  const linhas = todasLinhas.filter(row => {
    const statusOk = !filters.status || filters.status === 'todos'
      ? true
      : filters.status === 'realizado'
        ? row.status === 'realizado'
        : row.status === 'pendente';
    // Bug #6: filtro de canal só aplica a realizados (pendentes não têm canal)
    const canalOk = !filters.canal || row.status === 'pendente' || row.canal === filters.canal;
    return statusOk && canalOk;
  });

  const paginatedData = linhas.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil((linhas.length || 1) / itemsPerPage);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle className="text-xl font-bold">
           Relatório Detalhado — {tipo === 'diario' ? 'Diário' : tipo === 'semanal' ? 'Semanal' : (periodo || 'Mensal').charAt(0).toUpperCase() + (periodo || 'Mensal').slice(1)}
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
            pendentesNoPrazo={metricas.pendentesNoPrazo || 0}
            taxaRealizacao={metricas.taxaRealizacao || 0}
            taxaAtraso={metricas.taxaAtraso ?? null}
          />

          {/* Régua de benchmark com marcador dinâmico — usa taxaAtraso do backend (só vencidos) */}
          {(() => {
            const taxaAtraso = metricas.taxaAtraso ?? 0;
            const posPercent = Math.min(taxaAtraso / 40 * 100, 98);
            return (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500 font-medium mb-2">Régua de Saúde — Taxa de Atraso (vencidos / total do período)</p>
                <div className="relative mb-5">
                  <div
                    className="absolute -top-0.5 flex flex-col items-center"
                    style={{ left: `${posPercent}%`, transform: 'translateX(-50%)' }}
                  >
                    <span className="text-xs font-bold text-red-600 whitespace-nowrap">{taxaAtraso}% atraso</span>
                    <svg width="12" height="10" viewBox="0 0 12 10" className="text-red-600 fill-red-600">
                      <polygon points="6,10 0,0 12,0" />
                    </svg>
                  </div>
                  <div className="flex rounded-full overflow-hidden h-3 mt-5">
                    <div className="w-[12.5%] bg-green-400" />
                    <div className="w-[12.5%] bg-blue-400" />
                    <div className="w-[25%] bg-yellow-400" />
                    <div className="w-[50%] bg-red-400" />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>🟢 Excelente (≤5%)</span>
                  <span>🔵 Saudável (≤10%)</span>
                  <span>🟡 Atenção (≤20%)</span>
                  <span>🔴 Crítico (&gt;20%)</span>
                </div>
              </div>
            );
          })()}

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
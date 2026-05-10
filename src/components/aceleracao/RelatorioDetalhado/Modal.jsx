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

          {/* Régua de benchmark com marcador dinâmico */}
          {(() => {
            const taxaAtraso = metricas.taxaAtraso ?? 0;
            const posPercent = Math.min(taxaAtraso / 40 * 100, 98);
            const saudeLabel = taxaAtraso <= 5 ? 'Excelente' : taxaAtraso <= 10 ? 'Saudável' : taxaAtraso <= 20 ? 'Atenção' : 'Crítico';
            const saudeColor = taxaAtraso <= 5 ? 'bg-green-500 text-white' : taxaAtraso <= 10 ? 'bg-blue-500 text-white' : taxaAtraso <= 20 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white';
            const lineColor = taxaAtraso <= 5 ? '#22c55e' : taxaAtraso <= 10 ? '#3b82f6' : taxaAtraso <= 20 ? '#eab308' : '#ef4444';
            return (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 pt-3 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-500 font-medium">Régua de Saúde — Taxa de Atraso</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${saudeColor}`}>
                    {saudeLabel}
                  </span>
                </div>

                {/* Área do marcador + barra — altura fixa para não sobrepor */}
                <div className="relative" style={{ height: '56px' }}>

                  {/* Marcador flutuante ACIMA da barra */}
                  <div
                    className="absolute top-0 flex flex-col items-center"
                    style={{ left: `${posPercent}%`, transform: 'translateX(-50%)' }}
                  >
                    {/* Pill com o valor */}
                    <div className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap shadow-sm ${saudeColor}`}>
                      {taxaAtraso}%
                    </div>
                    {/* Linha vertical conectora */}
                    <div
                      className="w-px"
                      style={{ height: '14px', backgroundColor: lineColor }}
                    />
                    {/* Triângulo apontando para baixo */}
                    <svg width="10" height="6" viewBox="0 0 10 6" style={{ fill: lineColor, display: 'block' }}>
                      <polygon points="5,6 0,0 10,0" />
                    </svg>
                  </div>

                  {/* Barra de cores — fica na parte inferior da área */}
                  <div className="absolute bottom-0 left-0 right-0">
                    <div className="flex rounded-full overflow-hidden h-4 shadow-inner">
                      <div className="w-[12.5%] bg-green-400" />
                      <div className="w-[12.5%] bg-blue-400" />
                      <div className="w-[25%] bg-yellow-400" />
                      <div className="w-[50%] bg-red-400" />
                    </div>
                  </div>
                </div>

                {/* Legenda */}
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>🟢 ≤5% Excelente</span>
                  <span>🔵 ≤10% Saudável</span>
                  <span>🟡 ≤20% Atenção</span>
                  <span>🔴 &gt;20% Crítico</span>
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
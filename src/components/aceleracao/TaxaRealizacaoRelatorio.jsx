import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowDown, ArrowUp, Download } from 'lucide-react';

const getTaxaColor = (taxa) => {
  if (taxa >= 80) return { bg: 'bg-green-50', text: 'text-green-700', emoji: '🟢' };
  if (taxa >= 50) return { bg: 'bg-yellow-50', text: 'text-yellow-700', emoji: '🟡' };
  if (taxa >= 20) return { bg: 'bg-orange-50', text: 'text-orange-700', emoji: '🟠' };
  return { bg: 'bg-red-50', text: 'text-red-700', emoji: '🔴' };
};

const getStatusCell = (status, data) => {
  switch (status) {
    case 'realizado':
      return {
        text: data && !isNaN(new Date(data).getTime()) ? new Date(data).toLocaleDateString('pt-BR') : '—',
        emoji: '✅',
        color: 'text-green-600',
        bg: 'bg-green-50'
      };
    case 'atrasado':
      return {
        text: typeof data === 'number' ? `-${data} dias` : '—',
        emoji: '❌',
        color: 'text-red-600',
        bg: 'bg-red-50'
      };
    case 'agendado':
      return {
        text: data && !isNaN(new Date(data).getTime()) ? new Date(data).toLocaleDateString('pt-BR') : 'agendado',
        emoji: '📝',
        color: 'text-blue-600',
        bg: 'bg-blue-50'
      };
    case 'pendente':
    case 'nao_agendado':
      return {
        text: '—',
        emoji: '📋',
        color: 'text-gray-400',
        bg: 'bg-gray-50'
      };
    default:
      return {
        text: '—',
        emoji: '—',
        color: 'text-gray-300',
        bg: 'bg-gray-50'
      };
  }
};

const getProgressBar = (taxa) => {
  const filled = Math.min(10, Math.max(0, Math.round(taxa / 10)));
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
};

export default function TaxaRealizacaoRelatorio() {
  const [statusFilter, setStatusFilter] = useState('todos');
  const [empresaFilter, setEmpresaFilter] = useState('');
  const [dataFilter, setDataFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' ou 'desc'

  const { data: clientes = [], isLoading, error } = useQuery({
    queryKey: ['taxa-realizacao', statusFilter, empresaFilter, dataFilter],
    queryFn: async () => {
      const response = await base44.functions.invoke('getTaxaRealizacaoClientesRelatorio', {
        status_filter: statusFilter,
        empresa_filter: empresaFilter || null,
        data_inicio_filter: dataFilter || null,
      });
      if (!response?.data?.clientes) return [];
      return response.data.clientes;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Buscar workshops para dropdown de empresas
  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops-filter'],
    queryFn: async () => {
      return await base44.entities.Workshop.list('-created_date', 500);
    },
  });

  const sortedClientes = useMemo(() => {
    if (sortOrder === 'asc') {
      return [...clientes].sort((a, b) => a.taxa_realizacao - b.taxa_realizacao);
    }
    return [...clientes].sort((a, b) => b.taxa_realizacao - a.taxa_realizacao);
  }, [clientes, sortOrder]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
       <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-2">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="realizados">Realizados (100%)</SelectItem>
                <SelectItem value="atrasados">Atrasados</SelectItem>
                <SelectItem value="agendados">Agendados</SelectItem>
                <SelectItem value="pendentes">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-2">Empresa</label>
            <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todas as empresas</SelectItem>
                {workshops.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-2">Data Início</label>
            <input
              type="date"
              value={dataFilter}
              onChange={(e) => setDataFilter(e.target.value)}
              className="w-full h-9 px-3 border border-gray-300 rounded text-sm"
            />
          </div>

          <div className="flex items-end">
            <Button variant="outline" size="sm" className="w-full h-9 gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
          </div>
          </div>

      {/* Tabela */}
       {isLoading ? (
         <div className="flex items-center justify-center py-12">
           <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
         </div>
       ) : error ? (
         <div className="text-center py-12 text-red-500">
           Erro ao carregar dados. Tente novamente.
         </div>
       ) : sortedClientes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            Nenhum cliente encontrado com os filtros selecionados
          </div>
        ) : (
         <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
            ⚡ <strong>Métrica Atualizada:</strong> Taxa de realização agora conta APENAS atendimentos de frequência (reuniões recorrentes). Eventos avulsos (workshops, monitorias) não impactam a taxa.
          </div>
         <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Empresa</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Data Início</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  <button
                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                    className="flex items-center gap-1 hover:bg-gray-200 px-2 py-1 rounded"
                  >
                    Taxa Realização
                    {sortOrder === 'desc' ? (
                      <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUp className="w-4 h-4" />
                    )}
                  </button>
                </th>
                {/* Colunas dinâmicas de atendimentos */}
                {sortedClientes.length > 0 && sortedClientes[0].atendimentos_status.map((aten, idx) => (
                  <th key={idx} className="px-3 py-2 text-center font-semibold text-gray-700 text-xs border-l border-gray-200 whitespace-nowrap">
                    {aten.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedClientes.map((cliente) => {
                const taxaColor = getTaxaColor(cliente.taxa_realizacao);
                return (
                  <tr key={cliente.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{cliente.nome} ({cliente.plano})</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(cliente.data_inicio).toLocaleDateString('pt-BR')}</td>
                    <td className={`px-4 py-3 ${taxaColor.bg}`}>
                      <div className="space-y-1">
                        <div className={`font-semibold ${taxaColor.text}`}>
                          {taxaColor.emoji} {cliente.taxa_realizacao}% [{getProgressBar(cliente.taxa_realizacao)}]
                        </div>
                        <div className="text-xs text-gray-600">{cliente.total_realizado} de {cliente.total_previsto} realizados</div>
                      </div>
                    </td>
                    {/* Renderizar colunas de atendimentos dinamicamente */}
                     {cliente.atendimentos_status.map((aten, idx) => {
                       const cell = getStatusCell(aten.status, aten.diasAtrasado || aten.data);
                       return (
                         <td 
                           key={idx} 
                           className={`px-3 py-2 text-xs text-center whitespace-nowrap border-l border-gray-100 ${cell.bg}`}
                         >
                           <div className="flex items-center justify-center gap-1">
                             <span>{cell.emoji}</span>
                             <span className={`${cell.color} font-medium`}>{cell.text}</span>
                           </div>
                         </td>
                       );
                     })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          </>
          )}
          </div>
          );
          }
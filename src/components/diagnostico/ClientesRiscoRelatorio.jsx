import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import WheelLoader from '@/components/ui/WheelLoader';

export default function ClientesRiscoRelatorio() {
  const [sortBy, setSortBy] = useState('dias_sem_contato');

  const { data: relatorio = { clientes: [], estatisticas: {} }, isLoading, refetch } = useQuery({
    queryKey: ['clientesRisco7Dias'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('listarClientesRisco7DiasSemContato', {});
        return response.data;
      } catch (error) {
        console.error('Erro ao carregar relatório:', error);
        return { clientes: [], estatisticas: {} };
      }
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true
  });

  const clientesOrdenados = [...relatorio.clientes].sort((a, b) => {
    if (sortBy === 'dias_sem_contato') {
      return b.dias_sem_contato - a.dias_sem_contato;
    }
    return a.name.localeCompare(b.name);
  });

  const exportarCSV = () => {
    const headers = ['Cliente', 'Plano', 'Último Atendimento', 'Follow-ups Atrasados', 'Dias Sem Contato'];
    const rows = relatorio.clientes.map(c => [
      c.name,
      c.plano,
      c.ultimo_atendimento || 'Sem registros',
      c.followup_atrasados,
      c.dias_sem_contato
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes-risco-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 p-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-300 p-6">
          <p className="text-sm text-red-700 font-medium">Clientes em Risco</p>
          <p className="text-3xl font-bold text-red-900">{relatorio.estatisticas.total_clientes_em_risco || 0}</p>
          <p className="text-xs text-red-600 mt-2">de {relatorio.estatisticas.total_contratos_ativos}</p>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300 p-6">
          <p className="text-sm text-orange-700 font-medium">% de Risco</p>
          <p className="text-3xl font-bold text-orange-900">{relatorio.estatisticas.percentual_risco || 0}%</p>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 p-6">
          <p className="text-sm text-blue-700 font-medium">Período Analisado</p>
          <p className="text-sm font-mono text-blue-900 mt-2">{relatorio.estatisticas.data_filtro}</p>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300 p-6">
          <p className="text-sm text-purple-700 font-medium">Critério</p>
          <p className="text-xs text-purple-900 mt-2">{relatorio.estatisticas.criterio}</p>
        </Card>
      </div>

      {/* Controles */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={sortBy === 'dias_sem_contato' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortBy('dias_sem_contato')}
        >
          Ordenar por Dias
        </Button>
        <Button
          variant={sortBy === 'nome' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortBy('nome')}
        >
          Ordenar por Nome
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={exportarCSV}
          className="ml-auto gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </Button>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <WheelLoader size="lg" text="Carregando relatório..." />
        </div>
      ) : clientesOrdenados.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-green-50">
          ✅ Nenhum cliente com mais de 7 dias sem contato. Parabéns!
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Plano</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Último Atendimento</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Follow-ups Atrasados</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-red-600">Dias Sem Contato</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clientesOrdenados.map((cliente, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{cliente.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                      {cliente.plano}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {cliente.ultimo_atendimento && cliente.ultimo_atendimento !== 'Sem registros'
                      ? new Date(cliente.ultimo_atendimento).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {cliente.followup_atrasados > 0 ? (
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
                        {cliente.followup_atrasados}
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">
                      {cliente.dias_sem_contato}d
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
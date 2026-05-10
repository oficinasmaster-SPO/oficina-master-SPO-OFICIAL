import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import KPIsGerais from "@/components/tempo/KPIsGerais";
import GraficoTempo from "@/components/tempo/GraficoTempo";
import TabelaConsultores from "@/components/tempo/TabelaConsultores";
import TabelaClientes from "@/components/tempo/TabelaClientes";
import TimelineCliente from "@/components/tempo/TimelineCliente";
import useConsultoresList from "@/components/hooks/useConsultoresList";

export default function DashboardTempoAtencao() {
  const [periodo, setPeriodo] = useState("mes");
  const [consultorFiltro, setConsultorFiltro] = useState("todos");
  const [clienteSelecionado, setClienteSelecionado] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: consultores = [] } = useConsultoresList(user);

  const payload = {
    periodo,
    ...(consultorFiltro !== "todos" && { consultor_id: consultorFiltro }),
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tempo-analytics', periodo, consultorFiltro],
    queryFn: async () => {
      const res = await base44.functions.invoke('getTempoAnalytics', payload);
      return res.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const periodoLabel = { semana: "Esta semana", mes: "Este mês", trimestre: "Trimestre", ano: "Este ano" };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">⏱️ Tempo de Atenção ao Cliente</h1>
          <p className="text-sm text-gray-500 mt-0.5">Horas dedicadas por consultor e por cliente</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Período:</span>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mês</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
              <SelectItem value="ano">Este ano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {consultores.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Consultor:</span>
            <Select value={consultorFiltro} onValueChange={setConsultorFiltro}>
              <SelectTrigger className="w-44 h-8 text-sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {consultores.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <span className="ml-auto text-xs text-gray-400 self-center">
          {periodoLabel[periodo]}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          Carregando métricas...
        </div>
      ) : (
        <>
          {/* KPIs */}
          <KPIsGerais totais={data?.totais} porConsultor={data?.por_consultor} />

          {/* Gráfico */}
          <GraficoTempo porCliente={data?.por_cliente} />

          {/* Tabelas lado a lado */}
          <div className="grid lg:grid-cols-2 gap-4">
            <TabelaConsultores porConsultor={data?.por_consultor} />
            <TabelaClientes
              porCliente={data?.por_cliente}
              onSelectCliente={setClienteSelecionado}
            />
          </div>

          {/* Timeline expandível */}
          {clienteSelecionado && (
            <TimelineCliente
              cliente={clienteSelecionado}
              onClose={() => setClienteSelecionado(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, User, Building2, Clock, Filter, TrendingUp, Users as UsersIcon, Target, ListTodo, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import FinalizarAtendimentoModal from "./FinalizarAtendimentoModal";

export default function AceleracaoTab({ workshop, user }) {
  const [filters, setFilters] = useState({
    data_inicio: "",
    data_fim: "",
    status: "em_aberto", // Mostrar apenas em aberto por padrão
    tipo: "todos"
  });
  const [atendimentoSelecionado, setAtendimentoSelecionado] = useState(null);

  // Buscar atendimentos
  const { data: atendimentos = [], isLoading } = useQuery({
    queryKey: ['aceleracao-atendimentos', workshop?.id, filters],
    queryFn: async () => {
      if (!workshop?.id) return [];
      
      let query = { workshop_id: workshop.id };
      
      // Filtro de status
      if (filters.status === "em_aberto") {
        // Buscar todos que NÃO são realizados nem cancelados
        const todos = await base44.entities.ConsultoriaAtendimento.filter(
          { workshop_id: workshop.id },
          '-data_agendada'
        );
        return todos.filter(a => !['realizado', 'cancelado'].includes(a.status));
      } else if (filters.status !== "todos") {
        query.status = filters.status;
      }
      
      if (filters.tipo !== "todos") {
        query.tipo_atendimento = filters.tipo;
      }

      return await base44.entities.ConsultoriaAtendimento.filter(query, '-data_agendada');
    },
    enabled: !!workshop?.id
  });

  // Buscar clientes ativos (workshops com planos)
  const { data: clientesAtivos = [] } = useQuery({
    queryKey: ['clientes-ativos'],
    queryFn: async () => {
      const workshops = await base44.entities.Workshop.filter({
        status: 'ativo'
      });
      return workshops.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    },
    enabled: user?.role === 'admin' || user?.job_role === 'acelerador'
  });

  // Estatísticas
  const getStats = () => {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    const realizadasMes = atendimentos.filter(a => 
      a.status === 'realizado' && 
      new Date(a.data_realizada) >= inicioMes && 
      new Date(a.data_realizada) <= fimMes
    ).length;
    
    const aRealizarMes = atendimentos.filter(a => 
      ['agendado', 'confirmado'].includes(a.status) && 
      new Date(a.data_agendada) <= fimMes
    ).length;

    return {
      clientesAtivos: clientesAtivos.length,
      realizadasMes,
      aRealizarMes
    };
  };

  const stats = getStats();

  const getStatusColor = (status) => {
    const colors = {
      agendado: "bg-red-500 text-white", // Em aberto = vermelho
      confirmado: "bg-orange-500 text-white animate-pulse", // Em andamento = laranja piscando
      realizado: "bg-green-500 text-white", // Finalizado = verde
      cancelado: "bg-gray-400 text-white",
      remarcado: "bg-yellow-500 text-white",
      atrasado: "bg-red-700 text-white animate-pulse font-bold"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const checkAtrasado = (atendimento) => {
    if (atendimento.status !== 'realizado' && atendimento.status !== 'cancelado') {
      const agora = new Date();
      const dataAtendimento = new Date(atendimento.data_agendada);
      const horaLimite = new Date(dataAtendimento);
      horaLimite.setHours(17, 0, 0, 0);
      
      // Se passou das 17h do dia do atendimento e ainda não foi realizado
      if (agora > horaLimite && dataAtendimento.toDateString() === agora.toDateString()) {
        return true;
      }
    }
    return false;
  };

  const atendimentosFiltrados = atendimentos
    .filter(a => {
      if (filters.data_inicio && new Date(a.data_agendada) < new Date(filters.data_inicio)) return false;
      if (filters.data_fim && new Date(a.data_agendada) > new Date(filters.data_fim)) return false;
      return true;
    })
    .sort((a, b) => {
      // Atrasados primeiro (no topo piscando)
      const aAtrasado = checkAtrasado(a);
      const bAtrasado = checkAtrasado(b);
      if (aAtrasado && !bAtrasado) return -1;
      if (!aAtrasado && bAtrasado) return 1;
      
      // Depois por data
      return new Date(b.data_agendada) - new Date(a.data_agendada);
    });

  return (
    <>
      {atendimentoSelecionado && (
        <FinalizarAtendimentoModal
          atendimento={atendimentoSelecionado}
          onClose={() => setAtendimentoSelecionado(null)}
        />
      )}

    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <UsersIcon className="w-4 h-4" />
              Clientes Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{stats.clientesAtivos}</p>
            <p className="text-xs text-gray-500 mt-1">Com planos habilitados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Reuniões Realizadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.realizadasMes}</p>
            <p className="text-xs text-gray-500 mt-1">Neste mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Reuniões Agendadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{stats.aRealizarMes}</p>
            <p className="text-xs text-gray-500 mt-1">Até o fim do mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Data Início</label>
              <Input
                type="date"
                value={filters.data_inicio}
                onChange={(e) => setFilters({ ...filters, data_inicio: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Data Fim</label>
              <Input
                type="date"
                value={filters.data_fim}
                onChange={(e) => setFilters({ ...filters, data_fim: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="em_aberto">Em Aberto (padrão)</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="realizado">Realizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Tipo</label>
              <Select value={filters.tipo} onValueChange={(value) => setFilters({ ...filters, tipo: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="diagnostico_inicial">Diagnóstico</SelectItem>
                  <SelectItem value="acompanhamento_mensal">Acompanhamento</SelectItem>
                  <SelectItem value="reuniao_estrategica">Estratégica</SelectItem>
                  <SelectItem value="treinamento">Treinamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Registros em Formato Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Atendimentos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : atendimentosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Nenhum atendimento encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data/Hora</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Pauta</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Consultor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Observações</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {atendimentosFiltrados.map((atendimento) => {
                    const isAtrasado = checkAtrasado(atendimento);
                    const statusFinal = isAtrasado ? 'atrasado' : atendimento.status;
                    
                    return (
                      <tr 
                        key={atendimento.id} 
                        className={`border-b hover:bg-gray-50 transition-colors ${
                          isAtrasado ? 'bg-red-100' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">
                          {atendimento.id.substring(0, 8)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`${getStatusColor(statusFinal)} text-xs font-bold`}>
                            {isAtrasado ? 'ATRASADO' : atendimento.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {atendimento.workshop_id?.substring(0, 12)}...
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {format(new Date(atendimento.data_agendada), "dd/MM/yyyy", { locale: ptBR })}
                          <br />
                          <span className="text-xs text-gray-500">
                            {format(new Date(atendimento.data_agendada), "HH:mm")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {atendimento.tipo_atendimento?.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                          {atendimento.pauta?.[0]?.titulo || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {atendimento.consultor_nome}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                          <div className="truncate" title={atendimento.observacoes_consultor}>
                            {atendimento.observacoes_consultor || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {!['realizado', 'cancelado'].includes(atendimento.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-800"
                              onClick={() => setAtendimentoSelecionado(atendimento)}
                              title="Finalizar Atendimento"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}
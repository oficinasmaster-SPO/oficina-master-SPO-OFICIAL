import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  User, 
  Building2, 
  Clock, 
  Filter, 
  TrendingUp, 
  Users as UsersIcon, 
  Target, 
  CheckCircle, 
  AlertTriangle,
  Plus,
  RefreshCw
} from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import FinalizarAtendimentoModal from "./FinalizarAtendimentoModal";

export default function PainelAceleracao({ workshop, user }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    data_inicio: "",
    data_fim: "",
    status: "em_aberto",
    tipo: "todos",
    consultor: "todos"
  });
  const [atendimentoSelecionado, setAtendimentoSelecionado] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Buscar todos clientes com planos habilitados
  const { data: clientesAtivos = [] } = useQuery({
    queryKey: ['clientes-ativos-aceleracao'],
    queryFn: async () => {
      if (user?.role !== 'admin' && user?.job_role !== 'acelerador') return [];
      const workshops = await base44.entities.Workshop.list();
      return workshops.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    },
    enabled: user?.role === 'admin' || user?.job_role === 'acelerador'
  });

  // Buscar atendimentos
  const { data: atendimentos = [], isLoading, refetch } = useQuery({
    queryKey: ['aceleracao-atendimentos-painel', filters],
    queryFn: async () => {
      if (user?.role !== 'admin' && user?.job_role !== 'acelerador') return [];
      
      let query = {};
      
      if (filters.status === "em_aberto") {
        const todos = await base44.entities.ConsultoriaAtendimento.list('-data_agendada');
        return todos.filter(a => !['realizado', 'cancelado'].includes(a.status));
      } else if (filters.status !== "todos") {
        query.status = filters.status;
      }
      
      if (filters.tipo !== "todos") {
        query.tipo_atendimento = filters.tipo;
      }

      return await base44.entities.ConsultoriaAtendimento.filter(query, '-data_agendada');
    },
    enabled: user?.role === 'admin' || user?.job_role === 'acelerador',
    refetchInterval: autoRefresh ? 30000 : false // Auto-refresh a cada 30s
  });

  // Auto-refresh visual
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refetch();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refetch]);

  // Verificar se está atrasado
  const checkAtrasado = (atendimento) => {
    if (atendimento.status === 'realizado' || atendimento.status === 'cancelado') return false;
    
    const agendada = new Date(atendimento.data_agendada);
    const hoje = new Date();
    const hora17 = new Date(agendada);
    hora17.setHours(17, 0, 0, 0);
    
    return hoje > hora17;
  };

  // Cores dos status
  const getStatusColor = (status, isAtrasado) => {
    if (isAtrasado) return "bg-red-700 text-white animate-pulse font-bold";
    
    const colors = {
      agendado: "bg-red-500 text-white",
      confirmado: "bg-orange-500 text-white animate-pulse",
      realizado: "bg-green-500 text-white",
      cancelado: "bg-gray-400 text-white"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  // Filtrar e ordenar
  const atendimentosFiltrados = atendimentos
    .filter(a => {
      if (filters.data_inicio && new Date(a.data_agendada) < new Date(filters.data_inicio)) return false;
      if (filters.data_fim && new Date(a.data_agendada) > new Date(filters.data_fim)) return false;
      if (filters.consultor !== "todos" && a.consultor_id !== filters.consultor) return false;
      return true;
    })
    .sort((a, b) => {
      const aAtrasado = checkAtrasado(a);
      const bAtrasado = checkAtrasado(b);
      if (aAtrasado && !bAtrasado) return -1;
      if (!aAtrasado && bAtrasado) return 1;
      return new Date(b.data_agendada) - new Date(a.data_agendada);
    });

  // Métricas
  const totalReunioesRealizadas = atendimentos.filter(a => a.status === 'realizado').length;
  const totalReunioesProgramadas = atendimentos.filter(a => ['agendado', 'confirmado'].includes(a.status)).length;
  const totalAtrasados = atendimentosFiltrados.filter(checkAtrasado).length;

  // Buscar nome do cliente
  const getClienteName = (workshop_id) => {
    const cliente = clientesAtivos.find(c => c.id === workshop_id);
    return cliente?.name || 'Cliente';
  };

  return (
    <>
      {atendimentoSelecionado && (
        <FinalizarAtendimentoModal
          atendimento={atendimentoSelecionado}
          onClose={() => setAtendimentoSelecionado(null)}
        />
      )}

      <div className="space-y-6">
        {/* Header com Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Clientes Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{clientesAtivos.length}</div>
              <Button
                variant="link"
                className="text-white p-0 h-auto text-xs mt-2"
                onClick={() => navigate(createPageUrl('AdminClientes'))}
              >
                Ver todos →
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Realizadas (Mês)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalReunioesRealizadas}</div>
              <p className="text-xs opacity-90 mt-2">Atendimentos finalizados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Programadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalReunioesProgramadas}</div>
              <p className="text-xs opacity-90 mt-2">Próximos atendimentos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white animate-pulse">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Atrasados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalAtrasados}</div>
              <p className="text-xs opacity-90 mt-2">Requer atenção urgente</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Ações */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAutoRefresh(!autoRefresh);
                  }}
                  className={autoRefresh ? "bg-green-50" : ""}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                  {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                </Button>
                <Button
                  onClick={() => navigate(createPageUrl('RegistrarAtendimento'))}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Atendimento
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Data Início</label>
                <Input
                  type="date"
                  value={filters.data_inicio}
                  onChange={(e) => setFilters({ ...filters, data_inicio: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Data Fim</label>
                <Input
                  type="date"
                  value={filters.data_fim}
                  onChange={(e) => setFilters({ ...filters, data_fim: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_aberto">Em Aberto</SelectItem>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="realizado">Realizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo</label>
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
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Consultor</label>
                <Select value={filters.consultor} onValueChange={(value) => setFilters({ ...filters, consultor: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {/* TODO: Listar consultores dinamicamente */}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Painel Estilo Aeroporto */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
            <CardTitle className="flex items-center gap-2">
              📋 Painel de Atendimentos - Aceleração
              <span className="ml-auto text-sm font-normal opacity-80">
                Atualizado: {format(new Date(), "HH:mm:ss")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Carregando...</div>
            ) : atendimentosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Nenhum atendimento encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full bg-gray-900 text-white">
                  <thead>
                    <tr className="bg-gray-800 border-b-2 border-yellow-500">
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Data/Hora</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Pauta</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Consultor</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Observações</th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atendimentosFiltrados.map((atendimento, index) => {
                      const isAtrasado = checkAtrasado(atendimento);
                      const statusFinal = isAtrasado ? 'ATRASADO' : atendimento.status.toUpperCase();
                      const rowColor = index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850';
                      
                      return (
                        <tr 
                          key={atendimento.id}
                          className={`border-b border-gray-700 hover:bg-gray-700 transition-colors ${
                            isAtrasado ? 'bg-red-900/30 animate-pulse' : rowColor
                          }`}
                        >
                          <td className="px-4 py-3 text-sm font-mono text-yellow-400">
                            {atendimento.id.substring(0, 8).toUpperCase()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={`${getStatusColor(atendimento.status, isAtrasado)} text-xs font-bold px-3 py-1`}>
                              {statusFinal}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-blue-400">
                            {getClienteName(atendimento.workshop_id)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="font-semibold text-white">
                              {format(new Date(atendimento.data_agendada), "dd/MM/yyyy")}
                            </div>
                            <div className="text-xs text-gray-400">
                              {format(new Date(atendimento.data_agendada), "HH:mm")}h
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {atendimento.tipo_atendimento?.replace(/_/g, ' ').toUpperCase()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300 max-w-xs truncate">
                            {atendimento.pauta?.[0]?.titulo || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {atendimento.consultor_nome}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400 max-w-xs">
                            <div className="truncate" title={atendimento.observacoes_consultor}>
                              {atendimento.observacoes_consultor || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {!['realizado', 'cancelado'].includes(atendimento.status) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                                onClick={() => setAtendimentoSelecionado(atendimento)}
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
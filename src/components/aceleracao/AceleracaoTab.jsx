import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, User, Building2, Clock, Filter, TrendingUp, Users as UsersIcon, Target, ListTodo } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AceleracaoTab({ workshop, user }) {
  const [filters, setFilters] = useState({
    data_inicio: "",
    data_fim: "",
    status: "em_aberto", // Mostrar apenas em aberto por padrão
    tipo: "todos"
  });

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

      {/* Lista de Registros */}
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
            <div className="space-y-3">
              {atendimentosFiltrados.map((atendimento) => {
                const isAtrasado = checkAtrasado(atendimento);
                const statusDisplay = isAtrasado ? 'ATRASADO ⚠️' : atendimento.status.toUpperCase();
                
                return (
                <div
                  key={atendimento.id}
                  className={`border-2 rounded-lg p-4 transition-all ${
                    isAtrasado ? 'border-red-600 bg-red-50 shadow-xl' : 'border-gray-200 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Coluna Status */}
                    <div className="flex-shrink-0">
                      <Badge className={`${getStatusColor(isAtrasado ? 'atrasado' : atendimento.status)} text-sm px-3 py-1`}>
                        {statusDisplay}
                      </Badge>
                    </div>

                    {/* Informações Principais */}
                    <div className="flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">
                            {format(new Date(atendimento.data_agendada), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="w-4 h-4 text-gray-500" />
                          <span>Workshop ID: {atendimento.workshop_id.substring(0, 8)}...</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-gray-500" />
                          <span>{atendimento.consultor_nome}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Tipo:</span> {atendimento.tipo_atendimento?.replace(/_/g, ' ')}
                        </div>
                      </div>

                      {atendimento.pauta?.length > 0 && (
                        <div className="mt-2 text-sm bg-blue-50 p-2 rounded">
                          <strong className="text-blue-700">Pauta:</strong>{' '}
                          <span className="text-gray-700">{atendimento.pauta[0].titulo}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
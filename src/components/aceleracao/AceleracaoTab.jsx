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
    status: "todos",
    tipo: "todos"
  });

  // Buscar atendimentos
  const { data: atendimentos = [], isLoading } = useQuery({
    queryKey: ['aceleracao-atendimentos', workshop?.id, filters],
    queryFn: async () => {
      if (!workshop?.id) return [];
      
      let query = { workshop_id: workshop.id };
      
      if (filters.status !== "todos") {
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
      agendado: "bg-blue-100 text-blue-800",
      confirmado: "bg-green-100 text-green-800",
      realizado: "bg-gray-100 text-gray-800",
      cancelado: "bg-red-100 text-red-800",
      remarcado: "bg-yellow-100 text-yellow-800",
      atrasado: "bg-red-500 text-white animate-pulse"
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

  const atendimentosFiltrados = atendimentos.filter(a => {
    if (filters.data_inicio && new Date(a.data_agendada) < new Date(filters.data_inicio)) return false;
    if (filters.data_fim && new Date(a.data_agendada) > new Date(filters.data_fim)) return false;
    return true;
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
                return (
                <div
                  key={atendimento.id}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                    isAtrasado ? 'border-red-500 border-2 shadow-lg' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getStatusColor(isAtrasado ? 'atrasado' : atendimento.status)}>
                          {isAtrasado ? 'ATRASADO' : atendimento.status}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {atendimento.tipo_atendimento?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(atendimento.data_agendada), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {atendimento.consultor_nome}
                        </div>
                      </div>

                      {atendimento.pauta?.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600">
                          <strong>Pauta:</strong> {atendimento.pauta[0].titulo}
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
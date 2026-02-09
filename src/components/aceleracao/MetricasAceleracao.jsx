import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Calendar, Target, DollarSign, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function MetricasAceleracao({ user }) {
  // Buscar clientes ativos
  const { data: clientesAtivos = [] } = useQuery({
    queryKey: ['clientes-aceleracao-metricas'],
    queryFn: async () => {
      const workshops = await base44.entities.Workshop.list();
      return workshops.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    },
    enabled: user?.role === 'admin' || user?.job_role === 'acelerador'
  });

  // Buscar atendimentos
  const { data: atendimentos = [] } = useQuery({
    queryKey: ['atendimentos-aceleracao-metricas'],
    queryFn: () => base44.entities.ConsultoriaAtendimento.list(),
    enabled: user?.role === 'admin' || user?.job_role === 'acelerador'
  });

  // Calcular métricas
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  const reunioesRealizadasMes = atendimentos.filter(a => 
    a.status === 'realizado' && 
    new Date(a.data_realizada) >= inicioMes && 
    new Date(a.data_realizada) <= fimMes
  ).length;

  const reunioesProgramadasMes = atendimentos.filter(a =>
    ['agendado', 'confirmado'].includes(a.status) &&
    new Date(a.data_agendada) >= inicioMes &&
    new Date(a.data_agendada) <= fimMes
  ).length;

  // Crescimento médio de clientes
  const clientesComCrescimento = clientesAtivos.filter(c => c.monthly_goals?.growth_percentage);
  const crescimentoMedio = clientesComCrescimento.length > 0
    ? (clientesComCrescimento.reduce((acc, c) => acc + (c.monthly_goals?.growth_percentage || 0), 0) / clientesComCrescimento.length).toFixed(1)
    : 0;

  // Colaboradores totais
  const totalColaboradores = clientesAtivos.reduce((acc, c) => acc + (c.employees_count || 0), 0);

  // Evolução mensal (últimos 6 meses)
  const evolucaoMensal = [];
  for (let i = 5; i >= 0; i--) {
    const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const mesProx = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 0);
    
    const realizadas = atendimentos.filter(a =>
      a.status === 'realizado' &&
      new Date(a.data_realizada) >= mes &&
      new Date(a.data_realizada) <= mesProx
    ).length;

    evolucaoMensal.push({
      mes: mes.toLocaleDateString('pt-BR', { month: 'short' }),
      realizadas
    });
  }

  // Reuniões por consultor
  const consultores = {};
  atendimentos.forEach(a => {
    if (a.consultor_nome) {
      if (!consultores[a.consultor_nome]) {
        consultores[a.consultor_nome] = { total: 0, realizadas: 0, programadas: 0 };
      }
      consultores[a.consultor_nome].total++;
      if (a.status === 'realizado') consultores[a.consultor_nome].realizadas++;
      if (['agendado', 'confirmado'].includes(a.status)) consultores[a.consultor_nome].programadas++;
    }
  });

  const dadosConsultores = Object.entries(consultores).map(([nome, dados]) => ({
    nome: nome.split(' ')[0],
    ...dados
  }));

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Crescimento Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{crescimentoMedio}%</div>
            <p className="text-xs opacity-90 mt-2">Média dos clientes ativos</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Unidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{clientesAtivos.length}</div>
            <p className="text-xs opacity-90 mt-2">Oficinas ativas na rede</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Colaboradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalColaboradores}</div>
            <p className="text-xs opacity-90 mt-2">Total na rede</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Evolução de Atendimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="realizadas" stroke="#10b981" strokeWidth={2} name="Realizadas" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance por Consultor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dadosConsultores}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="realizadas" fill="#10b981" name="Realizadas" />
                <Bar dataKey="programadas" fill="#f59e0b" name="Programadas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tarefas Pendentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Tarefas Pendentes por Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{reunioesProgramadasMes}</div>
              <p className="text-sm text-gray-600">Este Mês</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {atendimentos.filter(a => ['agendado', 'confirmado'].includes(a.status) && new Date(a.data_agendada) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length}
              </div>
              <p className="text-sm text-gray-600">Esta Semana</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {atendimentos.filter(a => ['agendado', 'confirmado'].includes(a.status) && new Date(a.data_agendada).toDateString() === new Date().toDateString()).length}
              </div>
              <p className="text-sm text-gray-600">Hoje</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{reunioesRealizadasMes}</div>
              <p className="text-sm text-gray-600">Realizadas (Mês)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
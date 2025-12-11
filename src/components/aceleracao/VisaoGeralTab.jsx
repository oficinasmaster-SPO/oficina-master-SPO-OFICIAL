import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, TrendingUp, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function VisaoGeralTab({ user }) {
  const { data: workshops } = useQuery({
    queryKey: ['workshops-ativos'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list();
      return all.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    }
  });

  const { data: atendimentos } = useQuery({
    queryKey: ['atendimentos-mes'],
    queryFn: async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const all = await base44.entities.ConsultoriaAtendimento.list();
      return all.filter(a => new Date(a.data_agendada) >= firstDay);
    }
  });

  const clientesAtivos = workshops?.length || 0;
  const reunioesRealizadas = atendimentos?.filter(a => a.status === 'realizado').length || 0;
  const reunioesFuturas = atendimentos?.filter(a => 
    ['agendado', 'confirmado'].includes(a.status)
  ).length || 0;
  
  const tarefasPendentes = atendimentos?.filter(a => 
    a.status !== 'realizado' && new Date(a.data_agendada) < new Date()
  ) || [];

  const proximosAtendimentos = atendimentos?.filter(a => 
    ['agendado', 'confirmado'].includes(a.status) && 
    new Date(a.data_agendada) >= new Date()
  ).slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientesAtivos}</div>
            <p className="text-xs text-gray-600">Com planos habilitados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reuniões Realizadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reunioesRealizadas}</div>
            <p className="text-xs text-gray-600">Neste mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reuniões Futuras</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reunioesFuturas}</div>
            <p className="text-xs text-gray-600">Agendadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Horas Disponíveis</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">160h</div>
            <p className="text-xs text-gray-600">Neste mês</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Próximos Atendimentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Próximos Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proximosAtendimentos.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum atendimento próximo</p>
            ) : (
              <div className="space-y-3">
                {proximosAtendimentos.map((atendimento) => (
                  <div key={atendimento.id} className="border-l-4 border-blue-500 pl-3 py-2">
                    <p className="font-medium text-sm">{atendimento.tipo_atendimento}</p>
                    <p className="text-xs text-gray-600">
                      {format(new Date(atendimento.data_agendada), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tarefas Atrasadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Atendimentos Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tarefasPendentes.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                <p className="text-gray-500">Tudo em dia!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tarefasPendentes.slice(0, 5).map((atendimento) => (
                  <div key={atendimento.id} className="border-l-4 border-red-500 pl-3 py-2">
                    <p className="font-medium text-sm">{atendimento.tipo_atendimento}</p>
                    <p className="text-xs text-red-600">
                      Previsto: {format(new Date(atendimento.data_agendada), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
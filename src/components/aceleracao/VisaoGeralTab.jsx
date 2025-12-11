import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, TrendingUp, CheckCircle, Clock } from "lucide-react";

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

      {/* Gráficos e outras visualizações podem ser adicionados aqui */}
    </div>
  );
}
import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, Clock, AlertCircle } from "lucide-react";

export default function CronogramaAceleracaoTab({ user }) {
  const { data: workshops } = useQuery({
    queryKey: ['workshops-cronograma'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list();
      return all.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    }
  });

  const { data: progressos } = useQuery({
    queryKey: ['todos-progressos'],
    queryFn: () => base44.entities.CronogramaProgresso.list()
  });

  return (
    <div className="space-y-6">
      {workshops?.map((workshop) => {
        const progressoWorkshop = progressos?.filter(p => p.workshop_id === workshop.id) || [];
        const total = progressoWorkshop.length;
        const concluidos = progressoWorkshop.filter(p => p.situacao === 'concluido').length;
        const percentual = total > 0 ? Math.round((concluidos / total) * 100) : 0;

        return (
          <Card key={workshop.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{workshop.name}</CardTitle>
                <Badge className="bg-blue-100 text-blue-800">
                  {workshop.planoAtual}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Progresso Geral</span>
                    <span className="text-lg font-bold text-blue-600">{percentual}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${percentual}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{concluidos}</p>
                    <p className="text-xs text-gray-600">Concluídos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">
                      {progressoWorkshop.filter(p => p.situacao === 'em_andamento').length}
                    </p>
                    <p className="text-xs text-gray-600">Em Andamento</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-600">
                      {progressoWorkshop.filter(p => p.situacao === 'nao_iniciado').length}
                    </p>
                    <p className="text-xs text-gray-600">Não Iniciados</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
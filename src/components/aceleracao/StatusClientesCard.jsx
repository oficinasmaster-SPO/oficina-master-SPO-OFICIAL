import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";

export default function StatusClientesCard({ workshops = [], atendimentos = [], onStatusClick }) {
  // Calcular status de cada workshop uma única vez
  const { counts, clientesPorStatus } = useMemo(() => {
    const statusMap = { crescente: [], decrescente: [], estagnado: [], nao_responde: [] };
    const countsObj = { crescente: 0, decrescente: 0, estagnado: 0, nao_responde: 0 };

    workshops.forEach(workshop => {
      const atendimentosWorkshop = atendimentos
        .filter(a => a.workshop_id === workshop.id && a.status_cliente)
        .sort((a, b) => new Date(b.data_realizada || b.data_agendada) - new Date(a.data_realizada || a.data_agendada));

      if (atendimentosWorkshop.length > 0) {
        const ultimoStatus = atendimentosWorkshop[0].status_cliente;
        if (statusMap.hasOwnProperty(ultimoStatus)) {
          statusMap[ultimoStatus].push(workshop);
          countsObj[ultimoStatus]++;
        }
      }
    });

    return { counts: countsObj, clientesPorStatus: statusMap };
  }, [workshops, atendimentos]);

  const statusConfig = {
    crescente: { label: 'Crescente', color: 'bg-green-100 text-green-700', icon: TrendingUp },
    decrescente: { label: 'Decrescente', color: 'bg-red-100 text-red-700', icon: TrendingDown },
    estagnado: { label: 'Estagnado', color: 'bg-yellow-100 text-yellow-700', icon: Minus },
    nao_responde: { label: 'Não Responde', color: 'bg-gray-100 text-gray-700', icon: AlertCircle }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Status dos Clientes</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1.5">
          {Object.entries(statusConfig).map(([key, config]) => {
            const Icon = config.icon;
            const clientesStatus = clientesPorStatus[key] || [];
            
            return (
              <div 
                key={key} 
                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors"
                onClick={() => onStatusClick && onStatusClick(key, clientesStatus)}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{config.label}</span>
                </div>
                <Badge className={`${config.color} cursor-pointer hover:opacity-80`}>
                  {counts[key]}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
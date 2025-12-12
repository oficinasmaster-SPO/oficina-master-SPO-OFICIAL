import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";

export default function StatusClientesCard({ workshops = [], atendimentos = [], onStatusClick }) {
  const getClientesPorStatus = (status) => {
    const clientesComStatus = [];
    
    workshops.forEach(workshop => {
      const atendimentosWorkshop = atendimentos
        .filter(a => a.workshop_id === workshop.id && a.status_cliente)
        .sort((a, b) => new Date(b.data_realizada || b.data_agendada) - new Date(a.data_realizada || a.data_agendada));
      
      if (atendimentosWorkshop.length > 0) {
        const ultimoStatus = atendimentosWorkshop[0].status_cliente;
        if (ultimoStatus === status) {
          clientesComStatus.push(workshop);
        }
      }
    });
    
    return clientesComStatus;
  };

  const getStatusCounts = () => {
    const counts = {
      crescente: 0,
      decrescente: 0,
      estagnado: 0,
      nao_responde: 0
    };

    // Pegar o último atendimento de cada workshop
    workshops.forEach(workshop => {
      const atendimentosWorkshop = atendimentos
        .filter(a => a.workshop_id === workshop.id && a.status_cliente)
        .sort((a, b) => new Date(b.data_realizada || b.data_agendada) - new Date(a.data_realizada || a.data_agendada));
      
      if (atendimentosWorkshop.length > 0) {
        const ultimoStatus = atendimentosWorkshop[0].status_cliente;
        if (counts.hasOwnProperty(ultimoStatus)) {
          counts[ultimoStatus]++;
        }
      }
    });

    return counts;
  };

  const counts = getStatusCounts();

  const statusConfig = {
    crescente: { label: 'Crescente', color: 'bg-green-100 text-green-700', icon: TrendingUp },
    decrescente: { label: 'Decrescente', color: 'bg-red-100 text-red-700', icon: TrendingDown },
    estagnado: { label: 'Estagnado', color: 'bg-yellow-100 text-yellow-700', icon: Minus },
    nao_responde: { label: 'Não Responde', color: 'bg-gray-100 text-gray-700', icon: AlertCircle }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Status dos Clientes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(statusConfig).map(([key, config]) => {
            const Icon = config.icon;
            const clientesStatus = getClientesPorStatus(key);
            
            return (
              <div 
                key={key} 
                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
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
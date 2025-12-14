import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertCircle, Calendar, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusConfig = {
  a_fazer: { 
    icon: Clock, 
    label: "A Fazer", 
    cor: "bg-gray-100 text-gray-700 border-gray-300" 
  },
  em_andamento: { 
    icon: AlertCircle, 
    label: "Em Andamento", 
    cor: "bg-yellow-100 text-yellow-700 border-yellow-300" 
  },
  concluido: { 
    icon: CheckCircle, 
    label: "Concluído", 
    cor: "bg-green-100 text-green-700 border-green-300" 
  }
};

export default function AtividadesImplementacao({ items, workshop }) {
  const navigate = useNavigate();

  if (!workshop) return null;

  const itemsPorStatus = {
    a_fazer: items?.filter(i => i.status === 'a_fazer') || [],
    em_andamento: items?.filter(i => i.status === 'em_andamento') || [],
    concluido: items?.filter(i => i.status === 'concluido') || []
  };

  const totalItems = items?.length || 0;
  const progressoPercentual = totalItems > 0 
    ? Math.round((itemsPorStatus.concluido.length / totalItems) * 100)
    : 0;

  const calcularDiasRestantes = (dataTermino) => {
    if (!dataTermino) return null;
    const hoje = new Date();
    const termino = new Date(dataTermino);
    const diff = Math.ceil((termino - hoje) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Atividades de Implementação
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(createPageUrl("CronogramaImplementacao"))}
          >
            Ver Tudo
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barra de Progresso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progresso Geral</span>
            <span className="font-bold text-blue-600">{progressoPercentual}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressoPercentual}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="font-bold text-gray-600">{itemsPorStatus.a_fazer.length}</p>
              <p className="text-gray-500">A Fazer</p>
            </div>
            <div>
              <p className="font-bold text-yellow-600">{itemsPorStatus.em_andamento.length}</p>
              <p className="text-gray-500">Em Andamento</p>
            </div>
            <div>
              <p className="font-bold text-green-600">{itemsPorStatus.concluido.length}</p>
              <p className="text-gray-500">Concluídos</p>
            </div>
          </div>
        </div>

        {/* Lista de Atividades Pendentes */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Próximas Atividades</h4>
          {totalItems === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma atividade cadastrada ainda</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {[...itemsPorStatus.em_andamento, ...itemsPorStatus.a_fazer]
                .slice(0, 10)
                .map((item) => {
                  const config = statusConfig[item.status];
                  const Icon = config.icon;
                  const diasRestantes = calcularDiasRestantes(item.data_termino_previsto);
                  const atrasado = diasRestantes !== null && diasRestantes < 0;

                  return (
                    <div 
                      key={item.id} 
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        atrasado ? 'text-red-500' : config.cor.split(' ')[1].replace('text-', 'text-')
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {item.item_nome}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-xs ${config.cor} border`}>
                            {config.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {item.item_tipo}
                          </Badge>
                        </div>
                        {item.data_termino_previsto && (
                          <p className={`text-xs mt-1 ${atrasado ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                            {atrasado 
                              ? `Atrasado em ${Math.abs(diasRestantes)} dias` 
                              : `Prazo: ${Math.abs(diasRestantes)} dias`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
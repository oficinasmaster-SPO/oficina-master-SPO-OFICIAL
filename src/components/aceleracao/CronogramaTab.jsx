import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function CronogramaTab({ workshopId }) {
  const { data: cronograma = [], isLoading } = useQuery({
    queryKey: ['cronograma-implementacao', workshopId],
    queryFn: () =>
      base44.entities.CronogramaImplementacao.filter(
        { workshop_id: workshopId },
        'ordem'
      ),
    enabled: !!workshopId,
    staleTime: 2 * 60 * 1000,
  });

  const STATUS_COLOR = {
    a_fazer:      "bg-gray-100 text-gray-800",
    em_andamento: "bg-blue-100 text-blue-800",
    concluido:    "bg-green-100 text-green-800",
  };

  const STATUS_LABEL = {
    a_fazer:      "A fazer",
    em_andamento: "Em andamento",
    concluido:    "Concluído",
  };

  const getIcon = (status) => {
    if (status === 'concluido')    return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (status === 'em_andamento') return <Clock className="w-4 h-4 text-blue-600" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const progresso = cronograma.length === 0
    ? 0
    : Math.round((cronograma.filter(i => i.status === 'concluido').length / cronograma.length) * 100);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
        <p className="text-gray-500 mt-3 text-sm">Carregando cronograma...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progresso Geral */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Progresso do Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Progresso Total</span>
              <span className="font-semibold">{progresso}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{cronograma.filter(i => i.status === 'concluido').length} concluídos</span>
              <span>{cronograma.filter(i => i.status === 'em_andamento').length} em andamento</span>
              <span>{cronograma.filter(i => i.status === 'a_fazer').length} a fazer</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de itens */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Itens do Cronograma</CardTitle>
        </CardHeader>
        <CardContent>
          {cronograma.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Nenhum cronograma gerado ainda.</p>
              <p className="text-xs mt-1">Será criado automaticamente após a ativação do plano.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cronograma.map((item, index) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-3 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex-shrink-0">{getIcon(item.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {index + 1}. {item.item_nome}
                        </span>
                        {item.fase && (
                          <Badge variant="outline" className="text-[10px]">{item.fase}</Badge>
                        )}
                      </div>
                      <Badge className={`text-xs ${STATUS_COLOR[item.status] || STATUS_COLOR.a_fazer}`}>
                        {STATUS_LABEL[item.status] || item.status}
                      </Badge>

                      {item.progresso_percentual > 0 && item.status === 'em_andamento' && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progresso</span>
                            <span>{item.progresso_percentual}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${item.progresso_percentual}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                        {item.data_inicio_real && (
                          <div>
                            <span className="font-medium">Iniciado:</span>{" "}
                            {new Date(item.data_inicio_real).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                        {item.data_termino_previsto && (
                          <div>
                            <span className="font-medium">Prev. conclusão:</span>{" "}
                            {new Date(item.data_termino_previsto).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                        {item.data_termino_real && (
                          <div>
                            <span className="font-medium">Concluído em:</span>{" "}
                            {new Date(item.data_termino_real).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>

                      {item.observacoes && (
                        <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">{item.observacoes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
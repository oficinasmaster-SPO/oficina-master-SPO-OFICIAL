import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function CronogramaTab({ workshop }) {
  const { data: cronograma = [], isLoading } = useQuery({
    queryKey: ['cronograma-progresso', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      
      return await base44.entities.CronogramaProgresso.filter(
        { workshop_id: workshop.id },
        'ordem'
      );
    },
    enabled: !!workshop?.id
  });

  const getSituacaoColor = (situacao) => {
    const colors = {
      nao_iniciado: "bg-gray-100 text-gray-800",
      em_andamento: "bg-blue-100 text-blue-800",
      concluido: "bg-green-100 text-green-800",
      cancelado: "bg-red-100 text-red-800",
      atrasado: "bg-orange-100 text-orange-800"
    };
    return colors[situacao] || "bg-gray-100 text-gray-800";
  };

  const getSituacaoIcon = (situacao) => {
    switch (situacao) {
      case 'concluido':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'em_andamento':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'atrasado':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const calcularProgresso = () => {
    if (cronograma.length === 0) return 0;
    const concluidos = cronograma.filter(m => m.situacao === 'concluido').length;
    return Math.round((concluidos / cronograma.length) * 100);
  };

  const progresso = calcularProgresso();

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Carregando cronograma...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progresso Geral */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso do Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progresso Total</span>
              <span className="font-semibold">{progresso}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>{cronograma.filter(m => m.situacao === 'concluido').length} concluídos</span>
              <span>{cronograma.filter(m => m.situacao === 'em_andamento').length} em andamento</span>
              <span>{cronograma.filter(m => m.situacao === 'nao_iniciado').length} não iniciados</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Módulos */}
      <Card>
        <CardHeader>
          <CardTitle>Módulos do Cronograma</CardTitle>
        </CardHeader>
        <CardContent>
          {cronograma.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum cronograma gerado ainda.</p>
              <p className="text-sm mt-2">O cronograma será criado automaticamente após o diagnóstico.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cronograma.map((modulo, index) => (
                <div
                  key={modulo.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {getSituacaoIcon(modulo.situacao)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">
                            {index + 1}. {modulo.modulo_nome}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {modulo.modulo_codigo}
                          </Badge>
                        </div>
                        
                        <Badge className={getSituacaoColor(modulo.situacao)}>
                          {modulo.situacao?.replace(/_/g, ' ')}
                        </Badge>

                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-600">
                          <div>
                            <span className="font-medium">Previsto:</span>{" "}
                            {modulo.data_inicio_previsto ? 
                              new Date(modulo.data_inicio_previsto).toLocaleDateString('pt-BR') : 
                              '-'
                            }
                          </div>
                          <div>
                            <span className="font-medium">Conclusão prevista:</span>{" "}
                            {modulo.data_conclusao_previsto ? 
                              new Date(modulo.data_conclusao_previsto).toLocaleDateString('pt-BR') : 
                              '-'
                            }
                          </div>
                        </div>

                        {modulo.situacao === 'em_andamento' && (
                          <div className="mt-2">
                            <div className="text-xs text-gray-600 mb-1">
                              Progresso: {modulo.atividades_realizadas || 0}/{modulo.atividades_previstas || 0} atividades
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${modulo.atividades_previstas > 0 
                                    ? (modulo.atividades_realizadas / modulo.atividades_previstas) * 100 
                                    : 0}%`
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
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
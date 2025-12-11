import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ExternalLink, Star, CheckCircle, Clock, AlertTriangle, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function ClienteDetalhesPanel({ cliente, progressos, onClose, onAvaliar }) {
  const navigate = useNavigate();

  const { data: atendimentos } = useQuery({
    queryKey: ['atendimentos-cliente', cliente.id],
    queryFn: async () => {
      return await base44.entities.ConsultoriaAtendimento.filter(
        { workshop_id: cliente.id },
        '-data_agendada',
        5
      );
    }
  });

  const getSituacaoIcon = (situacao) => {
    const icons = {
      nao_iniciado: <Clock className="w-4 h-4 text-gray-500" />,
      em_andamento: <AlertTriangle className="w-4 h-4 text-orange-500" />,
      concluido: <CheckCircle className="w-4 h-4 text-green-500" />,
      atrasado: <AlertTriangle className="w-4 h-4 text-red-500" />
    };
    return icons[situacao] || icons.nao_iniciado;
  };

  const getSituacaoColor = (situacao) => {
    const colors = {
      nao_iniciado: "bg-gray-100 text-gray-800",
      em_andamento: "bg-orange-100 text-orange-800",
      concluido: "bg-green-100 text-green-800",
      atrasado: "bg-red-100 text-red-800"
    };
    return colors[situacao] || colors.nao_iniciado;
  };

  const todosProcessosConcluidos = progressos.length > 0 && progressos.every(p => p.situacao === 'concluido');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-end z-50 p-4">
      <div className="bg-white w-full max-w-2xl h-full rounded-l-lg shadow-2xl overflow-auto">
        <div className="sticky top-0 bg-white border-b z-10 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{cliente.name}</h2>
              <p className="text-gray-600">{cliente.city} - {cliente.state}</p>
              <Badge className="mt-2 bg-blue-100 text-blue-800">
                Plano {cliente.planoAtual}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status dos Processos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Processos do Plano</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {progressos.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Nenhum processo iniciado ainda
                  </p>
                ) : (
                  progressos.map((processo) => (
                    <div 
                      key={processo.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getSituacaoIcon(processo.situacao)}
                        <div>
                          <p className="font-medium text-sm">{processo.modulo_nome}</p>
                          <p className="text-xs text-gray-600">
                            {processo.atividades_realizadas}/{processo.atividades_previstas} atividades
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getSituacaoColor(processo.situacao)}>
                          {processo.situacao.replace(/_/g, ' ')}
                        </Badge>
                        {processo.situacao === 'concluido' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAvaliar(processo)}
                          >
                            <Star className="w-4 h-4 mr-1" />
                            Avaliar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Próximas Reuniões */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Próximas Reuniões
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!atendimentos || atendimentos.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhuma reunião agendada</p>
              ) : (
                <div className="space-y-2">
                  {atendimentos.slice(0, 3).map((atend) => (
                    <div key={atend.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="text-sm font-medium">{atend.tipo_atendimento}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(atend.data_agendada).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">
                        {atend.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex gap-3">
            <Button
              onClick={() => navigate(createPageUrl('GestaoOficina'))}
              variant="outline"
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver Cliente Completo
            </Button>
            {todosProcessosConcluidos && (
              <Button
                onClick={() => {/* Avaliar entrega completa */}}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Star className="w-4 h-4 mr-2" />
                Avaliar Entrega
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
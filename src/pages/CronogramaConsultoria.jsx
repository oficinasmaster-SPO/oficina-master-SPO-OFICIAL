import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, FileText, Star, Eye, Download, Users, Target } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactMarkdown from "react-markdown";

export default function CronogramaConsultoria() {
  const navigate = useNavigate();
  const [selectedAtendimento, setSelectedAtendimento] = useState(null);
  const [showAta, setShowAta] = useState(false);

  // Carregar usuário e workshop
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshop } = useQuery({
    queryKey: ['workshop', user?.workshop_id],
    queryFn: () => base44.entities.Workshop.get(user.workshop_id),
    enabled: !!user?.workshop_id
  });

  // Carregar atendimentos
  const { data: atendimentos, isLoading } = useQuery({
    queryKey: ['consultoria-atendimentos', user?.workshop_id],
    queryFn: async () => {
      if (user?.role === 'admin') {
        return await base44.entities.ConsultoriaAtendimento.list('-data_agendada');
      } else {
        return await base44.entities.ConsultoriaAtendimento.filter({ 
          workshop_id: user.workshop_id 
        }, '-data_agendada');
      }
    },
    enabled: !!user
  });

  const getStatusColor = (status) => {
    const colors = {
      agendado: "bg-blue-100 text-blue-800",
      confirmado: "bg-green-100 text-green-800",
      realizado: "bg-gray-100 text-gray-800",
      cancelado: "bg-red-100 text-red-800",
      remarcado: "bg-yellow-100 text-yellow-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      diagnostico_inicial: "Diagnóstico Inicial",
      acompanhamento_mensal: "Acompanhamento Mensal",
      reuniao_estrategica: "Reunião Estratégica",
      treinamento: "Treinamento",
      auditoria: "Auditoria",
      revisao_metas: "Revisão de Metas",
      outros: "Outros"
    };
    return labels[tipo] || tipo;
  };

  const handleDownloadAta = async (atendimento) => {
    if (!atendimento.ata_ia) return;
    
    const blob = new Blob([atendimento.ata_ia], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ata_${format(new Date(atendimento.data_realizada || atendimento.data_agendada), 'yyyy-MM-dd')}.md`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando cronograma...</p>
        </div>
      </div>
    );
  }

  const proximosAtendimentos = atendimentos?.filter(a => 
    ['agendado', 'confirmado'].includes(a.status)
  ) || [];

  const atendimentosRealizados = atendimentos?.filter(a => 
    a.status === 'realizado'
  ) || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            Cronograma de Consultoria
          </h1>
          <p className="text-gray-600 mt-2">
            Acompanhe seus atendimentos e acesse as atas das reuniões
          </p>
        </div>

        {user?.role === 'admin' && (
          <Button
            onClick={() => navigate(createPageUrl('RegistrarAtendimento'))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Registrar Atendimento
          </Button>
        )}
      </div>

      {/* Informações do Plano */}
      {workshop && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Plano Atual</p>
                <p className="text-2xl font-bold text-blue-900">{workshop.planoAtual || 'FREE'}</p>
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Fase da Oficina</p>
                <p className="text-2xl font-bold text-blue-900">Fase {workshop.maturity_level || 1}</p>
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Atendimentos Realizados</p>
                <p className="text-2xl font-bold text-blue-900">{atendimentosRealizados.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Próximos Atendimentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Próximos Atendimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {proximosAtendimentos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Nenhum atendimento agendado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {proximosAtendimentos.map((atendimento) => (
                <div
                  key={atendimento.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getStatusColor(atendimento.status)}>
                          {atendimento.status}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {getTipoLabel(atendimento.tipo_atendimento)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(atendimento.data_agendada), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          {format(new Date(atendimento.data_agendada), "HH:mm")} - {atendimento.duracao_minutos}min
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          {atendimento.consultor_nome || 'Consultor'}
                        </div>
                        {atendimento.participantes?.length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Users className="w-4 h-4" />
                            {atendimento.participantes.length} participante(s)
                          </div>
                        )}
                      </div>

                      {atendimento.objetivos && atendimento.objetivos.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
                            <Target className="w-4 h-4" />
                            Objetivos:
                          </p>
                          <ul className="text-sm text-gray-600 ml-6 list-disc">
                            {atendimento.objetivos.slice(0, 2).map((obj, idx) => (
                              <li key={idx}>{obj}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Atendimentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            Histórico de Atendimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {atendimentosRealizados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Nenhum atendimento realizado ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {atendimentosRealizados.map((atendimento) => (
                <div
                  key={atendimento.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className="bg-green-100 text-green-800">
                          Realizado
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {getTipoLabel(atendimento.tipo_atendimento)}
                        </span>
                        {atendimento.ata_ia && (
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            <FileText className="w-3 h-3 mr-1" />
                            Ata Disponível
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(atendimento.data_realizada), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          {atendimento.consultor_nome || 'Consultor'}
                        </div>
                      </div>

                      {atendimento.avaliacao_cliente?.nota && (
                        <div className="mt-3 flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-medium">
                            Avaliação: {atendimento.avaliacao_cliente.nota}/5
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {atendimento.ata_ia && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAtendimento(atendimento);
                              setShowAta(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Ata
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadAta(atendimento)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {atendimento.avaliacao_cliente && (
                        <div className="text-xs text-gray-600">
                          <Star className="w-4 h-4 inline text-yellow-500 fill-yellow-500" />
                          {' '}{atendimento.avaliacao_cliente.nota}/5
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Ata */}
      {showAta && selectedAtendimento && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Ata da Reunião</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAta(false)}
                >
                  ✕
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                {format(new Date(selectedAtendimento.data_realizada), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="prose max-w-none">
                <ReactMarkdown>{selectedAtendimento.ata_ia}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
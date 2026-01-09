import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function VisualizarAtaPublica() {
  const [ata, setAta] = useState(null);
  const [atendimento, setAtendimento] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const ataId = urlParams.get('ata_id');
      const workshopId = urlParams.get('workshop_id');

      if (!ataId) {
        setError('ID da ATA não fornecido');
        setLoading(false);
        return;
      }

      // Buscar ATA
      const atas = await base44.entities.MeetingMinutes.filter({ id: ataId });
      if (!atas || atas.length === 0) {
        setError('ATA não encontrada');
        setLoading(false);
        return;
      }

      const ataData = atas[0];
      setAta(ataData);

      // Buscar atendimento
      if (ataData.atendimento_id) {
        const atendimentos = await base44.entities.ConsultoriaAtendimento.filter({ 
          id: ataData.atendimento_id 
        });
        if (atendimentos && atendimentos.length > 0) {
          setAtendimento(atendimentos[0]);
        }
      }

      // Buscar workshop
      if (ataData.workshop_id) {
        const workshops = await base44.entities.Workshop.filter({ 
          id: ataData.workshop_id 
        });
        if (workshops && workshops.length > 0) {
          setWorkshop(workshops[0]);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar ATA:', err);
      setError('Erro ao carregar a ATA. Tente recarregar a página.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando ATA...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50 p-4">
        <Card className="max-w-md w-full border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Erro</h3>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ata) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">ATA não encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6 shadow-lg border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">
                  📋 ATA de Atendimento
                </CardTitle>
                <p className="text-blue-100">{ata.code || 'ATA'}</p>
              </div>
              <Badge className="bg-green-500 text-white">
                {ata.status === 'finalizada' ? '✓ Finalizada' : 'Rascunho'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Data da Reunião</p>
                <p className="font-semibold text-gray-900">
                  {ata.meeting_date && format(new Date(ata.meeting_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Hora</p>
                <p className="font-semibold text-gray-900">{ata.meeting_time}</p>
              </div>
              {workshop && (
                <div>
                  <p className="text-sm text-gray-600">Oficina</p>
                  <p className="font-semibold text-gray-900">{workshop.name}</p>
                </div>
              )}
              {ata.consultor_name && (
                <div>
                  <p className="text-sm text-gray-600">Consultor/Acelerador</p>
                  <p className="font-semibold text-gray-900">{ata.consultor_name}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo da ATA */}
        <div className="space-y-6">
          {/* Participantes */}
          {ata.participantes && ata.participantes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">👥 Participantes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {ata.participantes.map((p, i) => (
                    <li key={i} className="flex items-start gap-3 pb-2 border-b last:border-b-0">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="text-sm text-gray-600">{p.role}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Pautas */}
          {ata.pautas && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📋 Temas Tratados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{ata.pautas}</p>
              </CardContent>
            </Card>
          )}

          {/* Objetivo e Resumo */}
          {ata.ai_summary?.resumo_executivo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📌 Resumo Executivo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{ata.ai_summary.resumo_executivo}</p>
              </CardContent>
            </Card>
          )}

          {/* Próximos Passos */}
          {ata.proximos_passos && ata.proximos_passos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🎯 Próximos Passos</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {ata.proximos_passos.map((passo, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{passo.descricao}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Responsável: <strong>{passo.responsavel}</strong>
                        </p>
                        {passo.prazo && (
                          <p className="text-sm text-gray-600">
                            Prazo: <strong>{format(new Date(passo.prazo), "dd/MM/yyyy")}</strong>
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Processos Vinculados */}
          {ata.processos_vinculados && ata.processos_vinculados.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📁 Processos Relacionados</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {ata.processos_vinculados.map((proc, i) => (
                    <li key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                      <span className="text-blue-600">•</span>
                      <div>
                        <p className="font-medium text-gray-900">{proc.titulo}</p>
                        <p className="text-sm text-gray-600">{proc.categoria}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recomendações da IA */}
          {ata.ai_summary?.recomendacoes && ata.ai_summary.recomendacoes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">💡 Recomendações</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {ata.ai_summary.recomendacoes.map((rec, i) => (
                    <li key={i} className="flex gap-2 text-gray-700">
                      <span className="text-yellow-500">⭐</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-600 text-sm">
          <p>Oficinas Master - Acelerando seu Crescimento</p>
          <p className="mt-1">Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
        </div>
      </div>
    </div>
  );
}
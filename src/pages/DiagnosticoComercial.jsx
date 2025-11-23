import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Award, Mic } from "lucide-react";
import AudioRecorder from "@/components/audio/AudioRecorder";

export default function DiagnosticoComercial() {
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [selectedType, setSelectedType] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    
    const workshops = await base44.entities.Workshop.list();
    const userWorkshop = workshops.find(w => w.owner_id === currentUser.id) || workshops[0];
    setWorkshop(userWorkshop);
  };

  const { data: diagnostics = [], isLoading } = useQuery({
    queryKey: ['commercial-diagnostics', workshop?.id],
    queryFn: () => base44.entities.CommercialDiagnostic.list('-created_date'),
    enabled: !!workshop
  });

  const diagnosticTypes = [
    { value: "prospeccao", label: "Prospecção", description: "Como está captando novos clientes" },
    { value: "qualificacao_leads", label: "Qualificação de Leads", description: "Processo de qualificação" },
    { value: "funil_vendas", label: "Funil de Vendas", description: "Gestão do funil comercial" },
    { value: "conversao", label: "Conversão", description: "Taxa de fechamento" },
    { value: "pos_venda", label: "Pós-Venda", description: "Acompanhamento e fidelização" },
    { value: "relacionamento_cliente", label: "Relacionamento", description: "Gestão do relacionamento" }
  ];

  const handleAudioRecorded = (url, duration) => {
    setAudioUrl(url);
  };

  const processDiagnostic = async () => {
    if (!selectedType || !audioUrl) {
      alert('Selecione o tipo de diagnóstico e grave um áudio');
      return;
    }

    setIsProcessing(true);
    try {
      const diagnosticData = {
        workshop_id: workshop.id,
        user_id: user.id,
        diagnostic_type: selectedType,
        audio_url: audioUrl
      };

      const diagnostic = await base44.entities.CommercialDiagnostic.create(diagnosticData);

      const evaluation = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um especialista em vendas e diagnóstico comercial. Analise o áudio sobre "${diagnosticTypes.find(t => t.value === selectedType)?.label}" e forneça uma avaliação detalhada com notas de 0 a 10 para: prospecção, qualificação, apresentação, fechamento e pós-venda. Identifique 3-5 pontos fortes, 3-5 pontos fracos e 5-7 recomendações práticas.`,
        response_json_schema: {
          type: "object",
          properties: {
            scores: {
              type: "object",
              properties: {
                prospeccao: { type: "number" },
                qualificacao: { type: "number" },
                apresentacao: { type: "number" },
                fechamento: { type: "number" },
                pos_venda: { type: "number" }
              }
            },
            average_score: { type: "number" },
            strengths: { type: "array", items: { type: "string" } },
            weaknesses: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });

      await base44.entities.CommercialDiagnostic.update(diagnostic.id, {
        scores: evaluation.scores,
        average_score: evaluation.average_score,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        recommendations: evaluation.recommendations,
        transcription: "Áudio processado",
        completed: true
      });

      setCurrentResult({ ...diagnostic, ...evaluation });
      setAudioUrl(null);
      setSelectedType("");
    } catch (error) {
      console.error('Erro ao processar:', error);
      alert('Erro ao processar diagnóstico. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user || !workshop) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const latestDiagnostic = diagnostics[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-10 h-10 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Diagnóstico Comercial</h1>
            <p className="text-gray-600">Avalie e melhore seus processos comerciais com IA</p>
          </div>
        </div>

        {latestDiagnostic?.average_score && (
          <Card className="shadow-lg bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Award className="w-12 h-12 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Último Diagnóstico</p>
                    <p className="text-3xl font-bold text-green-600">
                      {latestDiagnostic.average_score.toFixed(1)}/10
                    </p>
                  </div>
                </div>
                <Badge className="text-lg px-4 py-2">
                  {diagnosticTypes.find(t => t.value === latestDiagnostic.diagnostic_type)?.label}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Novo Diagnóstico</CardTitle>
            <CardDescription>Grave um áudio descrevendo seus processos comerciais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de diagnóstico..." />
              </SelectTrigger>
              <SelectContent>
                {diagnosticTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedType && (
              <>
                <AudioRecorder onAudioRecorded={handleAudioRecorded} />
                
                <Button
                  onClick={processDiagnostic}
                  disabled={!audioUrl || isProcessing}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 mr-2" />
                      Processar Diagnóstico
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {currentResult && (
          <Card className="shadow-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
            <CardHeader>
              <CardTitle>Resultado do Diagnóstico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(currentResult.scores || {}).map(([key, value]) => (
                  <div key={key} className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <p className="text-xs text-gray-600 mb-1 capitalize">
                      {key.replace('_', ' ')}
                    </p>
                    <p className="text-2xl font-bold text-blue-600">{value}/10</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-green-900 mb-2">✅ Pontos Fortes:</h3>
                  <ul className="space-y-1">
                    {currentResult.strengths?.map((strength, idx) => (
                      <li key={idx} className="text-sm text-gray-700">• {strength}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-red-900 mb-2">⚠️ Pontos Fracos:</h3>
                  <ul className="space-y-1">
                    {currentResult.weaknesses?.map((weakness, idx) => (
                      <li key={idx} className="text-sm text-gray-700">• {weakness}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">💡 Recomendações:</h3>
                  <ul className="space-y-1">
                    {currentResult.recommendations?.map((rec, idx) => (
                      <li key={idx} className="text-sm text-gray-700">• {rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {diagnostics.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Histórico de Diagnósticos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {diagnostics.map(diag => (
                  <div key={diag.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">
                        {diagnosticTypes.find(t => t.value === diag.diagnostic_type)?.label}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(diag.created_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    {diag.average_score && (
                      <Badge variant={diag.average_score >= 7 ? "default" : "secondary"}>
                        {diag.average_score.toFixed(1)}/10
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
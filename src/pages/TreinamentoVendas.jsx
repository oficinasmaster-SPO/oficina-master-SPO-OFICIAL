import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Award, TrendingUp, MessageSquare, Mic, History, Loader2 } from "lucide-react";
import AudioRecorder from "@/components/audio/AudioRecorder";

export default function TreinamentoVendas() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState("");
  const [textInput, setTextInput] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState(null);

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

  const { data: trainings = [], isLoading } = useQuery({
    queryKey: ['sales-trainings', user?.id],
    queryFn: () => base44.entities.SalesTraining.list('-created_date'),
    enabled: !!user
  });

  const scenarios = [
    { value: "objecao_preco", label: "Objeção de Preço", description: "Cliente acha que o serviço está caro" },
    { value: "cliente_indeciso", label: "Cliente Indeciso", description: "Cliente não consegue decidir sobre o serviço" },
    { value: "reclamacao_servico", label: "Reclamação de Serviço", description: "Cliente insatisfeito com serviço anterior" },
    { value: "venda_servico_adicional", label: "Venda de Serviço Adicional", description: "Oferecer serviços extras durante atendimento" },
    { value: "negociacao_desconto", label: "Negociação de Desconto", description: "Cliente pedindo desconto" },
    { value: "fechamento_venda", label: "Fechamento de Venda", description: "Finalizar a venda com sucesso" },
    { value: "prospeccao_cliente", label: "Prospecção de Cliente", description: "Primeiro contato com potencial cliente" },
    { value: "pos_venda", label: "Pós-Venda", description: "Acompanhamento após o serviço" }
  ];

  const handleAudioRecorded = async (url, duration) => {
    setAudioUrl(url);
  };

  const evaluateTraining = async () => {
    if (!selectedScenario || (!audioUrl && !textInput)) {
      alert('Selecione um cenário e forneça áudio ou texto para avaliação');
      return;
    }

    setIsEvaluating(true);
    try {
      const trainingData = {
        user_id: user.id,
        workshop_id: workshop?.id,
        scenario_type: selectedScenario,
        audio_url: audioUrl,
        duration_seconds: 0
      };

      const training = await base44.entities.SalesTraining.create(trainingData);

      const content = textInput || `Avaliar interação de vendas para o cenário: ${scenarios.find(s => s.value === selectedScenario)?.label}. Áudio disponível em: ${audioUrl}`;
      
      const evaluation = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um coach de vendas. Avalie a seguinte interação de vendas no cenário "${scenarios.find(s => s.value === selectedScenario)?.label}":

${content}

Forneça uma avaliação estruturada com:
1. Nota de 0 a 10
2. Pontos fortes (3-5 itens)
3. Pontos de melhoria (3-5 itens)
4. Feedback detalhado
5. Resposta sugerida ideal para esse cenário`,
        response_json_schema: {
          type: "object",
          properties: {
            score: { type: "number" },
            strengths: { type: "array", items: { type: "string" } },
            improvements: { type: "array", items: { type: "string" } },
            feedback: { type: "string" },
            suggested_response: { type: "string" }
          }
        }
      });

      await base44.entities.SalesTraining.update(training.id, {
        ai_evaluation: evaluation,
        transcription: textInput || "Áudio enviado",
        completed: true
      });

      setCurrentEvaluation({ ...training, ai_evaluation: evaluation });
      queryClient.invalidateQueries(['sales-trainings']);
      
      setTextInput("");
      setAudioUrl(null);
      setSelectedScenario("");
    } catch (error) {
      console.error('Erro ao avaliar:', error);
      alert('Erro ao processar avaliação. Tente novamente.');
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const avgScore = trainings.length > 0
    ? trainings.reduce((sum, t) => sum + (t.ai_evaluation?.score || 0), 0) / trainings.length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-10 h-10 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Treinamento de Vendas</h1>
            <p className="text-gray-600">Pratique cenários e receba feedback personalizado da IA</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-6 h-6 text-yellow-600" />
                <span className="text-sm text-gray-600">Média Geral</span>
              </div>
              <p className="text-3xl font-bold text-yellow-600">{avgScore.toFixed(1)}/10</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <span className="text-sm text-gray-600">Treinamentos</span>
              </div>
              <p className="text-3xl font-bold text-green-600">{trainings.length}</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Mic className="w-6 h-6 text-blue-600" />
                <span className="text-sm text-gray-600">Com Áudio</span>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {trainings.filter(t => t.audio_url).length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="novo" className="space-y-6">
          <TabsList className="bg-white shadow-md">
            <TabsTrigger value="novo">🎯 Novo Treinamento</TabsTrigger>
            <TabsTrigger value="historico">📊 Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="novo" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Selecione o Cenário</CardTitle>
                <CardDescription>Escolha a situação que deseja praticar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um cenário..." />
                  </SelectTrigger>
                  <SelectContent>
                    {scenarios.map(scenario => (
                      <SelectItem key={scenario.value} value={scenario.value}>
                        {scenario.label} - {scenario.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedScenario && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-900">
                      {scenarios.find(s => s.value === selectedScenario)?.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Grave sua Interação
                </CardTitle>
                <CardDescription>Grave ou digite como você lidaria com esse cenário</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <AudioRecorder 
                  onAudioRecorded={handleAudioRecorded}
                  disabled={!selectedScenario}
                />

                <div className="text-center text-gray-500 text-sm">ou</div>

                <Textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Digite sua resposta para o cenário..."
                  rows={6}
                  disabled={!selectedScenario}
                />

                <Button
                  onClick={evaluateTraining}
                  disabled={!selectedScenario || (!audioUrl && !textInput) || isEvaluating}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Avaliando...
                    </>
                  ) : (
                    'Avaliar Interação'
                  )}
                </Button>
              </CardContent>
            </Card>

            {currentEvaluation?.ai_evaluation && (
              <Card className="shadow-lg border-2 border-green-200 bg-gradient-to-br from-green-50 to-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-6 h-6 text-green-600" />
                    Resultado da Avaliação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                    <span className="font-semibold">Nota:</span>
                    <span className="text-3xl font-bold text-green-600">
                      {currentEvaluation.ai_evaluation.score}/10
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-green-900 mb-2">✅ Pontos Fortes:</h3>
                    <ul className="space-y-1">
                      {currentEvaluation.ai_evaluation.strengths?.map((strength, idx) => (
                        <li key={idx} className="text-sm text-gray-700">• {strength}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-orange-900 mb-2">🎯 Pontos de Melhoria:</h3>
                    <ul className="space-y-1">
                      {currentEvaluation.ai_evaluation.improvements?.map((improvement, idx) => (
                        <li key={idx} className="text-sm text-gray-700">• {improvement}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">💬 Feedback:</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {currentEvaluation.ai_evaluation.feedback}
                    </p>
                  </div>

                  {currentEvaluation.ai_evaluation.suggested_response && (
                    <div>
                      <h3 className="font-semibold text-purple-900 mb-2">💡 Resposta Sugerida:</h3>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap bg-purple-50 p-3 rounded-lg">
                        {currentEvaluation.ai_evaluation.suggested_response}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="historico" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : trainings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  Nenhum treinamento realizado ainda.
                </CardContent>
              </Card>
            ) : (
              trainings.map((training, idx) => (
                <Card key={training.id} className="shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {scenarios.find(s => s.value === training.scenario_type)?.label}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(training.created_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      {training.ai_evaluation?.score && (
                        <Badge className="text-lg px-3 py-1" variant={training.ai_evaluation.score >= 7 ? "default" : "secondary"}>
                          {training.ai_evaluation.score}/10
                        </Badge>
                      )}
                    </div>

                    {training.ai_evaluation && (
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="font-medium text-green-700">Pontos Fortes: </span>
                          <span className="text-gray-700">
                            {training.ai_evaluation.strengths?.slice(0, 2).join(', ')}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-orange-700">Melhorar: </span>
                          <span className="text-gray-700">
                            {training.ai_evaluation.improvements?.slice(0, 2).join(', ')}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
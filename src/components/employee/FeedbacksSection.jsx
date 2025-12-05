import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MessageSquare, ThumbsUp, ThumbsDown, Users, Wand2, Printer, Filter, Calendar, CheckCircle2, Clock, AlertCircle, Target } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FeedbacksSection({ employee }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showActionPlanModal, setShowActionPlanModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    type: "one_on_one",
    content: "",
    action_plan: "",
    action_plan_deadline: "",
    privacy: "privado_gestor"
  });
  
  // Filters
  const [filters, setFilters] = useState({
    type: "all",
    status: "all"
  });

  // Fetch Feedbacks from new entity
  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['employee-feedbacks', employee.id],
    queryFn: async () => {
      return await base44.entities.EmployeeFeedback.filter({ employee_id: employee.id }, '-created_date');
    },
    enabled: !!employee.id
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return await base44.entities.EmployeeFeedback.create({
        ...data,
        employee_id: employee.id,
        evaluator_id: user.id,
        workshop_id: employee.workshop_id,
        created_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      toast.success("Feedback registrado com sucesso!");
      setShowDialog(false);
      setFormData({ type: "one_on_one", content: "", action_plan: "", action_plan_deadline: "", privacy: "privado_gestor" });
      queryClient.invalidateQueries(['employee-feedbacks']);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.EmployeeFeedback.update(id, data);
    },
    onSuccess: () => {
      toast.success("Atualizado com sucesso!");
      setShowActionPlanModal(false);
      queryClient.invalidateQueries(['employee-feedbacks']);
    }
  });

  const handleAdd = () => {
    if (!formData.content.trim()) {
      toast.error("Digite o conteúdo do feedback");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdatePlan = (status) => {
    if (!selectedFeedback) return;
    updateMutation.mutate({
      id: selectedFeedback.id,
      data: { 
        action_plan_status: status,
        // Se quiser permitir editar texto também, pegaria de um state local do modal
      }
    });
  };

  const analyzeFeedbacks = async () => {
    setAnalyzing(true);
    setShowAnalysisModal(true);
    try {
      const feedbackTexts = filteredFeedbacks.slice(0, 10).map(f => 
        `- [${f.type}] (${format(new Date(f.created_at || new Date()), "dd/MM/yyyy")}): ${f.content.substring(0, 200)}...`
      ).join('\n');

      const prompt = `Analise este histórico de feedbacks do colaborador ${employee.full_name} (${employee.position}):
      
      ${feedbackTexts}
      
      Identifique:
      1. Padrões de comportamento (positivos e negativos)
      2. Sugestões de ações de reconhecimento (se mérito)
      3. Sugestões de ações de melhoria/correção (se necessário)
      4. Resumo geral do momento do colaborador.
      
      Retorne um JSON: { "patterns": "string", "recognition_suggestions": ["string"], "improvement_suggestions": ["string"], "summary": "string" }`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            patterns: { type: "string" },
            recognition_suggestions: { type: "array", items: { type: "string" } },
            improvement_suggestions: { type: "array", items: { type: "string" } },
            summary: { type: "string" }
          }
        }
      });
      
      setAnalysisResult(response);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao analisar feedbacks");
      setShowAnalysisModal(false);
    } finally {
      setAnalyzing(false);
    }
  };

  const generateWithAI = async () => {
    if (!formData.type) return;
    setGeneratingAI(true);
    try {
      const prompt = `Atue como um especialista em RH e liderança. Escreva um texto profissional de ${formData.type === 'positivo' ? 'FEEDBACK POSITIVO (Elogio)' : formData.type === 'negativo' ? 'FEEDBACK CORRETIVO (Construtivo)' : 'PAUTA DE REUNIÃO ONE-ON-ONE'} para:
      Colaborador: ${employee.full_name}
      Cargo: ${employee.position}
      
      ${formData.type === 'one_on_one' 
        ? 'Crie uma estrutura de ATA com: 1. Quebra-gelo, 2. Pontos de Pauta, 3. Espaço para anotações do colaborador, 4. Definição de Metas/Compromissos.' 
        : 'Use a técnica CNV (Comunicação Não Violenta): Observação, Sentimento, Necessidade e Pedido. Seja claro, direto e empático.'}
      
      Gere também uma sugestão curta de Plano de Ação.
      Formato JSON: { "content": "texto...", "action_plan": "plano..." }`;
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: { type: "object", properties: { content: {type: "string"}, action_plan: {type: "string"} } }
      });
      
      setFormData({ ...formData, content: response.content, action_plan: response.action_plan });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar com IA");
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleTypeChange = (value) => {
    let content = "";
    if (value === "one_on_one") {
      content = "**Pauta One-on-One**\n\n1. Como você está se sentindo no trabalho?\n2. Principais conquistas desde a última conversa:\n3. Desafios/Bloqueios encontrados:\n4. Feedback do Gestor:\n5. Plano de Ação/Metas para próxima semana:\n";
    }
    setFormData({ ...formData, type: value, content: content || formData.content });
  };

  const exportToPDF = async () => {
    toast.info("Funcionalidade em breve (migrando para novo sistema)");
    // Implementar depois adaptando para a nova estrutura
  };

  const filteredFeedbacks = feedbacks.filter(fb => {
    const typeMatch = filters.type === "all" || fb.type === filters.type;
    const statusMatch = filters.status === "all" || fb.action_plan_status === filters.status || (!fb.action_plan && filters.status === 'sem_plano');
    return typeMatch && statusMatch;
  });

  const feedbackConfig = {
    positivo: { icon: ThumbsUp, color: "border-green-200 bg-green-50", badge: "bg-green-100 text-green-800" },
    negativo: { icon: ThumbsDown, color: "border-red-200 bg-red-50", badge: "bg-red-100 text-red-800" },
    one_on_one: { icon: Users, color: "border-blue-200 bg-blue-50", badge: "bg-blue-100 text-blue-800" }
  };

  const statusConfig = {
    pendente: { label: "Pendente", icon: Clock, class: "bg-yellow-100 text-yellow-800" },
    em_andamento: { label: "Em Andamento", icon: Activity, class: "bg-blue-100 text-blue-800" },
    concluido: { label: "Concluído", icon: CheckCircle2, class: "bg-green-100 text-green-800" }
  };

  // Função auxiliar para o ícone de status, tratando undefined
  const Activity = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Feedbacks Contínuos e Planos de Ação
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <Printer className="w-4 h-4 mr-2" />
              Relatório
            </Button>
            <Button onClick={() => setShowDialog(true)} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Registro
            </Button>
            <Button onClick={analyzeFeedbacks} size="sm" variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200">
              <Wand2 className="w-4 h-4 mr-2" />
              Analisar com IA
            </Button>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4 flex-wrap">
          <div className="w-40">
            <Select value={filters.type} onValueChange={(v) => setFilters({...filters, type: v})}>
              <SelectTrigger className="h-8 bg-white">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="positivo">Positivo</SelectItem>
                <SelectItem value="negativo">Negativo</SelectItem>
                <SelectItem value="one_on_one">1:1</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
              <SelectTrigger className="h-8 bg-white">
                <SelectValue placeholder="Status Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="bg-slate-50/50 min-h-[400px]">
        {isLoading ? (
           <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Nenhum feedback registrado com estes filtros.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFeedbacks.map((feedback) => {
              const config = feedbackConfig[feedback.type] || feedbackConfig.one_on_one;
              const Icon = config.icon;
              const status = statusConfig[feedback.action_plan_status || 'pendente'];
              const StatusIcon = status.icon;

              return (
                <div key={feedback.id} className={`p-5 rounded-xl border transition-all hover:shadow-md bg-white`}>
                  {/* Header do Card */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.badge}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 capitalize">{feedback.type.replace('_', ' ')}</span>
                            <Badge variant="secondary" className="text-xs font-normal bg-gray-100 text-gray-600">
                                {feedback.created_at ? format(new Date(feedback.created_at), "dd 'de' MMMM", { locale: ptBR }) : '-'}
                            </Badge>
                        </div>
                        <p className="text-xs text-gray-500">Registrado por: {feedback.created_by || 'Gestor'}</p>
                      </div>
                    </div>
                    
                    {feedback.action_plan && (
                        <div className="flex items-center gap-2">
                            <Badge className={`${status.class} flex items-center gap-1`}>
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                            </Badge>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => { setSelectedFeedback(feedback); setShowActionPlanModal(true); }}
                            >
                                <Target className="w-4 h-4 text-gray-500" />
                            </Button>
                        </div>
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="pl-12">
                    <div className="text-sm text-gray-700 whitespace-pre-wrap bg-slate-50 p-3 rounded border border-slate-100 mb-3">
                        {feedback.content}
                    </div>

                    {/* Plano de Ação Section */}
                    {feedback.action_plan && (
                        <div className="mt-3 border-l-4 border-blue-400 pl-3 bg-blue-50/30 py-2 rounded-r">
                            <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm mb-1">
                                <Target className="w-4 h-4" />
                                Plano de Ação / Compromisso
                            </div>
                            <p className="text-sm text-gray-700">{feedback.action_plan}</p>
                            {feedback.action_plan_deadline && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Prazo: {format(new Date(feedback.action_plan_deadline), "dd/MM/yyyy")}
                                </p>
                            )}
                        </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Modal de Criação */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Registro de Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Tipo</Label>
                    <Select value={formData.type} onValueChange={handleTypeChange}>
                        <SelectTrigger>
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="positivo">Elogio / Positivo</SelectItem>
                        <SelectItem value="negativo">Corretivo / Negativo</SelectItem>
                        <SelectItem value="one_on_one">Reunião 1:1</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Visibilidade</Label>
                    <Select value={formData.privacy} onValueChange={v => setFormData({...formData, privacy: v})}>
                        <SelectTrigger>
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="privado_gestor">Privado (Apenas Gestores)</SelectItem>
                        <SelectItem value="publico_equipe">Público (Equipe)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <Label>Conteúdo da Conversa *</Label>
                <Button variant="ghost" size="xs" onClick={generateWithAI} disabled={generatingAI} className="text-purple-600 h-6 text-xs">
                  <Wand2 className="w-3 h-3 mr-1" />
                  {generatingAI ? "Gerando..." : "IA: Gerar Texto"}
                </Button>
              </div>
              <Textarea
                rows={6}
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder="Descreva o que foi conversado..."
                className="bg-slate-50"
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                <h4 className="font-semibold text-blue-900 text-sm flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Plano de Ação (Opcional)
                </h4>
                <div>
                    <Label className="text-xs">Ação Corretiva / Meta</Label>
                    <Textarea 
                        rows={2}
                        value={formData.action_plan}
                        onChange={(e) => setFormData({...formData, action_plan: e.target.value})}
                        placeholder="O que será feito para melhorar ou manter?"
                        className="bg-white text-sm"
                    />
                </div>
                <div>
                    <Label className="text-xs">Prazo Limite</Label>
                    <Input 
                        type="date" 
                        value={formData.action_plan_deadline}
                        onChange={(e) => setFormData({...formData, action_plan_deadline: e.target.value})}
                        className="bg-white w-full md:w-1/2"
                    />
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Registrar Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Análise IA */}
      <Dialog open={showAnalysisModal} onOpenChange={setShowAnalysisModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-600" />
              Análise de Feedbacks com IA
            </DialogTitle>
          </DialogHeader>
          
          {analyzing ? (
            <div className="py-12 text-center">
              <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">A IA está lendo o histórico e identificando padrões...</p>
            </div>
          ) : analysisResult ? (
            <div className="space-y-6 py-4">
              <div className="bg-slate-50 p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-900 mb-2">Resumo Geral</h4>
                <p className="text-gray-700 text-sm leading-relaxed">{analysisResult.summary}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4" /> Sugestões de Reconhecimento
                  </h4>
                  <ul className="space-y-2">
                    {analysisResult.recognition_suggestions?.map((item, i) => (
                      <li key={i} className="text-sm text-green-900 flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 mt-1 shrink-0" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                  <h4 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Oportunidades de Melhoria
                  </h4>
                  <ul className="space-y-2">
                    {analysisResult.improvement_suggestions?.map((item, i) => (
                      <li key={i} className="text-sm text-orange-900 flex items-start gap-2">
                        <Target className="w-3 h-3 mt-1 shrink-0" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="font-semibold text-blue-800 mb-2">Padrões Identificados</h4>
                <p className="text-sm text-blue-900">{analysisResult.patterns}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Modal de Atualização de Plano */}
      <Dialog open={showActionPlanModal} onOpenChange={setShowActionPlanModal}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Atualizar Plano de Ação</DialogTitle>
            </DialogHeader>
            {selectedFeedback && (
                <div className="space-y-4 py-4">
                    <div className="bg-slate-50 p-3 rounded text-sm mb-4 italic border-l-2 border-gray-300">
                        "{selectedFeedback.action_plan}"
                    </div>
                    <Label>Novo Status</Label>
                    <div className="flex flex-col gap-2">
                        <Button 
                            variant={selectedFeedback.action_plan_status === 'pendente' ? 'default' : 'outline'} 
                            className="justify-start"
                            onClick={() => handleUpdatePlan('pendente')}
                        >
                            <Clock className="w-4 h-4 mr-2 text-yellow-600" /> Pendente
                        </Button>
                        <Button 
                            variant={selectedFeedback.action_plan_status === 'em_andamento' ? 'default' : 'outline'} 
                            className="justify-start"
                            onClick={() => handleUpdatePlan('em_andamento')}
                        >
                            <Activity className="w-4 h-4 mr-2 text-blue-600" /> Em Andamento
                        </Button>
                        <Button 
                            variant={selectedFeedback.action_plan_status === 'concluido' ? 'default' : 'outline'} 
                            className="justify-start"
                            onClick={() => handleUpdatePlan('concluido')}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Concluído
                        </Button>
                    </div>
                </div>
            )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
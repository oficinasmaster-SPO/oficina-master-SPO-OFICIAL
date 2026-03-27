import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MessageSquare, ThumbsUp, ThumbsDown, Users, Wand2, Printer, Filter, Calendar, CheckCircle2, Clock, AlertCircle, Target, Activity, Mic, Mail, Loader2, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AudioRecorder from "@/components/audio/AudioRecorder";

export default function FeedbacksSection({ employee }) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [isManager, setIsManager] = useState(false);

  // Verificar se é gestor
  React.useEffect(() => {
    const checkRole = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        const employees = await base44.entities.Employee.filter({ user_id: user.id });
        const userEmployee = employees?.[0];
        
        const managerRoles = ['socio', 'diretor', 'supervisor_loja', 'gerente'];
        setIsManager(user.role === 'admin' || managerRoles.includes(userEmployee?.job_role));
      } catch (error) {
        console.error(error);
      }
    };
    checkRole();
  }, []);
  const [showDialog, setShowDialog] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showActionPlanModal, setShowActionPlanModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [processingAudio, setProcessingAudio] = useState(false);
  const [showContentRecorder, setShowContentRecorder] = useState(false);
  const [showActionPlanRecorder, setShowActionPlanRecorder] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    employee_id: employee?.id || "",
    type: "one_on_one",
    content: "",
    action_plan: "",
    action_plan_deadline: "",
    privacy: "privado_gestor"
  });
  
  // Filters
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    employee_id: "all"
  });

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFeedbackDetail, setSelectedFeedbackDetail] = useState(null);

  // Buscar todos colaboradores do workshop para seleção
  const { data: allEmployees = [] } = useQuery({
    queryKey: ['workshop-employees', employee?.workshop_id],
    queryFn: async () => {
      if (!employee?.workshop_id) return [];
      const result = await base44.entities.Employee.filter({ workshop_id: employee.workshop_id }, 'full_name');
      return Array.isArray(result) ? result : [];
    },
    enabled: !!employee?.workshop_id
  });

  // Fetch Feedbacks - busca feedbacks recebidos pelo colaborador
  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['employee-feedbacks', employee.id],
    queryFn: async () => {
      try {
        const allFeedbacks = await base44.entities.EmployeeFeedback.list();
        // Filtrar feedbacks onde o employee é o destinatário
        const received = allFeedbacks.filter(f => f.employee_id === employee.id);
        // Ordenar por data (mais recentes primeiro)
        return received.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      } catch (error) {
        console.error("Erro ao buscar feedbacks:", error);
        return [];
      }
    },
    enabled: !!employee.id
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      
      // Gerar custom_id sequencial (F001, F002, etc)
      const allFeedbacks = await base44.entities.EmployeeFeedback.filter({ workshop_id: employee.workshop_id });
      const nextNumber = allFeedbacks.length + 1;
      const customId = `F${String(nextNumber).padStart(3, '0')}`;
      
      return await base44.entities.EmployeeFeedback.create({
        custom_id: customId,
        type: data.type,
        content: data.content,
        action_plan: data.action_plan || null,
        action_plan_deadline: data.action_plan_deadline || null,
        privacy: data.privacy,
        employee_id: data.employee_id,
        evaluator_id: user.id,
        workshop_id: employee.workshop_id
      });
    },
    onSuccess: () => {
      toast.success("Feedback registrado com sucesso!");
      setShowDialog(false);
      setFormData({ 
        employee_id: employee?.id || "", 
        type: "one_on_one", 
        content: "", 
        action_plan: "", 
        action_plan_deadline: "", 
        privacy: "privado_gestor" 
      });
      queryClient.invalidateQueries(['employee-feedbacks']);
    },
    onError: (error) => {
      console.error("Erro ao criar feedback:", error);
      toast.error("Erro ao registrar: " + error.message);
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
    if (!formData.employee_id) {
      toast.error("Selecione o colaborador");
      return;
    }
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
      }
    });
  };

  const sendEmailNotification = async (feedback) => {
    try {
      const typeLabel = feedback.feedback_type === 'positivo' ? 'Feedback Positivo' :
                        feedback.feedback_type === 'corretivo' ? 'Feedback Corretivo' : 'Reunião 1:1';
      
      await base44.integrations.Core.SendEmail({
        to: employee.email,
        subject: `Novo Feedback: ${typeLabel}`,
        body: `Prezado(a) ${employee.full_name},\n\nVocê recebeu um novo feedback na plataforma.\n\nTipo: ${typeLabel}\nData: ${format(new Date(feedback.feedback_date || feedback.created_date), 'dd/MM/yyyy')}\n\nAcesse a plataforma para ler o conteúdo completo e dar ciência.\n\nAtenciosamente,\nEquipe de Gestão`
      });
      
      await base44.entities.EmployeeFeedback.update(feedback.id, {
        email_sent: true,
        email_sent_at: new Date().toISOString()
      });
      
      toast.success("Email enviado com sucesso!");
      queryClient.invalidateQueries(['employee-feedbacks']);
    } catch (error) {
      toast.error("Erro ao enviar email: " + error.message);
    }
  };

  const handleAcknowledge = async (feedback) => {
    try {
      await base44.entities.EmployeeFeedback.update(feedback.id, {
        employee_acknowledged: true,
        employee_acknowledged_at: new Date().toISOString()
      });
      
      toast.success("Ciência registrada!");
      queryClient.invalidateQueries(['employee-feedbacks']);
    } catch (error) {
      toast.error("Erro: " + error.message);
    }
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

      const response = await base44.functions.invoke('invokeLLMUnlimited', {
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
      
      setAnalysisResult(response.data.data);
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
      
      const response = await base44.functions.invoke('invokeLLMUnlimited', {
        prompt: prompt,
        response_json_schema: { type: "object", properties: { content: {type: "string"}, action_plan: {type: "string"} } }
      });
      
      const result = response.data.data;
      setFormData({ ...formData, content: result.content, action_plan: result.action_plan });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar com IA");
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleAudioTranscription = async (audioBlob, targetField) => {
    setProcessingAudio(true);
    try {
      // Upload áudio
      const file = new File([audioBlob], "audio.webm", { type: audioBlob.type });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Transcrever e melhorar com IA
      const prompt = targetField === 'content' 
        ? `Transcreva e melhore este áudio de feedback ${formData.type === 'positivo' ? 'POSITIVO' : formData.type === 'negativo' ? 'CORRETIVO' : 'DE REUNIÃO 1:1'} para o colaborador ${employee.full_name} (${employee.position}).
        
        Use a metodologia CNV (Comunicação Não Violenta):
        - Observação: fatos concretos observados
        - Sentimento: impacto emocional
        - Necessidade: o que precisa melhorar/manter
        - Pedido: ação específica clara
        
        Torne o texto profissional, claro e empático.
        Retorne JSON: { "text": "texto melhorado..." }`
        : `Transcreva e melhore este áudio sobre PLANO DE AÇÃO para o colaborador ${employee.full_name}.
        
        Estruture como:
        - O que será feito (ação específica)
        - Como será medido (indicadores)
        - Prazo sugerido
        
        Retorne JSON: { "text": "plano de ação..." }`;

      const response = await base44.functions.invoke('invokeLLMUnlimited', {
        prompt,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: { text: { type: "string" } }
        }
      });
      
      const result = response.data.data;

      if (targetField === 'content') {
        setFormData({ ...formData, content: result.text });
        setShowContentRecorder(false);
      } else {
        setFormData({ ...formData, action_plan: result.text });
        setShowActionPlanRecorder(false);
      }

      toast.success("Áudio transcrito e melhorado com IA!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar áudio: " + error.message);
    } finally {
      setProcessingAudio(false);
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

  const handleViewDetail = async (feedback) => {
    setSelectedFeedbackDetail(feedback);
    setShowDetailModal(true);
    
    // Se não for gestor e ainda não deu ciência, dar automaticamente
    if (!isManager && !feedback.employee_acknowledged) {
      try {
        await base44.entities.EmployeeFeedback.update(feedback.id, {
          employee_acknowledged: true,
          employee_acknowledged_at: new Date().toISOString()
        });
        queryClient.invalidateQueries(['employee-feedbacks']);
      } catch (error) {
        console.error("Erro ao dar ciência:", error);
      }
    }
  };

  const filteredFeedbacks = feedbacks.filter(fb => {
    const typeMatch = filters.type === "all" || fb.type === filters.type;
    const statusMatch = filters.status === "all" || fb.action_plan_status === filters.status || (!fb.action_plan && filters.status === 'sem_plano');
    const employeeMatch = filters.employee_id === "all" || fb.employee_id === filters.employee_id;
    return typeMatch && statusMatch && employeeMatch;
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
          {isManager && (
            <div className="w-48">
              <Select value={filters.employee_id} onValueChange={(v) => setFilters({...filters, employee_id: v})}>
                <SelectTrigger className="h-8 bg-white">
                  <SelectValue placeholder="Colaborador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Colaboradores</SelectItem>
                  {allEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Tipo</th>
                  {isManager && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Colaborador</th>}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredFeedbacks.map((feedback) => {
                  const config = feedbackConfig[feedback.type] || feedbackConfig.one_on_one;
                  const Icon = config.icon;
                  const employeeData = allEmployees.find(e => e.id === feedback.employee_id);

                  return (
                    <tr key={feedback.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Badge className="bg-indigo-600 text-white text-xs font-mono">
                          {feedback.custom_id || '-'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded ${config.badge}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-medium capitalize">{feedback.type?.replace('_', ' ')}</span>
                        </div>
                      </td>
                      {isManager && (
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-900">{employeeData?.full_name || '-'}</span>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {feedback.created_date ? format(new Date(feedback.created_date), "dd/MM/yyyy") : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {feedback.employee_acknowledged ? (
                            <Badge className="bg-green-100 text-green-700 w-fit">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Ciente
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 w-fit">
                              <Clock className="w-3 h-3 mr-1" />
                              Pendente
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(feedback)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
            <div>
              <Label>Colaborador *</Label>
              <Select value={formData.employee_id} onValueChange={v => setFormData({...formData, employee_id: v})}>
                <SelectTrigger className="bg-slate-50">
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {allEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} - {emp.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
              <div className="flex justify-between items-center mb-1">
                <Label>Conteúdo da Conversa *</Label>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="xs" 
                    onClick={() => setShowContentRecorder(!showContentRecorder)} 
                    disabled={processingAudio}
                    className="text-red-600 h-6 text-xs hover:bg-red-50"
                  >
                    <Mic className="w-3 h-3 mr-1" />
                    Gravar Áudio
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="xs" 
                    onClick={generateWithAI} 
                    disabled={generatingAI} 
                    className="text-purple-600 h-6 text-xs"
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    {generatingAI ? "Gerando..." : "IA: Gerar"}
                  </Button>
                </div>
              </div>
              
              {showContentRecorder && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AudioRecorder
                    onRecordingComplete={(blob) => handleAudioTranscription(blob, 'content')}
                    onCancel={() => setShowContentRecorder(false)}
                  />
                  <p className="text-xs text-red-700 mt-2">
                    🎙️ Grave o feedback falado - a IA irá transcrever e aplicar a metodologia CNV
                  </p>
                </div>
              )}
              
              <Textarea
                rows={6}
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder="Descreva o que foi conversado..."
                className="bg-slate-50"
                disabled={processingAudio}
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-blue-900 text-sm flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Plano de Ação (Opcional)
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="xs" 
                    onClick={() => setShowActionPlanRecorder(!showActionPlanRecorder)} 
                    disabled={processingAudio}
                    className="text-red-600 h-6 text-xs hover:bg-red-50"
                  >
                    <Mic className="w-3 h-3 mr-1" />
                    Gravar
                  </Button>
                </div>

                {showActionPlanRecorder && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AudioRecorder
                      onRecordingComplete={(blob) => handleAudioTranscription(blob, 'action_plan')}
                      onCancel={() => setShowActionPlanRecorder(false)}
                    />
                    <p className="text-xs text-red-700 mt-2">
                      🎙️ Grave o plano de ação - a IA irá estruturar com ações, indicadores e prazo
                    </p>
                  </div>
                )}

                <div>
                    <Label className="text-xs">Ação Corretiva / Meta</Label>
                    <Textarea 
                        rows={2}
                        value={formData.action_plan}
                        onChange={(e) => setFormData({...formData, action_plan: e.target.value})}
                        placeholder="O que será feito para melhorar ou manter?"
                        className="bg-white text-sm"
                        disabled={processingAudio}
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

      {/* Modal de Visualização Detalhada */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Detalhes do Feedback
              {selectedFeedbackDetail?.custom_id && (
                <Badge className="bg-indigo-600 text-white text-xs font-mono ml-2">
                  {selectedFeedbackDetail.custom_id}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedFeedbackDetail && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Tipo</Label>
                  <p className="text-sm font-medium capitalize">{selectedFeedbackDetail.type?.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Data</Label>
                  <p className="text-sm">
                    {selectedFeedbackDetail.created_date 
                      ? format(new Date(selectedFeedbackDetail.created_date), "dd/MM/yyyy 'às' HH:mm") 
                      : '-'}
                  </p>
                </div>
                {isManager && (
                  <div>
                    <Label className="text-xs text-gray-500">Colaborador</Label>
                    <p className="text-sm font-medium">
                      {allEmployees.find(e => e.id === selectedFeedbackDetail.employee_id)?.full_name || '-'}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-gray-500">Registrado por</Label>
                  <p className="text-sm">{selectedFeedbackDetail.created_by || '-'}</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-500">Conteúdo</Label>
                <div className="bg-slate-50 p-4 rounded-lg border text-sm whitespace-pre-wrap mt-1">
                  {selectedFeedbackDetail.content}
                </div>
              </div>

              {selectedFeedbackDetail.action_plan && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-800 font-semibold mb-2">
                    <Target className="w-4 h-4" />
                    Plano de Ação
                  </div>
                  <p className="text-sm text-gray-700">{selectedFeedbackDetail.action_plan}</p>
                  {selectedFeedbackDetail.action_plan_deadline && (
                    <p className="text-xs text-red-600 mt-2">
                      Prazo: {format(new Date(selectedFeedbackDetail.action_plan_deadline), "dd/MM/yyyy")}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <div className="flex flex-col gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendEmailNotification(selectedFeedbackDetail)}
                    className={selectedFeedbackDetail.email_sent ? "bg-blue-50 text-blue-700 border-blue-200 opacity-70" : ""}
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    {selectedFeedbackDetail.email_sent ? "Reenviar Email" : "Enviar Email"}
                  </Button>
                  {selectedFeedbackDetail.email_sent && selectedFeedbackDetail.email_sent_at && (
                    <span className="text-xs text-gray-500 ml-1">
                      Enviado: {format(new Date(selectedFeedbackDetail.email_sent_at), "dd/MM/yyyy 'às' HH:mm")}
                    </span>
                  )}
                </div>
                
                {isManager && (
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcknowledge(selectedFeedbackDetail)}
                      disabled={selectedFeedbackDetail.employee_acknowledged}
                      className={selectedFeedbackDetail.employee_acknowledged 
                        ? "bg-green-100 text-green-700 border-green-200 opacity-70 cursor-not-allowed" 
                        : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {selectedFeedbackDetail.employee_acknowledged ? "Ciente ✓" : "Dar Ciência"}
                    </Button>
                    {selectedFeedbackDetail.employee_acknowledged && selectedFeedbackDetail.employee_acknowledged_at && (
                      <span className="text-xs text-gray-500 ml-1">
                        Dado em: {format(new Date(selectedFeedbackDetail.employee_acknowledged_at), "dd/MM/yyyy 'às' HH:mm")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
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
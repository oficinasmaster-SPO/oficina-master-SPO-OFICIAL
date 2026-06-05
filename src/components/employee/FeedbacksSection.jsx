import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MANAGER_JOB_ROLES } from "@/components/lib/jobRoles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MessageSquare, ThumbsUp, ThumbsDown, Users, Wand2, Printer, Filter, Calendar, CheckCircle2, Clock, AlertCircle, Target, Activity, Mic, Mail, Loader2, Eye, TrendingUp, FilePenLine } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AudioRecorder from "@/components/audio/AudioRecorder";
import { validateFeedback, validateAudioTranscription, validateAudioDuration, prepareFeedbackData, prepareEditData } from "@/utils/feedbackValidation";

export default function FeedbacksSection({ employee }) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        const employees = await base44.entities.Employee.filter({ user_id: user.id });
        const userEmployee = employees?.[0];
        
        const managerRoles = MANAGER_JOB_ROLES;
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
  const [editingFeedback, setEditingFeedback] = useState(null);
  const [editFormData, setEditFormData] = useState(null);

  const [formData, setFormData] = useState({
    employee_id: employee?.id || "",
    type: "one_on_one",
    content: "",
    action_plan: "",
    action_plan_deadline: "",
    privacy: "privado_gestor"
  });
  
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    employee_id: "all"
  });

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFeedbackDetail, setSelectedFeedbackDetail] = useState(null);

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['workshop-employees', employee?.workshop_id],
    queryFn: async () => {
      if (!employee?.workshop_id) return [];
      return base44.entities.Employee.filter({ workshop_id: employee.workshop_id }, 'full_name');
    },
    enabled: !!employee?.workshop_id
  });

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['employee-feedbacks', employee.id],
    queryFn: async () => {
      const all = await base44.entities.EmployeeFeedback.list();
      return all.filter(f => f.employee_id === employee.id).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!employee.id
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const validation = validateFeedback(data);
      if (!validation.isValid) throw new Error(validation.errors[0]);
      const allFeedbacks = await base44.entities.EmployeeFeedback.filter({ workshop_id: employee.workshop_id });
      const feedbackData = prepareFeedbackData(data, user, allFeedbacks, employee.workshop_id);
      return base44.entities.EmployeeFeedback.create(feedbackData);
    },
    onSuccess: () => {
      toast.success("Feedback registrado com sucesso!");
      setShowDialog(false);
      setFormData({ employee_id: employee?.id || "", type: "one_on_one", content: "", action_plan: "", action_plan_deadline: "", privacy: "privado_gestor" });
      queryClient.invalidateQueries(['employee-feedbacks']);
    },
    onError: (error) => {
      console.error("Erro detalhado ao criar feedback:", error);
      toast.error(`Erro ao registrar: ${error.message}`);
    }
  });

  const editFeedbackMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const user = await base44.auth.me();
      const employees = await base44.entities.Employee.filter({ user_id: user.id });
      const userEmployee = employees?.[0];
      const isManager = user.role === 'admin' || MANAGER_JOB_ROLES.includes(userEmployee?.job_role);
      if (!isManager) throw new Error('Apenas gestores podem editar feedbacks');
      const validation = validateFeedback({ ...data, employee_id: 'existing' });
      if (!validation.isValid) throw new Error(validation.errors[0]);
      const editData = prepareEditData(data, user);
      return base44.entities.EmployeeFeedback.update(id, editData);
    },
    onSuccess: () => {
      toast.success("Feedback atualizado com sucesso!");
      setEditingFeedback(null);
      queryClient.invalidateQueries(['employee-feedbacks']);
    },
    onError: (error) => {
      console.error("Erro ao editar feedback:", error);
      toast.error(`Erro ao editar: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.EmployeeFeedback.update(id, data),
    onSuccess: () => {
      toast.success("Atualizado com sucesso!");
      setShowActionPlanModal(false);
      queryClient.invalidateQueries(['employee-feedbacks']);
    }
  });

  const handleAdd = () => {
    const validation = validateFeedback(formData);
    if (!validation.isValid) {
      toast.error(validation.errors[0]);
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEditFeedback = (feedback) => {
    setEditingFeedback(feedback);
    setEditFormData({ content: feedback.content, action_plan: feedback.action_plan || '', action_plan_deadline: feedback.action_plan_deadline || '' });
    setShowDetailModal(false);
  };

  const handleSaveEdit = () => {
    if (!editFormData) return;
    const validation = validateFeedback({ ...editFormData, employee_id: editingFeedback.employee_id, type: editingFeedback.feedback_type || editingFeedback.type });
    if (!validation.isValid) {
      toast.error(validation.errors[0]);
      return;
    }
    editFeedbackMutation.mutate({ id: editingFeedback.id, data: editFormData });
  };

  const handleUpdatePlan = (status) => {
    if (!selectedFeedback) return;
    updateMutation.mutate({ id: selectedFeedback.id, data: { action_plan_status: status } });
  };

  const sendEmailNotification = async (feedback) => {
    // Implementation... 
  };

  const handleAcknowledge = async (feedback) => {
    // Implementation... 
  };

  const analyzeFeedbacks = async () => {
    // Implementation... 
  };

  const generateWithAI = async () => {
    // Implementation... 
  };

  const handleAudioTranscription = async (audioBlob, targetField) => {
    setProcessingAudio(true);
    try {
      const durationValidation = validateAudioDuration(audioBlob);
      if (!durationValidation.isValid) {
        toast.error(durationValidation.error);
        setProcessingAudio(false);
        return;
      }
      
      const file = new File([audioBlob], "audio.webm", { type: audioBlob.type });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const prompt = targetField === 'content' 
        ? `Você é um especialista em RH. Transcreva este áudio de feedback ${formData.type === 'positivo' ? 'POSITIVO' : formData.type === 'negativo' ? 'CORRETIVO' : 'DE REUNIÃO 1:1'}. APLIQUE OBRIGATORIAMENTE a metodologia CNV. Para colaborador: ${employee.full_name} (${employee.position}). Retorne APENAS o texto formatado em JSON: { "text": "texto completo..." }`
        : `Transcreva este PLANO DE AÇÃO para ${employee.full_name}. ESTRUTURE COMO: - AÇÃO, - INDICADOR, - PRAZO. Retorne JSON: { "text": "plano estruturado..." }`;

      const response = await base44.functions.invoke('invokeLLMUnlimited', {
        prompt,
        file_urls: [file_url],
        response_json_schema: { type: "object", properties: { text: { type: "string", minLength: 10, maxLength: 5000 } }, required: ["text"] }
      });
      
      const result = response.data.data;
      const transcriptionValidation = validateAudioTranscription(result.text, targetField, formData.type);
      
      if (!transcriptionValidation.isValid) {
        toast.error(transcriptionValidation.error);
        return;
      }
      if (transcriptionValidation.warning) console.warn(transcriptionValidation.warning);

      if (targetField === 'content') setFormData({ ...formData, content: result.text });
      else setFormData({ ...formData, action_plan: result.text });
      
      setShowContentRecorder(false);
      setShowActionPlanRecorder(false);
      toast.success("Áudio transcrito com sucesso!");
    } catch (error) {
      console.error('Erro no processamento de áudio:', error);
      toast.error(`Erro ao processar áudio: ${error.message}`);
    } finally {
      setProcessingAudio(false);
    }
  };

  const handleTypeChange = (value) => {
    // Implementation... 
  };

  const exportToPDF = async () => { /* ... */ };

  const handleViewDetail = async (feedback) => {
    setSelectedFeedbackDetail(feedback);
    setShowDetailModal(true);
    if (!isManager && !feedback.employee_acknowledged) {
      try {
        await base44.entities.EmployeeFeedback.update(feedback.id, { employee_acknowledged: true, employee_acknowledged_at: new Date().toISOString() });
        queryClient.invalidateQueries(['employee-feedbacks']);
      } catch (error) {
        console.error("Erro ao dar ciência:", error);
      }
    }
  };

  const filteredFeedbacks = feedbacks.filter(fb => {
    const fbType = fb.feedback_type || fb.type;
    const typeMatch = filters.type === "all" || fbType === filters.type;
    const statusMatch = filters.status === "all" || fb.action_plan_status === filters.status || (!fb.action_plan && filters.status === 'sem_plano');
    return typeMatch && filters.employee_id === "all" || fb.employee_id === filters.employee_id && statusMatch;
  });

  const feedbackConfig = { /* ... */ };
  const getFeedbackTypeDisplay = (feedback) => feedback.feedback_type || feedback.type;
  const statusConfig = { /* ... */ };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        {/* Header content */}
      </CardHeader>
      <CardContent>
        {/* Table content */}
      </CardContent>

      {/* Dialogs */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>{/* Create form */}</Dialog>
      <Dialog open={showAnalysisModal} onOpenChange={setShowAnalysisModal}>{/* AI Analysis */}</Dialog>
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>{/* Details view */}</Dialog>
      <Dialog open={showActionPlanModal} onOpenChange={setShowActionPlanModal}>{/* Update plan status */}</Dialog>
      <Dialog open={!!editingFeedback} onOpenChange={() => setEditingFeedback(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar Feedback</DialogTitle></DialogHeader>
          {editFormData && (
            <div className="space-y-4 py-4">
                <Textarea rows={6} value={editFormData.content} onChange={(e) => setEditFormData({...editFormData, content: e.target.value})} />
                <Textarea rows={3} value={editFormData.action_plan} onChange={(e) => setEditFormData({...editFormData, action_plan: e.target.value})} />
                <Input type="date" value={editFormData.action_plan_deadline} onChange={(e) => setEditFormData({...editFormData, action_plan_deadline: e.target.value})} />
                <Button onClick={handleSaveEdit} disabled={editFeedbackMutation.isPending}>Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Plus, Loader2, Sparkles, Shield, Target, ListChecks, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import ReminderSettings from "./ReminderSettings";
import TaskDependencies from "./TaskDependencies";
import RecurrenceSettings from "./RecurrenceSettings";
import TimeTrackingSettings from "./TimeTrackingSettings";
import QGPSettings from "./QGPSettings";

export default function TaskForm({ task, employees, onSubmit, onCancel, submitting, allTasks = [] }) {
  const [formData, setFormData] = useState(task || {
    title: "",
    description: "",
    status: "pendente",
    priority: "media",
    assigned_to: [],
    assigned_team: "",
    due_date: "",
    progress: 0,
    tags: [],
    dependencies: [],
    reminder_settings: {
      enabled: true,
      email_reminder: true,
      app_notification: true,
      reminder_before: []
    },
    // Novos campos
    is_recurring: false,
    recurrence_pattern: "",
    recurrence_days: [],
    recurrence_end_date: "",
    predicted_time_minutes: 0,
    actual_time_minutes: 0,
    time_tracking: [],
    task_type: "geral",
    qgp_data: {
      os_number: "",
      vehicle_plate: "",
      vehicle_model: "",
      client_name: "",
      os_file_url: "",
      waiting_reason: ""
    },
    ai_epi: "",
    ai_specificity: "",
    ai_steps: [],
    ai_success_indicator: ""
  });

  const [newTag, setNewTag] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        qgp_data: { ...prev.qgp_data, os_file_url: file_url }
      }));
      toast.success("Arquivo anexado!");
    } catch (error) {
      console.error(error);
      toast.error("Erro no upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleEnhanceAI = async () => {
    if (!formData.title) {
      toast.error("Por favor, preencha o título da tarefa primeiro.");
      return;
    }

    setIsEnhancing(true);
    try {
      const { data } = await base44.functions.invoke('enhanceTaskAI', {
        title: formData.title,
        description: formData.description
      });

      setFormData(prev => ({
        ...prev,
        ai_epi: data.epi,
        ai_specificity: data.specificity,
        ai_steps: data.steps || [],
        ai_success_indicator: data.success_indicator,
        // If the AI suggests a deadline and we don't have one, we could potentially parse it, 
        // but for now let's just keep it as a suggestion in description or ignore if not strict date
        description: prev.description ? prev.description : (data.deadline_suggestion ? `${prev.description}\n\nPrazo sugerido: ${data.deadline_suggestion}` : prev.description)
      }));
      
      toast.success("Tarefa melhorada com IA!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar sugestões com IA.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const addStep = () => {
    setFormData(prev => ({ ...prev, ai_steps: [...(prev.ai_steps || []), ""] }));
  };

  const updateStep = (index, value) => {
    const newSteps = [...(formData.ai_steps || [])];
    newSteps[index] = value;
    setFormData(prev => ({ ...prev, ai_steps: newSteps }));
  };

  const removeStep = (index) => {
    const newSteps = [...(formData.ai_steps || [])];
    newSteps.splice(index, 1);
    setFormData(prev => ({ ...prev, ai_steps: newSteps }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const toggleAssignee = (userId) => {
    const assigned = formData.assigned_to || [];
    if (assigned.includes(userId)) {
      setFormData({ ...formData, assigned_to: assigned.filter(id => id !== userId) });
    } else {
      setFormData({ ...formData, assigned_to: [...assigned, userId] });
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...(formData.tags || []), newTag.trim()] });
      setNewTag("");
    }
  };

  const removeTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{task ? 'Editar Tarefa' : 'Nova Tarefa / Serviço'}</CardTitle>
          <div className="flex items-center gap-2">
             <Label>Tipo:</Label>
             <Select
                value={formData.task_type}
                onValueChange={(value) => setFormData({ ...formData, task_type: value })}
              >
                <SelectTrigger className="w-40 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Geral</SelectItem>
                  <SelectItem value="qgp_solicitacao_servico">QGP - Serviço</SelectItem>
                  <SelectItem value="qgp_aviso_entrega">QGP - Entrega</SelectItem>
                  <SelectItem value="qgp_retrabalho">QGP - Retrabalho</SelectItem>
                </SelectContent>
              </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basico" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="basico">Básico</TabsTrigger>
              <TabsTrigger value="qgp" className={formData.task_type?.startsWith('qgp') ? "" : "opacity-50"}>Dados QGP</TabsTrigger>
              <TabsTrigger value="tempo">Tempo</TabsTrigger>
              <TabsTrigger value="recorrencia">Recorrência</TabsTrigger>
            </TabsList>

            <TabsContent value="basico" className="space-y-4">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div>
              <Label>Título do Serviço / Tarefa *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Revisão de 10.000km"
                required
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva os detalhes da tarefa"
                rows={3}
              />
              <Button 
                type="button" 
                variant="secondary" 
                size="sm" 
                onClick={handleEnhanceAI}
                disabled={isEnhancing || !formData.title}
                className="mt-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
              >
                {isEnhancing ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Sparkles className="w-3 h-3 mr-2" />}
                Melhorar Detalhes com IA
              </Button>
            </div>

            {(formData.ai_epi || formData.ai_specificity || formData.ai_success_indicator || (formData.ai_steps && formData.ai_steps.length > 0)) && (
              <div className="bg-purple-50 p-4 rounded-md border border-purple-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-purple-800 font-semibold border-b border-purple-200 pb-2">
                  <Sparkles className="w-4 h-4" />
                  Detalhamento Inteligente
                </div>
                
                <div>
                  <Label className="text-purple-900 flex items-center gap-2">
                    <Shield className="w-3 h-3" /> EPI Necessário
                  </Label>
                  <Input 
                    value={formData.ai_epi} 
                    onChange={(e) => setFormData({...formData, ai_epi: e.target.value})}
                    className="bg-white mt-1"
                    placeholder="Ex: Luvas, Óculos de proteção..."
                  />
                </div>

                <div>
                  <Label className="text-purple-900 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" /> Especificidade / Atenção
                  </Label>
                  <Textarea 
                    value={formData.ai_specificity} 
                    onChange={(e) => setFormData({...formData, ai_specificity: e.target.value})}
                    className="bg-white mt-1"
                    rows={2}
                    placeholder="Detalhes técnicos ou pontos de atenção..."
                  />
                </div>

                <div>
                  <Label className="text-purple-900 flex items-center gap-2">
                    <Target className="w-3 h-3" /> Indicador de Sucesso
                  </Label>
                  <Input 
                    value={formData.ai_success_indicator} 
                    onChange={(e) => setFormData({...formData, ai_success_indicator: e.target.value})}
                    className="bg-white mt-1"
                    placeholder="Como saber se ficou bom?"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-purple-900 flex items-center gap-2">
                      <ListChecks className="w-3 h-3" /> Passo a Passo
                    </Label>
                    <Button type="button" size="sm" variant="ghost" onClick={addStep} className="h-6 px-2 text-purple-700">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.ai_steps?.map((step, idx) => (
                      <div key={idx} className="flex gap-2">
                        <div className="bg-purple-200 text-purple-800 w-6 h-8 flex items-center justify-center rounded text-xs font-bold shrink-0">
                          {idx + 1}
                        </div>
                        <Input 
                          value={step} 
                          onChange={(e) => updateStep(idx, e.target.value)}
                          className="bg-white"
                        />
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeStep(idx)} className="shrink-0 h-8 w-8">
                          <X className="w-3 h-3 text-red-400" />
                        </Button>
                      </div>
                    ))}
                    {(!formData.ai_steps || formData.ai_steps.length === 0) && (
                      <div className="text-xs text-purple-400 italic p-2 text-center border border-dashed border-purple-200 rounded bg-white/50">
                        Nenhum passo definido
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Prioridade *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Data de Vencimento</Label>
              <Input
                type="datetime-local"
                value={formData.due_date ? new Date(formData.due_date).toISOString().slice(0, 16) : ""}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value ? new Date(e.target.value).toISOString() : "" })}
              />
            </div>

            <div>
              <Label>Equipe</Label>
              <Select
                value={formData.assigned_team}
                onValueChange={(value) => setFormData({ ...formData, assigned_team: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma equipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhuma</SelectItem>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="gerencia">Gerência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Atribuir a Usuários</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {employees.map(emp => (
                  <Badge
                    key={emp.id}
                    variant={formData.assigned_to?.includes(emp.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleAssignee(emp.id)}
                  >
                    {emp.full_name}
                  </Badge>
                ))}
              </div>
            </div>

            {formData.status === 'em_andamento' && (
              <div>
                <Label>Progresso (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}

            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Adicionar tag"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags?.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">
                    {tag}
                    <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => removeTag(tag)} />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Dependências */}
          <TaskDependencies
            dependencies={formData.dependencies || []}
            allTasks={allTasks}
            currentTaskId={task?.id}
            onChange={(deps) => setFormData({ ...formData, dependencies: deps })}
          />

          {/* Configurações de Lembretes */}
          <ReminderSettings
            settings={formData.reminder_settings}
            onChange={(settings) => setFormData({ ...formData, reminder_settings: settings })}
          />
            </TabsContent>

            <TabsContent value="tempo" className="space-y-4">
              <TimeTrackingSettings
                predictedTime={formData.predicted_time_minutes}
                actualTime={formData.actual_time_minutes}
                timeTracking={formData.time_tracking || []}
                onChange={(timeData) => setFormData({
                  ...formData,
                  predicted_time_minutes: timeData.predicted_time_minutes,
                  actual_time_minutes: timeData.actual_time_minutes,
                  time_tracking: timeData.time_tracking
                })}
                isEditing={true}
              />
            </TabsContent>

            <TabsContent value="recorrencia" className="space-y-4">
              <RecurrenceSettings
                settings={{
                  is_recurring: formData.is_recurring,
                  recurrence_pattern: formData.recurrence_pattern,
                  recurrence_days: formData.recurrence_days,
                  recurrence_end_date: formData.recurrence_end_date
                }}
                onChange={(recurrence) => setFormData({
                  ...formData,
                  is_recurring: recurrence.is_recurring,
                  recurrence_pattern: recurrence.recurrence_pattern,
                  recurrence_days: recurrence.recurrence_days,
                  recurrence_end_date: recurrence.recurrence_end_date
                })}
              />
            </TabsContent>

            <TabsContent value="qgp" className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
                  <div className="col-span-2 md:col-span-1">
                      <Label>Número da O.S.</Label>
                      <Input 
                          value={formData.qgp_data?.os_number || ""} 
                          onChange={e => setFormData({...formData, qgp_data: {...formData.qgp_data, os_number: e.target.value}})}
                          placeholder="Ex: 12345"
                          className="bg-white"
                      />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                      <Label>Placa do Veículo</Label>
                      <Input 
                          value={formData.qgp_data?.vehicle_plate || ""} 
                          onChange={e => setFormData({...formData, qgp_data: {...formData.qgp_data, vehicle_plate: e.target.value}})}
                          placeholder="Ex: ABC-1234"
                          className="bg-white"
                      />
                  </div>
                  <div className="col-span-2">
                      <Label>Modelo do Veículo</Label>
                      <Input 
                          value={formData.qgp_data?.vehicle_model || ""} 
                          onChange={e => setFormData({...formData, qgp_data: {...formData.qgp_data, vehicle_model: e.target.value}})}
                          placeholder="Ex: Honda Civic Touring 2020"
                          className="bg-white"
                      />
                  </div>
                  <div className="col-span-2">
                      <Label>Anexar O.S. (PDF ou Imagem)</Label>
                      <div className="flex gap-2 items-center mt-1">
                        <Input 
                            type="file" 
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="bg-white"
                        />
                        {uploading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                      </div>
                      {formData.qgp_data?.os_file_url && (
                          <p className="text-xs text-green-600 mt-1 flex items-center">
                              <Shield className="w-3 h-3 mr-1" /> Arquivo anexado com sucesso
                          </p>
                      )}
                  </div>
                  <div className="col-span-2 md:col-span-1">
                      <Label>Tempo Previsto (minutos)</Label>
                      <Input 
                          type="number"
                          value={formData.predicted_time_minutes || ""} 
                          onChange={e => setFormData({...formData, predicted_time_minutes: parseInt(e.target.value) || 0})}
                          placeholder="Ex: 90"
                          className="bg-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">Ex: 1h30 = 90 min</p>
                  </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                task ? 'Atualizar' : 'Criar Tarefa'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
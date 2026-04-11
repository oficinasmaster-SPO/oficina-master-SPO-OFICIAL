import React, { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Circle, Plus, Trash2, Save, BarChart2, ListChecks, Calendar, FileText, AlertCircle, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";

const PHASE_CONFIG = {
  "Planning": {
    nome: "Planejamento",
    emoji: "📋",
    cor: "text-blue-600",
    bgCor: "bg-blue-50",
    borderCor: "border-blue-300",
    descricao: "Defina o objetivo, tarefas e prazos para este sprint"
  },
  "Execution": {
    nome: "Execução",
    emoji: "⚙️",
    cor: "text-green-600",
    bgCor: "bg-green-50",
    borderCor: "border-green-300",
    descricao: "Implemente as ações planejadas e registre progresso"
  },
  "Monitoring": {
    nome: "Acompanhamento",
    emoji: "📊",
    cor: "text-purple-600",
    bgCor: "bg-purple-50",
    borderCor: "border-purple-300",
    descricao: "Reunião semanal para verificar bloqueios e ajustar rumo"
  },
  "Review": {
    nome: "Revisão",
    emoji: "🔄",
    cor: "text-orange-600",
    bgCor: "bg-orange-50",
    borderCor: "border-orange-300",
    descricao: "Apresente resultados e valide com o cliente"
  },
  "Retrospective": {
    nome: "Melhoria",
    emoji: "🚀",
    cor: "text-red-600",
    bgCor: "bg-red-50",
    borderCor: "border-red-300",
    descricao: "Reflita sobre o processo e melhore o próximo ciclo"
  },
};

const STATUS_FASE = {
  not_started: { label: "Não iniciada", color: "bg-gray-100 text-gray-600" },
  in_progress: { label: "Em andamento", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluída", color: "bg-green-100 text-green-700" },
};

const DEFAULT_TASKS_PLANNING_AGENDA_CHEIA = [
  { description: "Levantar a base de clientes dos últimos 12 meses", status: "to_do" },
  { description: "Filtrar clientes com mais de 90 dias sem retorno", status: "to_do" },
  { description: "Classificar clientes por recorrência (recorrentes vs não-recorrentes)", status: "to_do" },
  { description: "Definir oferta de reativação (Kit Master ou equivalente)", status: "to_do" },
  { description: "Definir responsável pela execução (SDR/Vendedor)", status: "to_do" },
  { description: "Validar capacitação dos treinamentos", status: "to_do" },
];

const DEFAULT_KPIS_PLANNING_AGENDA_CHEIA = [
  { name: "Clientes da base em trabalho", value: 0, unit: "qtd" },
  { name: "Clientes com +90 dias sem retorno", value: 0, unit: "qtd" },
  { name: "Capacidade de atendimento disponível", value: 0, unit: "horas" },
];

const DEFAULT_TASKS_EXECUTION_AGENDA_CHEIA = [
  { description: "Criar a lista de clientes com mais de 90 dias", status: "to_do" },
  { description: "Criar a lista de clientes com menos de 90 dias", status: "to_do" },
  { description: "Criar a lista com clientes de 7 dias para geração de indicação", status: "to_do" },
  { description: "Implementação do checklist treinamento e desenvolvimento", status: "to_do" },
  { description: "Liberação do map do pavê", status: "to_do" },
  { description: "Treinamento do responsável e simulação prática", status: "to_do" },
  { description: "Iniciar contatos via ligação telefônica", status: "to_do" },
  { description: "Solicitar as gravações das abordagens via telefone e via ligação", status: "to_do" },
  { description: "Controlar uma planilha ou implementar CRM", status: "to_do" },
];

const DEFAULT_KPIS_EXECUTION_AGENDA_CHEIA = [
  { name: "Número de ligações realizadas", value: 0, unit: "qtd" },
  { name: "Número de conversas efetivadas", value: 0, unit: "qtd" },
  { name: "Número de agendamentos", value: 0, unit: "qtd" },
  { name: "Número de comparecimentos", value: 0, unit: "qtd" },
  { name: "Número de faturamento realizado", value: 0, unit: "R$" },
  { name: "Tempo iniciado da implementação de prospecção", value: 0, unit: "dias" },
];

const DEFAULT_TASKS_MONITORING_AGENDA_CHEIA = [
  { description: "Checar no meio da semana o progresso", status: "to_do" },
  { description: "Ouvir ligações ou ler mensagens do WhatsApp", status: "to_do" },
  { description: "Ajustar a abordagem do script", status: "to_do" },
  { description: "Cobrar volume mínimo diário", status: "to_do" },
  { description: "Corrigir falhas na execução", status: "to_do" },
];

const DEFAULT_KPIS_MONITORING_AGENDA_CHEIA = [
  { name: "Taxa de contato (ligações realizadas vs clientes abordados)", value: 0, unit: "%" },
  { name: "Taxa de agendamento (conversas efetivas vs agendamentos)", value: 0, unit: "%" },
  { name: "Taxa de comparecimento (agendados vs comparecimentos)", value: 0, unit: "%" },
  { name: "Taxa comparecimento vs vendas (comparecimentos vs vendas)", value: 0, unit: "%" },
  { name: "Ticket médio", value: 0, unit: "R$" },
  { name: "Faturamento realizado", value: 0, unit: "R$" },
];

const DEFAULT_TASKS_REVIEW_AGENDA_CHEIA = [
  { description: "Levantar os números da semana com precisão", status: "to_do" },
  { description: "Comparar com a meta de agendamento", status: "to_do" },
  { description: "Identificar gargalos e listas de objeção", status: "to_do" },
  { description: "Registrar abordagens ruins para correção", status: "to_do" },
  { description: "Registrar ofertas fracas para melhoria", status: "to_do" },
  { description: "Validar se a agenda encheu de fato", status: "to_do" },
];

const DEFAULT_KPIS_REVIEW_AGENDA_CHEIA = [
  { name: "Número de agendamentos da semana", value: 0, unit: "qtd" },
  { name: "Número de conversão de agendamento", value: 0, unit: "qtd" },
  { name: "Número de comparecimento", value: 0, unit: "qtd" },
  { name: "Número de faturamento", value: 0, unit: "R$" },
];

const DEFAULT_TASKS_RETROSPECTIVE_AGENDA_CHEIA = [
  { description: "Ajustar o script para melhorar a conversão", status: "to_do" },
  { description: "Melhorar a oferta de reativação", status: "to_do" },
  { description: "Organizar o follow-up para quem não respondeu", status: "to_do" },
  { description: "Implementar o CRM para funcionar e ter gestão", status: "to_do" },
  { description: "Definir uma rotina de contato do dia", status: "to_do" },
  { description: "Definir uma rotina de treinamento", status: "to_do" },
];

const DEFAULT_KPIS_RETROSPECTIVE_AGENDA_CHEIA = [
  { name: "Crescimento semanal de engajamento", value: 0, unit: "%" },
  { name: "Crescimento no aumento das conversões", value: 0, unit: "%" },
  { name: "Taxa de retorno dos clientes", value: 0, unit: "%" },
];

export default function SprintPhaseDetailModalRedesigned({ sprint, phaseIndex, onClose, onSaved }) {
  const phase = sprint?.phases?.[phaseIndex];
  const config = phase ? PHASE_CONFIG[phase.name] : null;

  const [status, setStatus] = useState(phase?.status || "not_started");
  const [notes, setNotes] = useState(phase?.notes || "");
  const [dueDate, setDueDate] = useState(phase?.due_date || "");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("resumo");

  // Inicializa tarefas com padrão se for alguma fase de Agenda Cheia
  const isAgendaCheia = sprint?.mission_id === 'agenda_cheia';
  const isPlanning = phase?.name === 'Planning';
  const isExecution = phase?.name === 'Execution';
  const isMonitoring = phase?.name === 'Monitoring';
  const isReview = phase?.name === 'Review';
  const isRetrospective = phase?.name === 'Retrospective';
  
  const initTasks = phase?.tasks && phase.tasks.length > 0 
    ? phase.tasks 
    : (isAgendaCheia && isPlanning ? DEFAULT_TASKS_PLANNING_AGENDA_CHEIA 
       : isAgendaCheia && isExecution ? DEFAULT_TASKS_EXECUTION_AGENDA_CHEIA
       : isAgendaCheia && isMonitoring ? DEFAULT_TASKS_MONITORING_AGENDA_CHEIA
       : isAgendaCheia && isReview ? DEFAULT_TASKS_REVIEW_AGENDA_CHEIA
       : isAgendaCheia && isRetrospective ? DEFAULT_TASKS_RETROSPECTIVE_AGENDA_CHEIA
       : []);
  const [tasks, setTasks] = useState(initTasks);

  // Inicializa KPIs com padrão se for alguma fase de Agenda Cheia
  const initMetrics = phase?.metrics && phase.metrics.length > 0 
    ? phase.metrics 
    : (isAgendaCheia && isPlanning ? DEFAULT_KPIS_PLANNING_AGENDA_CHEIA
       : isAgendaCheia && isExecution ? DEFAULT_KPIS_EXECUTION_AGENDA_CHEIA
       : isAgendaCheia && isMonitoring ? DEFAULT_KPIS_MONITORING_AGENDA_CHEIA
       : isAgendaCheia && isReview ? DEFAULT_KPIS_REVIEW_AGENDA_CHEIA
       : isAgendaCheia && isRetrospective ? DEFAULT_KPIS_RETROSPECTIVE_AGENDA_CHEIA
       : []);
  const [metrics, setMetrics] = useState(initMetrics);

  if (!sprint || !phase || !config) return null;

  // Funções de gerenciamento
  const addMetric = () => setMetrics([...metrics, { name: "", value: 0, unit: "" }]);
  const updateMetric = (idx, field, val) => setMetrics(metrics.map((m, i) => i === idx ? { ...m, [field]: val } : m));
  const removeMetric = (idx) => setMetrics(metrics.filter((_, i) => i !== idx));

  const addTask = () => setTasks([...tasks, { description: "", status: "to_do" }]);
  const toggleTask = (idx) => setTasks(tasks.map((t, i) => i === idx ? { ...t, status: t.status === "done" ? "to_do" : "done" } : t));
  const updateTaskDesc = (idx, val) => setTasks(tasks.map((t, i) => i === idx ? { ...t, description: val } : t));
  const removeTask = (idx) => setTasks(tasks.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    const updatedPhases = [...(sprint.phases || [])];
    updatedPhases[phaseIndex] = {
      ...updatedPhases[phaseIndex],
      status,
      notes,
      due_date: dueDate || null,
      completion_date: status === "completed" ? (phase.completion_date || new Date().toISOString()) : null,
      metrics,
      tasks,
    };

    const totalTasks = updatedPhases.reduce((acc, p) => acc + (p.tasks?.length || 0), 0);
    const doneTasks = updatedPhases.reduce((acc, p) => acc + (p.tasks?.filter(t => t.status === "done").length || 0), 0);
    const phasesCompleted = updatedPhases.filter(p => p.status === "completed").length;

    let progress;
    if (totalTasks > 0) {
      const phaseProgress = Math.round((phasesCompleted / updatedPhases.length) * 50);
      const taskProgress = Math.round((doneTasks / totalTasks) * 50);
      progress = phaseProgress + taskProgress;
    } else {
      progress = Math.round((phasesCompleted / updatedPhases.length) * 100);
    }

    const newSprintStatus = phasesCompleted === updatedPhases.length ? "completed" : phasesCompleted > 0 || doneTasks > 0 ? "in_progress" : sprint.status === "overdue" ? "overdue" : "pending";

    try {
      await base44.entities.ConsultoriaSprint.update(sprint.id, {
        phases: updatedPhases,
        progress_percentage: progress,
        status: newSprintStatus,
        last_activity_date: new Date().toISOString(),
      });
      toast.success('✅ Fase salva com sucesso!');
    } catch (error) {
      toast.error('❌ Erro ao salvar fase');
      console.error('Erro:', error);
    }

    setSaving(false);
    onSaved?.();
    onClose();
  };

  const completedTasks = tasks.filter(t => t.status === "done").length;
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader>
          <div className="space-y-3 w-full">
            <div className="flex items-center gap-3">
              <div className={`text-3xl ${config.bgCor} p-3 rounded-lg`}>{config.emoji}</div>
              <div className="flex-1">
                <DialogTitle className={`text-xl ${config.cor}`}>{config.nome}</DialogTitle>
                <p className="text-xs text-gray-500 mt-1">Sprint: {sprint.title}</p>
              </div>
              <Badge className={STATUS_FASE[status].color}>{STATUS_FASE[status].label}</Badge>
            </div>
            <p className="text-sm text-gray-600 italic">{config.descricao}</p>
          </div>
        </DialogHeader>

        {/* Abas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="resumo" className="text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Resumo</span>
            </TabsTrigger>
            <TabsTrigger value="tarefas" className="text-xs flex items-center gap-1">
              <ListChecks className="w-3 h-3" />
              <span className="hidden sm:inline">Tarefas</span>
            </TabsTrigger>
            <TabsTrigger value="metricas" className="text-xs flex items-center gap-1">
              <BarChart2 className="w-3 h-3" />
              <span className="hidden sm:inline">Métricas</span>
            </TabsTrigger>
            <TabsTrigger value="notas" className="text-xs flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span className="hidden sm:inline">Notas</span>
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: RESUMO */}
          <TabsContent value="resumo" className="space-y-4 mt-4">
            <div className={`border-2 rounded-lg p-4 ${config.bgCor} border-${config.borderCor}`}>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Visão Geral da Fase
              </h3>

              {/* Status */}
              <div className="mb-4">
                <Label className="text-xs font-semibold uppercase tracking-wide mb-2 block">Status da Fase</Label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(STATUS_FASE).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setStatus(key)}
                      className={`py-2 px-4 rounded-lg text-xs font-medium border-2 transition-all ${
                        status === key ? `border-current ring-2 ring-offset-1 ring-blue-400 ${val.color}` : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data de Revisão */}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide mb-2 block flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Data de Revisão
                </Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="text-sm" />
              </div>
            </div>

            {/* Progresso de Tarefas */}
            {tasks.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Progresso de Tarefas
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${taskProgress}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-700 min-w-[50px]">{taskProgress}%</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">{completedTasks} de {tasks.length} tarefas concluídas</p>
              </div>
            )}

            {/* Indicadores */}
            {metrics.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                  Indicadores Registrados
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {metrics.map((m, idx) => (
                    <div key={idx} className="bg-blue-50 p-2 rounded border border-blue-200">
                      <p className="text-xs text-gray-600">{m.name}</p>
                      <p className="text-sm font-bold text-blue-700">{m.value} {m.unit}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ABA 2: TAREFAS */}
          <TabsContent value="tarefas" className="space-y-4 mt-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1">
                  <ListChecks className="w-3.5 h-3.5" />
                  Tarefas da Fase
                </Label>
                <button onClick={addTask} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Adicionar
                </button>
              </div>

              <div className="space-y-2">
                {tasks.map((task, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border">
                    <button
                      onClick={() => toggleTask(idx)}
                      className="flex-shrink-0 hover:scale-110 transition"
                    >
                      {task.status === "done" ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300" />
                      )}
                    </button>
                    <Input
                      value={task.description}
                      onChange={e => updateTaskDesc(idx, e.target.value)}
                      placeholder="Descrição da tarefa..."
                      className={`text-sm flex-1 h-8 border-0 ${task.status === "done" ? "line-through text-gray-400 bg-gray-100" : ""}`}
                    />
                    <button onClick={() => removeTask(idx)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {tasks.length === 0 && (
                  <div className="text-center py-4 text-gray-400 border-2 border-dashed rounded-lg">
                    <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Clique em "+ Adicionar" para criar tarefas</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ABA 3: MÉTRICAS / KPIs */}
          <TabsContent value="metricas" className="space-y-4 mt-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1">
                  <BarChart2 className="w-3.5 h-3.5" />
                  Indicadores / KPIs
                </Label>
                <button onClick={addMetric} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Adicionar
                </button>
              </div>

              <div className="space-y-2">
                {metrics.map((metric, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <Input
                      value={metric.name}
                      onChange={e => updateMetric(idx, "name", e.target.value)}
                      placeholder="Ex: Ticket Médio, Taxa de Conversão"
                      className="text-sm h-8 flex-1 border-blue-200"
                    />
                    <Input
                      type="number"
                      value={metric.value}
                      onChange={e => updateMetric(idx, "value", parseFloat(e.target.value) || 0)}
                      placeholder="Valor"
                      className="text-sm h-8 w-20 border-blue-200"
                      step="0.01"
                    />
                    <Input
                      value={metric.unit}
                      onChange={e => updateMetric(idx, "unit", e.target.value)}
                      placeholder="Un."
                      className="text-sm h-8 w-16 border-blue-200"
                    />
                    <button onClick={() => removeMetric(idx)} className="text-gray-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {metrics.length === 0 && (
                  <div className="text-center py-4 text-gray-400 border-2 border-dashed rounded-lg">
                    <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Clique em "+ Adicionar" para registrar indicadores</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ABA 4: NOTAS DO CONSULTOR */}
          <TabsContent value="notas" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide mb-2 block flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                Anotações do Consultor
              </Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Registre observações, decisões, bloqueios, ajustes e pontos importantes desta fase..."
                className="text-sm min-h-[150px] p-3 border rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-2">Use este espaço para documentar contexto e evidências importantes.</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Botão Salvar */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2 bg-green-600 hover:bg-green-700">
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar Fase"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
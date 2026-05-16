import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp, PlayCircle,
  ExternalLink, BookOpen, Video, Send, AlertTriangle,
  Loader2, Zap, ListChecks, BarChart2, TrendingUp, MessageSquare,
  CheckCheck, RotateCcw, Paperclip, X, Save
} from "lucide-react";

// Config das 5 fases
const FASES = [
  { key: "Planning",      nome: "Planejamento",    emoji: "📋", cor: "blue",   icon: ListChecks },
  { key: "Execution",     nome: "Implementação",   emoji: "⚙️", cor: "green",  icon: PlayCircle },
  { key: "Monitoring",    nome: "Acompanhamento",  emoji: "📊", cor: "purple", icon: BarChart2 },
  { key: "Review",        nome: "Revisão",         emoji: "🔄", cor: "orange", icon: TrendingUp },
  { key: "Retrospective", nome: "Melhoria",        emoji: "💬", cor: "red",    icon: MessageSquare },
];

const COR_PHASE = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   badge: "bg-blue-100 text-blue-800" },
  green:  { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  badge: "bg-green-100 text-green-800" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", badge: "bg-purple-100 text-purple-800" },
  orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", badge: "bg-orange-100 text-orange-800" },
  red:    { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    badge: "bg-red-100 text-red-800" },
};

const STATUS_SPRINT = {
  pending:     { label: "Pendente",      cls: "bg-gray-100 text-gray-600" },
  in_progress: { label: "Em andamento",  cls: "bg-blue-100 text-blue-700" },
  completed:   { label: "Concluído",     cls: "bg-green-100 text-green-700" },
  overdue:     { label: "Atrasado",      cls: "bg-red-100 text-red-700" },
};

const STATUS_PHASE = {
  not_started:    { label: "Não iniciada",       cls: "bg-gray-100 text-gray-500" },
  in_progress:    { label: "Em andamento",       cls: "bg-blue-100 text-blue-700" },
  pending_review: { label: "Aguardando revisão", cls: "bg-yellow-100 text-yellow-700" },
  completed:      { label: "Concluída",          cls: "bg-green-100 text-green-700" },
  returned:       { label: "Devolvida",          cls: "bg-orange-100 text-orange-700" },
};

// ─── Componente de uma Tarefa ───────────────────────────────────────────────
function TarefaItem({ task, taskIndex, phaseIndex, sprint, onSave, saving }) {
  const [expanded, setExpanded] = useState(false);
  const [nota, setNota] = useState(task.evidence_note || "");
  const [editingNota, setEditingNota] = useState(false);

  const isDone = task.status === "done";

  const handleToggle = () => {
    const newStatus = isDone ? "to_do" : "done";
    onSave(phaseIndex, taskIndex, { status: newStatus });
  };

  const handleSaveNota = () => {
    onSave(phaseIndex, taskIndex, { evidence_note: nota });
    setEditingNota(false);
    toast.success("Observação salva!");
  };

  return (
    <div className={`rounded-lg border transition-all ${isDone ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}>
      {/* Linha principal */}
      <div className="flex items-start gap-3 p-3">
        <button
          onClick={handleToggle}
          disabled={saving}
          className="mt-0.5 flex-shrink-0"
        >
          {isDone
            ? <CheckCircle2 className="w-5 h-5 text-green-500" />
            : <Circle className="w-5 h-5 text-gray-300 hover:text-gray-500" />
          }
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isDone ? "line-through text-gray-400" : "text-gray-800"}`}>
            {task.description}
          </p>

          {/* Chips de recursos disponíveis */}
          <div className="flex gap-2 mt-1.5 flex-wrap">
            {task.instructions && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <BookOpen className="w-3 h-3" /> Como fazer
              </button>
            )}
            {task.link_url && (
              <a
                href={task.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
              >
                <ExternalLink className="w-3 h-3" /> Material
              </a>
            )}
            {task.video_url && (
              <a
                href={task.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
              >
                <Video className="w-3 h-3" /> Vídeo
              </a>
            )}
            {task.evidence_note && !editingNota && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                💬 {task.evidence_note.substring(0, 30)}{task.evidence_note.length > 30 ? "..." : ""}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Painel expandido */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">

          {/* Como fazer */}
          {task.instructions && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" /> Como fazer
              </p>
              <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-line">{task.instructions}</p>
            </div>
          )}

          {/* Vídeo embed se for YouTube */}
          {task.video_url && task.video_url.includes("youtube") && (
            <div className="rounded-lg overflow-hidden border">
              <iframe
                width="100%"
                height="200"
                src={task.video_url.replace("watch?v=", "embed/").split("&")[0]}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="block"
              />
            </div>
          )}
          {task.video_url && !task.video_url.includes("youtube") && (
            <a
              href={task.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200 text-red-700 text-sm hover:bg-red-100"
            >
              <Video className="w-4 h-4" /> Assistir vídeo instrucional
            </a>
          )}

          {/* Observação */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
              💬 Observação sobre esta tarefa
            </p>
            {editingNota ? (
              <div className="space-y-2">
                <Textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Adicione uma observação, dúvida ou registro sobre esta tarefa..."
                  className="text-sm min-h-[80px]"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveNota} className="bg-blue-600 hover:bg-blue-700 gap-1">
                    <Save className="w-3.5 h-3.5" /> Salvar nota
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingNota(false); setNota(task.evidence_note || ""); }}>
                    <X className="w-3.5 h-3.5 mr-1" /> Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditingNota(true)}
                className="w-full text-left p-2.5 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                {task.evidence_note || "+ Adicionar observação..."}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente de uma Fase ─────────────────────────────────────────────────
function FaseCard({ fase, faseConfig, phaseIndex, sprint, onSaveTask, onEnviarRevisao, saving, user }) {
  const [expanded, setExpanded] = useState(true);

  const tasks = fase?.tasks || [];
  const doneTasks = tasks.filter(t => t.status === "done").length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const phaseStatus = fase?.status || "not_started";
  const cor = COR_PHASE[faseConfig.cor];
  const Icon = faseConfig.icon;

  const canEnviarRevisao = phaseStatus !== "pending_review" && phaseStatus !== "completed";
  const isPendingReview = phaseStatus === "pending_review";
  const isCompleted = phaseStatus === "completed";
  const isReturned = phaseStatus === "returned";

  return (
    <div className={`rounded-xl border-2 ${cor.border} overflow-hidden`}>
      {/* Header da fase */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between p-4 ${cor.bg} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm`}>
            <Icon className={`w-5 h-5 ${cor.text}`} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className={`font-bold text-sm ${cor.text}`}>
                {faseConfig.emoji} {faseConfig.nome}
              </span>
              <Badge className={`text-xs ${STATUS_PHASE[phaseStatus]?.cls || "bg-gray-100 text-gray-500"}`}>
                {STATUS_PHASE[phaseStatus]?.label || phaseStatus}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-24 h-1.5 bg-white/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isCompleted ? "bg-green-500" : "bg-current opacity-60"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className={`text-xs ${cor.text} opacity-80`}>{doneTasks}/{totalTasks} tarefas</span>
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp className={`w-4 h-4 ${cor.text}`} /> : <ChevronDown className={`w-4 h-4 ${cor.text}`} />}
      </button>

      {/* Feedback de devolução */}
      {isReturned && fase?.review_feedback && (
        <div className="px-4 pt-3">
          <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-orange-700 mb-1">Devolvida pelo consultor:</p>
              <p className="text-sm text-orange-800">{fase.review_feedback}</p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de tarefas */}
      {expanded && (
        <div className="p-4 space-y-2 bg-white">
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma tarefa nesta fase.</p>
          ) : (
            tasks.map((task, tIdx) => (
              <TarefaItem
                key={tIdx}
                task={task}
                taskIndex={tIdx}
                phaseIndex={phaseIndex}
                sprint={sprint}
                onSave={onSaveTask}
                saving={saving}
              />
            ))
          )}

          {/* Barra de progresso + botão enviar */}
          {tasks.length > 0 && (
            <div className={`mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3`}>
              <span className={`text-sm font-medium ${progress === 100 ? "text-green-600" : "text-gray-600"}`}>
                {progress === 100 ? "✅ Todas as tarefas concluídas!" : `${doneTasks} de ${totalTasks} tarefas concluídas`}
              </span>

              {isCompleted ? (
                <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" /> Fase Concluída
                </Badge>
              ) : isPendingReview ? (
                <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1 animate-pulse">
                  <RotateCcw className="w-3.5 h-3.5" /> Aguardando revisão
                </Badge>
              ) : canEnviarRevisao ? (
                <Button
                  size="sm"
                  onClick={() => onEnviarRevisao(phaseIndex)}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Enviar para Revisão
                </Button>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente de um Sprint ─────────────────────────────────────────────────
function SprintCard({ sprint, onSprintUpdated, user }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const sprintStatus = sprint.status || "pending";
  const progress = sprint.progress_percentage || 0;

  const handleSaveTask = async (phaseIndex, taskIndex, updates) => {
    setSaving(true);
    const phases = JSON.parse(JSON.stringify(sprint.phases || []));
    if (!phases[phaseIndex]) return setSaving(false);

    Object.assign(phases[phaseIndex].tasks[taskIndex], updates);

    // Recalcular progresso geral
    const allTasks = phases.flatMap(p => p.tasks || []);
    const done = allTasks.filter(t => t.status === "done").length;
    const newProgress = allTasks.length > 0 ? Math.round((done / allTasks.length) * 100) : 0;

    // Se primeira tarefa marcada → fase vai para in_progress
    const phase = phases[phaseIndex];
    if (phase.status === "not_started" && updates.status === "done") {
      phase.status = "in_progress";
    }

    try {
      await base44.entities.ConsultoriaSprint.update(sprint.id, { phases, progress_percentage: newProgress });
      onSprintUpdated();
    } catch (e) {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleEnviarRevisao = async (phaseIndex) => {
    setSaving(true);
    const phases = JSON.parse(JSON.stringify(sprint.phases || []));
    if (!phases[phaseIndex]) return setSaving(false);

    phases[phaseIndex].status = "pending_review";
    phases[phaseIndex].submitted_for_review_at = new Date().toISOString();
    phases[phaseIndex].submitted_for_review_by = user?.id || "";

    try {
      await base44.entities.ConsultoriaSprint.update(sprint.id, { phases });
      toast.success("Fase enviada para revisão do consultor!");
      onSprintUpdated();
    } catch (e) {
      toast.error("Erro ao enviar para revisão");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-2 border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Header do sprint */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4 text-left">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {sprint.sprint_number}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">{sprint.title}</h3>
            {sprint.objective && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{sprint.objective}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5">
              <Badge className={`text-xs ${STATUS_SPRINT[sprintStatus]?.cls}`}>
                {STATUS_SPRINT[sprintStatus]?.label}
              </Badge>
              <div className="flex items-center gap-1.5">
                <div className="w-20 h-1.5 bg-gray-200 rounded-full">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{progress}%</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {/* Fases expandidas */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
          {FASES.map((faseConfig, idx) => {
            const faseData = (sprint.phases || []).find(p => p.name === faseConfig.key);
            if (!faseData) return null;
            const phaseIndex = (sprint.phases || []).findIndex(p => p.name === faseConfig.key);
            return (
              <FaseCard
                key={faseConfig.key}
                fase={faseData}
                faseConfig={faseConfig}
                phaseIndex={phaseIndex}
                sprint={sprint}
                onSaveTask={handleSaveTask}
                onEnviarRevisao={handleEnviarRevisao}
                saving={saving}
                user={user}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab Principal ────────────────────────────────────────────────────────────
export default function SprintsClienteTab({ workshopId, user }) {
  const queryClient = useQueryClient();

  const { data: sprints = [], isLoading } = useQuery({
    queryKey: ["sprints-cronograma", workshopId],
    queryFn: () => base44.entities.ConsultoriaSprint.filter({ workshop_id: workshopId }, "sprint_number"),
    enabled: !!workshopId,
    staleTime: 30 * 1000,
  });

  const handleSprintUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["sprints-cronograma", workshopId] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (sprints.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <Zap className="w-14 h-14 mx-auto mb-4 text-gray-300" />
        <p className="font-semibold text-lg text-gray-700">Nenhum sprint iniciado</p>
        <p className="text-sm mt-2">Os sprints de implementação aparecerão aqui quando o consultor iniciá-los.</p>
      </div>
    );
  }

  // Resumo rápido
  const totalSprints = sprints.length;
  const sprintsConcluidos = sprints.filter(s => s.status === "completed").length;
  const sprintsEmAndamento = sprints.filter(s => s.status === "in_progress").length;
  const fasesAguardando = sprints.flatMap(s => s.phases || []).filter(p => p.status === "pending_review").length;

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Sprints", value: totalSprints, cls: "text-blue-700 bg-blue-50 border-blue-200" },
          { label: "Em andamento", value: sprintsEmAndamento, cls: "text-indigo-700 bg-indigo-50 border-indigo-200" },
          { label: "Concluídos", value: sprintsConcluidos, cls: "text-green-700 bg-green-50 border-green-200" },
          { label: "Aguard. revisão", value: fasesAguardando, cls: fasesAguardando > 0 ? "text-yellow-700 bg-yellow-50 border-yellow-300" : "text-gray-500 bg-gray-50 border-gray-200" },
        ].map((m) => (
          <div key={m.label} className={`rounded-xl border p-3 text-center ${m.cls}`}>
            <p className="text-2xl font-bold">{m.value}</p>
            <p className="text-xs mt-0.5 font-medium">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Lista de sprints */}
      <div className="space-y-4">
        {sprints.map((sprint) => (
          <SprintCard
            key={sprint.id}
            sprint={sprint}
            onSprintUpdated={handleSprintUpdated}
            user={user}
          />
        ))}
      </div>
    </div>
  );
}
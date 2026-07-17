import React from "react";
import {
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  ListChecks,
  Clock,
  Lock,
  CheckCircle2,
  Play,
  FileText,
  MessageSquare,
  Wrench,
  Zap,
  ClipboardList,
  Star,
  GitBranch,
  Calendar,
} from "lucide-react";
import { ORIGIN_LABELS, TAREFA_STATUS_CONFIG, PRIORIDADE_CONFIG } from "@/components/shared/backlogConstants";

// ── Ícone de origem ──────────────────────────────────────────────────────────
const ORIGIN_ICONS = {
  reuniao:     { icon: MessageSquare, color: "text-blue-500",   bg: "bg-blue-50" },
  pedido:      { icon: ClipboardList, color: "text-purple-500", bg: "bg-purple-50" },
  manual:      { icon: Wrench,        color: "text-gray-500",   bg: "bg-gray-100" },
  followup:    { icon: GitBranch,     color: "text-cyan-500",   bg: "bg-cyan-50" },
  cronograma:  { icon: Calendar,      color: "text-indigo-500", bg: "bg-indigo-50" },
  consultoria: { icon: Star,          color: "text-amber-500",  bg: "bg-amber-50" },
  diagnostico: { icon: Zap,           color: "text-orange-500", bg: "bg-orange-50" },
  contrato:    { icon: FileText,      color: "text-teal-500",   bg: "bg-teal-50" },
  automacao:   { icon: Zap,           color: "text-pink-500",   bg: "bg-pink-50" },
  projeto:     { icon: GitBranch,     color: "text-violet-500", bg: "bg-violet-50" },
};

// ── Ícone de prioridade (Jira-style) ────────────────────────────────────────
function PriorityIcon({ prioridade }) {
  if (prioridade === "critica") return <AlertTriangle className="h-3.5 w-3.5 text-red-500" title="Crítica" />;
  if (prioridade === "alta")    return <ArrowUp       className="h-3.5 w-3.5 text-orange-500" title="Alta" />;
  if (prioridade === "media")   return <Minus         className="h-3.5 w-3.5 text-yellow-500" title="Média" />;
  return                               <ArrowDown     className="h-3.5 w-3.5 text-blue-400"   title="Baixa" />;
}

// ── Badge de status inline ───────────────────────────────────────────────────
const STATUS_STYLES = {
  aberta:             "bg-gray-100 text-gray-600 border-gray-200",
  em_execucao:        "bg-blue-100 text-blue-700 border-blue-200",
  aguardando_cliente: "bg-amber-100 text-amber-700 border-amber-200",
  bloqueada:          "bg-red-100 text-red-700 border-red-200",
  concluida:          "bg-green-100 text-green-700 border-green-200",
};

const STATUS_ICONS = {
  aberta:             null,
  em_execucao:        Play,
  aguardando_cliente: Clock,
  bloqueada:          Lock,
  concluida:          CheckCircle2,
};

function StatusChip({ status }) {
  const label = TAREFA_STATUS_CONFIG[status]?.label || status;
  const cls   = STATUS_STYLES[status] || "bg-gray-100 text-gray-600 border-gray-200";
  const Icon  = STATUS_ICONS[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${cls}`}>
      {Icon && <Icon className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}

// ── Avatar iniciais ──────────────────────────────────────────────────────────
function Avatar({ name, size = "sm" }) {
  const initials = name
    ? name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const colors = [
    "bg-blue-500", "bg-violet-500", "bg-teal-500", "bg-orange-500",
    "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-amber-500",
  ];
  const colorIdx = name ? name.charCodeAt(0) % colors.length : 0;
  const dim = size === "sm" ? "h-6 w-6 text-[9px]" : "h-7 w-7 text-[10px]";
  return (
    <span className={`inline-flex items-center justify-center rounded-full ${dim} font-bold text-white ${colors[colorIdx]} shrink-0`}>
      {initials}
    </span>
  );
}

// ── Prazo formatado ──────────────────────────────────────────────────────────
function PrazoCell({ prazo, status }) {
  if (!prazo) return <span className="text-xs text-gray-300">—</span>;
  const d      = new Date(prazo);
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  const done   = status === "concluida";
  const late   = !done && d < today;
  const soon   = !done && !late && (d - today) / 86400000 <= 2;

  const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return (
    <span className={`text-xs font-medium tabular-nums ${done ? "text-gray-400 line-through" : late ? "text-red-600" : soon ? "text-amber-600" : "text-gray-500"}`}>
      {label}
    </span>
  );
}

// ── Barra de checklist ───────────────────────────────────────────────────────
function ChecklistProgress({ total, done }) {
  if (!total) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <span className="flex items-center gap-1 text-[10px] text-gray-400 whitespace-nowrap">
      <ListChecks className="h-3 w-3" />
      <span>{done}/{total}</span>
      <span className="relative h-1 w-10 overflow-hidden rounded-full bg-gray-200">
        <span
          className="absolute left-0 top-0 h-full rounded-full bg-green-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  );
}

// ── Código curto (BKL-XXXX) ──────────────────────────────────────────────────
function IssueCode({ id }) {
  const code = id ? id.slice(-6).toUpperCase() : "??????";
  return <span className="font-mono text-[10px] text-gray-400 whitespace-nowrap">#{code}</span>;
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function BacklogIssueRow({ tarefa, onView, isSelected = false }) {
  const originCfg = ORIGIN_ICONS[tarefa.origin_type] || ORIGIN_ICONS.manual;
  const OriginIcon = originCfg.icon;

  return (
    <div
      onClick={() => onView(tarefa)}
      className={`
        group flex w-full cursor-pointer items-center gap-3 border-b border-gray-100
        px-3 py-2.5 text-left transition-colors
        hover:bg-blue-50/60
        ${isSelected ? "bg-blue-50 border-l-2 border-l-blue-500" : "border-l-2 border-l-transparent"}
      `}
    >
      {/* Col 1 — Ícone origem (fixo 28px) */}
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${originCfg.bg}`} title={ORIGIN_LABELS[tarefa.origin_type] || "—"}>
        <OriginIcon className={`h-3.5 w-3.5 ${originCfg.color}`} />
      </span>

      {/* Col 2 — Código (fixo 70px) */}
      <span className="w-[70px] shrink-0">
        <IssueCode id={tarefa.id} />
      </span>

      {/* Col 3 — Título + workshop + checklist (flex-1) */}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className={`truncate text-sm font-medium leading-tight ${tarefa.status === "concluida" ? "text-gray-400 line-through" : "text-gray-900"}`}>
            {tarefa.titulo}
          </span>
          {tarefa.prioridade === "critica" && (
            <span className="shrink-0 rounded bg-red-100 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-700">
              CRÍTICA
            </span>
          )}
        </span>
        <span className="flex items-center gap-2 text-[11px] text-gray-400">
          {tarefa.workshop_nome && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 font-medium truncate max-w-[140px]">
              {tarefa.workshop_nome}
            </span>
          )}
          <ChecklistProgress total={tarefa.checklist_total} done={tarefa.checklist_concluidos || 0} />
        </span>
      </span>

      {/* Col 4 — Prioridade (fixo 24px) */}
      <span className="w-5 shrink-0 flex justify-center">
        <PriorityIcon prioridade={tarefa.prioridade} />
      </span>

      {/* Col 5 — Prazo (fixo 72px) */}
      <span className="w-[72px] shrink-0 text-right">
        <PrazoCell prazo={tarefa.prazo} status={tarefa.status} />
      </span>

      {/* Col 6 — Avatar assignee (fixo 32px) */}
      <span className="w-8 shrink-0 flex justify-center">
        {tarefa.assignee_name
          ? <Avatar name={tarefa.assignee_name} />
          : <span className="h-6 w-6 rounded-full border border-dashed border-gray-300" />
        }
      </span>

      {/* Col 7 — Status badge (fixo 130px) */}
      <span className="w-[130px] shrink-0 flex justify-end">
        <StatusChip status={tarefa.status} />
      </span>
    </div>
  );
}

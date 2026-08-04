import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { differenceInDays } from "date-fns";
import {
  PlayCircle, MousePointerClick, ArrowLeft,
  Phone, MessageCircle, Mail, Video, MapPin,
  ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import WorkshopAvatar from "./followups/ds/WorkshopAvatar";
import OverviewCockpit from "./followups/OverviewCockpit";
import { calcHealthScore } from "./followups/ds/HealthScore";
import { useWorkshopCockpitBootstrap } from "./followups/useWorkshopCockpitBootstrap";

// ── helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr) {
  if (!dateStr) return "—";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "há 1 dia";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1 ? "há 1 mês" : `há ${months} meses`;
}

const CANAL_ICON_MAP = {
  ligacao: Phone, whatsapp: MessageCircle, email: Mail,
  video: Video, meet: Video, presencial: MapPin,
};

const RESULTADO_STYLE = {
  atendeu:     "text-emerald-700 bg-emerald-50 border-emerald-200",
  nao_atendeu: "text-red-700 bg-red-50 border-red-200",
  retornar:    "text-amber-700 bg-amber-50 border-amber-200",
  aguardando:  "text-blue-700 bg-blue-50 border-blue-200",
  agendou:     "text-blue-700 bg-blue-50 border-blue-200",
  reagendou:   "text-purple-700 bg-purple-50 border-purple-200",
  desistiu:    "text-gray-600 bg-gray-50 border-gray-200",
};

const RESULTADO_SHORT = {
  atendeu: "Atendeu", nao_atendeu: "Não atendeu", retornar: "Retornar",
  aguardando: "Aguardando", agendou: "Agendou", reagendou: "Reagendou", desistiu: "Desistiu",
};

// ── D4 · ClientTimeline ───────────────────────────────────────────────────────

function ClientTimeline({ concluidos }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? concluidos : concluidos.slice(0, 3);

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">
        Histórico de Contatos
      </h3>

      {concluidos.length === 0 ? (
        <p className="text-[11px] text-gray-400 text-center py-2">Nenhum contato registrado</p>
      ) : (
        <>
          <div className="space-y-0">
            {shown.map((c, idx) => {
              const canais = c.canal ? c.canal.split(", ").filter(Boolean) : [];
              const Icon = CANAL_ICON_MAP[canais[0]] || MessageCircle;
              const relTime = relativeTime(c.completedAt || c.dataContato);
              const resultStyle = RESULTADO_STYLE[c.resultado] || "text-gray-600 bg-gray-50 border-gray-200";
              const resultLabel = RESULTADO_SHORT[c.resultado] || c.resultado || "—";
              const isLast = idx === shown.length - 1;
              const obsClean = c.observacoes
                ? c.observacoes.replace(/^\[SUPORTE\s+SUP-[^\]]+\]\s*/i, "").trim()
                : null;

              return (
                <div key={c.id} className="flex items-start gap-2.5">
                  <div className="flex flex-col items-center flex-shrink-0 pt-1.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${idx === 0 ? "bg-red-500" : "bg-gray-300"}`} />
                    {!isLast && <div className="w-px flex-1 min-h-[24px] bg-gray-100 mt-1" />}
                  </div>
                  <div className={`flex-1 min-w-0 ${!isLast ? "pb-3" : ""}`}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Icon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${resultStyle}`}>
                        {resultLabel}
                      </span>
                      {c.humor && (
                        <span className="text-[10px] text-gray-400">{c.humor}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{relTime}</p>
                    {obsClean && (
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-[11px] text-gray-600 mt-0.5 leading-snug line-clamp-2 cursor-help">
                              {obsClean}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[360px] bg-white border border-black rounded-lg px-3 py-2 text-[11px] text-gray-700 shadow-md z-[99999] whitespace-pre-wrap leading-relaxed">
                            {obsClean}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {concluidos.length > 3 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors py-1"
            >
              {expanded
                ? <><ChevronUp className="w-3 h-3" /> Mostrar menos</>
                : <><ChevronDown className="w-3 h-3" /> Ver todos ({concluidos.length})</>
              }
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── D5 · IA Insights ─────────────────────────────────────────────────────────

const INSIGHT_STYLE = {
  danger:  "text-red-700 bg-red-50 border-red-200",
  warning: "text-amber-700 bg-amber-50 border-amber-200",
  success: "text-emerald-700 bg-emerald-50 border-emerald-200",
  info:    "text-blue-700 bg-blue-50 border-blue-200",
};

const INSIGHT_DOT = {
  danger: "bg-red-500", warning: "bg-amber-400", success: "bg-emerald-500", info: "bg-blue-400",
};

function generateInsights({ concluidos, atas, reminder, healthScore, isOverdue, daysOver }) {
  const out = [];

  if (isOverdue && daysOver > 0) {
    out.push({ type: "danger", text: `Follow-up vencido há ${daysOver} dia${daysOver !== 1 ? "s" : ""}. Prioridade imediata.` });
  }
  if (healthScore < 40) {
    out.push({ type: "danger", text: "Score de saúde crítico — cliente precisa de atenção urgente." });
  }

  if (concluidos.length === 0) {
    out.push({ type: "info", text: "Nenhum contato registrado. Considere abordagem inicial personalizada." });
  } else {
    const last = concluidos[0];
    const naoAtendeuSeq = concluidos.slice(0, 4).filter(c => c.resultado === "nao_atendeu").length;

    if (naoAtendeuSeq >= 3) {
      out.push({ type: "warning", text: `${naoAtendeuSeq} tentativas consecutivas sem atendimento. Mude horário ou canal.` });
    } else if (last.resultado === "nao_atendeu") {
      out.push({ type: "warning", text: "Último contato sem atendimento. Reagendar próxima tentativa." });
    }

    if (last.humor === "Resistente") {
      out.push({ type: "warning", text: "Cliente demonstrou resistência. Avalie abordagem consultiva." });
    } else if (last.engajamento === "Baixo") {
      out.push({ type: "warning", text: "Engajamento baixo no último contato. Verificar alinhamento do programa." });
    } else if (last.humor === "Animado" || last.engajamento === "Alto") {
      out.push({ type: "success", text: "Cliente engajado! Bom momento para avançar no programa." });
    }

    if (last.resultado === "agendou" && last.proxData) {
      out.push({ type: "info", text: `Próxima reunião agendada para ${last.proxData}.` });
    }
  }

  if (atas.length === 0) {
    out.push({ type: "info", text: "Nenhuma ata registrada. Verificar histórico de sessões." });
  } else if (atas.length >= 5) {
    out.push({ type: "success", text: `${atas.length} reuniões registradas — bom nível de interação.` });
  }

  if (out.length === 0) {
    out.push({ type: "success", text: "Histórico saudável. Manter cadência de follow-ups." });
  }

  return out.slice(0, 4);
}

function IaInsights({ concluidos, atas, allFollowUps, reminder, healthScore, isOverdue, daysOver }) {
  const [expanded, setExpanded] = useState(false);
  const insights = generateInsights({ concluidos, atas, reminder, healthScore, isOverdue, daysOver });
  const hasCritical = insights.some(i => i.type === "danger");

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className={`w-3.5 h-3.5 ${hasCritical ? "text-red-500" : "text-purple-500"}`} />
          <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Análise IA</span>
          {hasCritical && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
          <span className="text-[10px] text-gray-400 font-normal normal-case">
            {insights.length} insight{insights.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-400">{expanded ? "Recolher" : "Expandir"}</span>
          {expanded
            ? <ChevronUp className="w-3 h-3 text-gray-400" />
            : <ChevronDown className="w-3 h-3 text-gray-400" />
          }
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-gray-100 space-y-1.5">
          {insights.map((insight, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 text-[11px] px-2.5 py-2 rounded-lg border ${INSIGHT_STYLE[insight.type]}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${INSIGHT_DOT[insight.type]}`} />
              <span className="leading-snug">{insight.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center space-y-3">
      <MousePointerClick className="w-6 h-6 text-gray-300 mx-auto" />
      <p className="text-sm text-gray-400 leading-snug">
        Clique em um follow-up<br />para ver o cockpit do cliente
      </p>
    </div>
  );
}

// ── CockpitPanelInner ─────────────────────────────────────────────────────────

function CockpitPanelInner({ reminder, seqNum, stats, today, onIniciarAtendimento, onClear }) {
  // RAIZ-429: chaves UNIFICADAS com FollowUpDetail para compartilhar cache entre
  // cockpit e detalhe (mesmo workshop = mesma resposta, 1 read em vez de 2).
  // staleTime 10 min: clicar de volta num cliente já visitado NÃO refaz reads.
  // Bootstrap único: 1 chamada HTTP substitui as 3 queries paralelas
  // (atas + concluidos + followups) e mitiga a cascata de 429 ao clicar
  // em vários follow-ups na Central. staleTime 10 min = clicar de volta
  // num cliente já visitado NÃO refaz reads.
  const { data: bootstrap } = useWorkshopCockpitBootstrap(reminder.workshop_id);
  const atas = bootstrap?.atas ?? [];
  const concluidos = bootstrap?.concluidos ?? [];
  const allFollowUps = bootstrap?.followUps ?? [];

  const isOverdue = !!reminder.reminder_date && reminder.reminder_date < today;
  const daysOver =
    isOverdue && reminder.reminder_date
      ? differenceInDays(new Date(today), new Date(reminder.reminder_date + "T00:00:00"))
      : 0;
  const currentStep = seqNum ?? 1;
  const totalSteps = stats?.total ?? 1;
  const healthScore = calcHealthScore({ reminder, allFollowUps, atas, concluidos, today });

  return (
    <div className="flex flex-col" style={{ maxHeight: "calc(100vh - 5.5rem)" }}>
      {/* E1: CTA no topo — sempre visível acima do conteúdo */}
      <div className="flex-shrink-0 pb-2 mb-1">
        <Button
          onClick={() => onIniciarAtendimento?.(reminder)}
          className="btn-ripple w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 gap-2"
        >
          <PlayCircle className="w-4 h-4" />
          Iniciar Atendimento
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-1">
        {/* Client header */}
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <WorkshopAvatar name={reminder.workshop_name} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate leading-tight">
              {reminder.workshop_name || "Cliente"}
            </p>
            {reminder.consultor_nome && (
              <p className="text-[11px] text-gray-400 truncate mt-0.5">
                {reminder.consultor_nome}
              </p>
            )}
          </div>
          {onClear && (
            <button
              onClick={onClear}
              className="flex-shrink-0 text-[11px] font-semibold text-gray-400 hover:text-gray-700 transition-colors px-2 py-1 rounded flex items-center gap-1"
              title="Voltar à Central Operacional"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Central Operacional
            </button>
          )}
        </div>

        {/* D1–D3: Overview rings + health + progress + stats */}
        <OverviewCockpit
          reminder={reminder}
          allFollowUps={allFollowUps}
          atas={atas}
          concluidos={concluidos}
          today={today}
          currentStep={currentStep}
          totalSteps={totalSteps}
          daysOver={daysOver}
          isOverdue={isOverdue}
          stats={stats}
        />

        {/* D4: Compact contact history timeline */}
        <ClientTimeline concluidos={concluidos} />

        {/* D5: IA insights — collapsed by default */}
        <IaInsights
          concluidos={concluidos}
          atas={atas}
          allFollowUps={allFollowUps}
          reminder={reminder}
          healthScore={healthScore}
          isOverdue={isOverdue}
          daysOver={daysOver}
        />
      </div>

    </div>
  );
}

// ── Guard wrapper ─────────────────────────────────────────────────────────────

export default function CockpitPanel(props) {
  if (!props.reminder) return <EmptyState />;
  return <CockpitPanelInner {...props} />;
}
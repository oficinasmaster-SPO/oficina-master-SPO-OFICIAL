import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  X, Edit2, Clock, Lock, MoreHorizontal, Copy, Archive,
  FileText, ListChecks, Activity as ActivityIcon, StickyNote,
  CheckCircle2, Command
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ActivityFeed from "./ActivityFeed";
import TarefaChecklist from "./TarefaChecklist";
import StatusActionBar from "./StatusActionBar";
import OrigemPedidoBanner from "./banners/OrigemPedidoBanner";
import AguardandoClienteBanner from "./banners/AguardandoClienteBanner";
import UserAvatar from "@/components/shared/UserAvatar";
import WorkshopAvatar from "@/components/aceleracao/followups/ds/WorkshopAvatar";
import useEmployeeResolver from "@/hooks/useEmployeeResolver";
import { useWorkshopLogos } from "@/hooks/useWorkshopLogos";
import {
  TAREFA_STATUS_CONFIG,
  PRIORIDADE_CONFIG,
  ORIGIN_LABELS,
  IMPACTO_CONFIG,
} from "@/components/shared/backlogConstants";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ─────────────────────────────────────────────────────────────
 * Tokens de animação (spring premium)
 * ────────────────────────────────────────────────────────── */
const EASE_OUT = "cubic-bezier(.2,.8,.2,1)";
const EASE_IN  = "cubic-bezier(.4,0,.6,1)";

/* ─────────────────────────────────────────────────────────────
 * Section — bloco padronizado com label
 * ────────────────────────────────────────────────────────── */
function Section({ icon: Icon, label, action, children, tight = false }) {
  return (
    <section className={`px-5 ${tight ? "py-3" : "py-4"}`}>
      <header className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
          {Icon && <Icon className="h-3 w-3" />}
          <span>{label}</span>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Field — chave/valor compacto
 * ────────────────────────────────────────────────────────── */
function Field({ label, children }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">{label}</p>
      <div className="text-sm text-gray-800 truncate">{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * ProgressBar — barra grande e legível
 * ────────────────────────────────────────────────────────── */
function ProgressBar({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = pct === 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-600">
          {done} de {total} concluídos
        </span>
        <span className={`font-semibold tabular-nums ${complete ? "text-emerald-600" : "text-gray-700"}`}>
          {pct}%
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ${
            complete
              ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
              : "bg-gradient-to-r from-blue-500 to-blue-600"
          }`}
          style={{ width: `${pct}%`, transitionTimingFunction: EASE_OUT }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * KebabMenu — dropdown de ações do header
 * ────────────────────────────────────────────────────────── */
function KebabMenu({ onEdit, onDuplicate, onArchive, canEdit }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  if (!canEdit) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="Ações"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg animate-in fade-in-0 zoom-in-95 duration-150"
          style={{ transformOrigin: "top right" }}
        >
          {onEdit && (
            <button
              onClick={() => { setOpen(false); onEdit(); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Edit2 className="h-3.5 w-3.5 text-gray-400" /> Editar
            </button>
          )}
          {onDuplicate && (
            <button
              onClick={() => { setOpen(false); onDuplicate(); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Copy className="h-3.5 w-3.5 text-gray-400" /> Duplicar
            </button>
          )}
          {onArchive && (
            <>
              <div className="h-px bg-gray-100" />
              <button
                onClick={() => { setOpen(false); onArchive(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Archive className="h-3.5 w-3.5 text-gray-400" /> Arquivar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * EscChip — botão "Esc" elegante substituindo o X
 * ────────────────────────────────────────────────────────── */
function EscChip({ onClose }) {
  return (
    <button
      onClick={onClose}
      className="group flex h-7 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 text-[11px] font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 transition-all"
      aria-label="Fechar (Esc)"
      title="Fechar (Esc)"
    >
      <span className="rounded bg-gray-100 px-1 py-[1px] font-mono text-[10px] text-gray-500 group-hover:bg-white group-hover:text-gray-700 transition-colors">
        Esc
      </span>
      <X className="h-3 w-3" />
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
 * COMPONENTE PRINCIPAL
 * ────────────────────────────────────────────────────────── */
export default function BacklogDetailDrawer({
  tarefa,
  user,
  onClose,
  onEdit,
  onDuplicate,
  onArchive,
  hideCloseButton = false,
}) {
  const drawerRef = useRef(null);
  const scrollRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();

  const { getName, getPhoto } = useEmployeeResolver();
  const logosByWorkshop = useWorkshopLogos(tarefa?.workshop_id ? [tarefa.workshop_id] : []);

  /* Animação de entrada montada */
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  /* Escape fecha */
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  /* Detecta scroll para sticky comprimido */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 40);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const STATUS_LABELS = {
    aberta: "Aberta",
    em_execucao: "Em Execução",
    aguardando_cliente: "Aguardando Cliente",
    bloqueada: "Bloqueada",
    concluida: "Concluída",
  };

  const updateMutation = useMutation({
    mutationFn: async (data) => base44.entities.TarefaBacklog.update(tarefa.id, data),
    onSuccess: async (_updated, variables) => {
      // React Query v5 — object syntax
      queryClient.invalidateQueries({ queryKey: ["tarefas-backlog"] });
      queryClient.invalidateQueries({ queryKey: ["activityLogs", "tarefa_backlog", tarefa.id] });
      if (variables?.status && variables.status !== tarefa.status) {
        try {
          await base44.entities.ActivityLog.create({
            entity_type: "tarefa_backlog",
            entity_id: tarefa.id,
            workshop_id: tarefa.workshop_id,
            event_type: "status_changed",
            actor_id: user?.id,
            actor_name: user?.full_name || user?.email,
            field_changed: "status",
            old_value: STATUS_LABELS[tarefa.status] || tarefa.status,
            new_value: STATUS_LABELS[variables.status] || variables.status,
            summary: `Status alterado de ${STATUS_LABELS[tarefa.status] || tarefa.status} para ${STATUS_LABELS[variables.status] || variables.status}`,
            timestamp: new Date().toISOString(),
          });
        } catch (e) { console.error("Erro ao registrar atividade de status", e); }
      }
      toast.success("Tarefa atualizada");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const handleStatusChange = (newStatus) => {
    const extra = {};
    if (newStatus === "concluida")          extra.data_conclusao = new Date().toISOString();
    if (newStatus === "em_execucao")        extra.aguardando_cliente = false;
    if (newStatus === "aguardando_cliente") {
      extra.aguardando_cliente = true;
      extra.aguardando_cliente_desde = new Date().toISOString();
      extra.usuario_aguardo = user?.id;
    }
    updateMutation.mutate({ status: newStatus, ...extra });
  };

  const isInternal = user?.user_type === "internal" || user?.data?.user_type === "internal";
  const canEdit =
    !user ||
    user.role === "admin" ||
    isInternal ||
    user.id === tarefa.created_by_id ||
    user.id === tarefa.assignee_id ||
    user.id === tarefa.assigned_to_id;

  const prazoFmt = tarefa.prazo
    ? format(new Date(tarefa.prazo), "dd/MM/yyyy", { locale: ptBR })
    : "—";

  const criadoFmt = tarefa.data_criacao || tarefa.created_date
    ? format(new Date(tarefa.data_criacao || tarefa.created_date), "dd/MM/yyyy", { locale: ptBR })
    : "—";

  const done = tarefa.checklist_concluidos || 0;
  const total = tarefa.checklist_total || 0;
  const hasChecklist = total > 0;

  const responsavelNome = getName(tarefa.assignee_id, tarefa.assignee_name);
  const responsavelFoto = getPhoto(tarefa.assignee_id);

  /* Estilo animado de entrada (spring translate + fade + micro scale) */
  const enterStyle = useMemo(() => ({
    transform: mounted ? "translateX(0) scale(1)" : "translateX(24px) scale(0.995)",
    opacity: mounted ? 1 : 0,
    transition: `transform 320ms ${EASE_OUT}, opacity 260ms ${EASE_OUT}`,
    willChange: "transform, opacity",
  }), [mounted]);

  return (
    <aside
      ref={drawerRef}
      style={enterStyle}
      className="flex h-full flex-col bg-white border-l border-gray-100 overflow-hidden shadow-[-8px_0_24px_-16px_rgba(15,23,42,0.12)]"
    >
      {/* ─────────── Header sticky (compressível) ─────────── */}
      <div
        className={`shrink-0 border-b bg-white transition-all ${
          scrolled ? "border-gray-200 shadow-[0_2px_8px_-4px_rgba(15,23,42,0.08)]" : "border-gray-100"
        }`}
        style={{ transitionDuration: "240ms", transitionTimingFunction: EASE_OUT }}
      >
        {/* Linha 1: breadcrumb + ações — some no scroll */}
        <div
          className="grid overflow-hidden transition-all"
          style={{
            gridTemplateRows: scrolled ? "0fr" : "1fr",
            transitionDuration: "240ms",
            transitionTimingFunction: EASE_OUT,
          }}
        >
          <div className="min-h-0">
            <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-mono text-[11px] text-gray-400">
                  #{tarefa.id?.slice(-6).toUpperCase()}
                </span>
                {tarefa.origin_type && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="truncate text-[11px] text-gray-500">
                      {ORIGIN_LABELS[tarefa.origin_type] || tarefa.origin_type}
                    </span>
                  </>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <KebabMenu
                  canEdit={canEdit}
                  onEdit={onEdit ? () => onEdit(tarefa) : undefined}
                  onDuplicate={onDuplicate ? () => onDuplicate(tarefa) : undefined}
                  onArchive={onArchive ? () => onArchive(tarefa) : undefined}
                />
                {!hideCloseButton && <EscChip onClose={onClose} />}
              </div>
            </div>
          </div>
        </div>

        {/* Título — sempre visível, encolhe no scroll */}
        <div className="px-5 pb-2">
          <h2
            className={`font-bold leading-tight text-gray-950 transition-[font-size] ${
              tarefa.status === "concluida" ? "text-gray-400 line-through" : ""
            } ${scrolled ? "text-[15px] pt-2" : "text-lg pt-1"}`}
            style={{ transitionDuration: "220ms", transitionTimingFunction: EASE_OUT }}
          >
            {tarefa.titulo}
          </h2>
        </div>

        {/* Meta-row — some no scroll */}
        <div
          className="grid overflow-hidden transition-all"
          style={{
            gridTemplateRows: scrolled ? "0fr" : "1fr",
            transitionDuration: "240ms",
            transitionTimingFunction: EASE_OUT,
          }}
        >
          <div className="min-h-0">
            <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
              <Badge
                variant="outline"
                className={`text-[10.5px] font-medium ${PRIORIDADE_CONFIG[tarefa.prioridade]?.className || ""}`}
              >
                {PRIORIDADE_CONFIG[tarefa.prioridade]?.label || tarefa.prioridade}
              </Badge>
              {tarefa.prazo && (
                <span className="flex items-center gap-1 text-[11.5px] text-gray-500">
                  <Clock className="h-3 w-3" /> {prazoFmt}
                </span>
              )}
              {tarefa.workshop_nome && (
                <span className="flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-0.5 ring-1 ring-inset ring-gray-100">
                  <WorkshopAvatar
                    name={tarefa.workshop_nome}
                    logo_url={logosByWorkshop[tarefa.workshop_id]}
                    size="sm"
                    className="!w-4 !h-4 !text-[7px]"
                  />
                  <span className="text-[11px] font-medium text-gray-700">{tarefa.workshop_nome}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* StatusActionBar — sempre presente */}
        <StatusActionBar
          tarefa={tarefa}
          onStatusChange={handleStatusChange}
          isPending={updateMutation.isPending}
        />
      </div>

      {/* ─────────── Conteúdo em fluxo único ─────────── */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-50">
          {/* Banners contextuais */}
          {(tarefa.origin_id || tarefa.aguardando_cliente) && (
            <div className="space-y-1.5 px-5 py-3">
              <OrigemPedidoBanner tarefa={tarefa} compact />
              <AguardandoClienteBanner tarefa={tarefa} compact />
            </div>
          )}

          {/* Descrição */}
          <Section icon={FileText} label="Descrição">
            {tarefa.descricao ? (
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-gray-700">
                {tarefa.descricao}
              </p>
            ) : (
              <p className="text-sm italic text-gray-400">Sem descrição.</p>
            )}
          </Section>

          {/* Progresso do checklist (destaque grande) */}
          {hasChecklist && (
            <Section icon={CheckCircle2} label="Progresso" tight>
              <ProgressBar done={done} total={total} />
            </Section>
          )}

          {/* Checklist inline — sem aba */}
          <Section icon={ListChecks} label="Checklist">
            <TarefaChecklist
              tarefaId={tarefa.id}
              workshopId={tarefa.workshop_id}
              user={user}
            />
          </Section>

          {/* Campos — grid responsivo */}
          <Section label="Detalhes" tight>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
              <Field label="Responsável">
                <div className="flex items-center gap-2">
                  <UserAvatar src={responsavelFoto} name={responsavelNome} size="sm" />
                  <span className="truncate">{responsavelNome}</span>
                </div>
              </Field>
              <Field label="Cliente">
                <div className="flex items-center gap-2">
                  <WorkshopAvatar
                    name={tarefa.workshop_nome || "—"}
                    logo_url={logosByWorkshop[tarefa.workshop_id]}
                    size="sm"
                  />
                  <span className="truncate">{tarefa.workshop_nome || "—"}</span>
                </div>
              </Field>
              <Field label="Criado em">{criadoFmt}</Field>
              <Field label="Prazo">{prazoFmt}</Field>
              <Field label="Estimativa">
                {tarefa.tempo_estimado_horas ? `${tarefa.tempo_estimado_horas}h` : "—"}
              </Field>
              <Field label="Origem">{ORIGIN_LABELS[tarefa.origin_type] || "—"}</Field>
              <Field label="Impacto">{IMPACTO_CONFIG[tarefa.impacto] || "—"}</Field>
              {tarefa.tempo_real_horas && (
                <Field label="Tempo Real">{tarefa.tempo_real_horas}h</Field>
              )}
              {tarefa.data_conclusao && (
                <Field label="Concluído em">
                  <span className="font-medium text-emerald-700">
                    {format(new Date(tarefa.data_conclusao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </Field>
              )}
            </div>
          </Section>

          {/* Atividade */}
          <Section icon={ActivityIcon} label="Atividade">
            <ActivityFeed
              entityType="tarefa_backlog"
              entityId={tarefa.id}
              workshopId={tarefa.workshop_id}
            />
          </Section>

          {/* Notas */}
          {tarefa.notas && (
            <Section icon={StickyNote} label="Notas">
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-gray-700">
                {tarefa.notas}
              </p>
            </Section>
          )}

          {/* Bloqueio */}
          {tarefa.motivo_bloqueio && (
            <div className="px-5 py-4">
              <div className="rounded-lg border border-red-100 bg-red-50/70 px-4 py-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-red-700">
                  <Lock className="h-3 w-3" /> Motivo do bloqueio
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-red-900">
                  {tarefa.motivo_bloqueio}
                </p>
              </div>
            </div>
          )}

          {/* Padding bottom para respiro */}
          <div className="h-6" />
        </div>
      </div>
    </aside>
  );
}
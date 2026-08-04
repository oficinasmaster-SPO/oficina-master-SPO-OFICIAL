import React, { useRef, useEffect } from "react";
import { X, Edit2, Clock, Lock } from "lucide-react";
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

// ── Aba ativa ────────────────────────────────────────────────────────────────
function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? "text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-t after:bg-blue-600"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
    </button>
  );
}

// ── Campo info ────────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function BacklogDetailDrawer({ tarefa, user, onClose, onEdit, hideCloseButton = false }) {
  const [activeTab, setActiveTab] = React.useState("detalhes");
  const drawerRef = useRef(null);
  const queryClient = useQueryClient();

  // Resolvers canônicos de nomes/fotos (Employee + logos de workshop)
  const { getName, getPhoto } = useEmployeeResolver();
  const logosByWorkshop = useWorkshopLogos(tarefa?.workshop_id ? [tarefa.workshop_id] : []);

  // Fechar com Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const STATUS_LABELS = {
    aberta: "Aberta", em_execucao: "Em Execução",
    aguardando_cliente: "Aguardando Cliente", bloqueada: "Bloqueada", concluida: "Concluída",
  };

  const updateMutation = useMutation({
    mutationFn: async (data) =>
      base44.entities.TarefaBacklog.update(tarefa.id, data),
    onSuccess: async (_updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tarefas-backlog"] });
      queryClient.invalidateQueries({ queryKey: ["activityLogs", "tarefa_backlog", tarefa.id] });
      // Registra a mudança de status na aba Atividade
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
        } catch (e) {
          console.error("Erro ao registrar atividade de status", e);
        }
      }
      toast.success("Tarefa atualizada");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const handleStatusChange = (newStatus) => {
    const extra = {};
    if (newStatus === "concluida")         extra.data_conclusao = new Date().toISOString();
    if (newStatus === "em_execucao")       extra.aguardando_cliente = false;
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

  const pct =
    tarefa.checklist_total > 0
      ? Math.round(((tarefa.checklist_concluidos || 0) / tarefa.checklist_total) * 100)
      : 0;

  const responsavelNome = getName(tarefa.assignee_id, tarefa.assignee_name);
  const responsavelFoto = getPhoto(tarefa.assignee_id);

  return (
    <aside
      ref={drawerRef}
      className="flex h-full flex-col bg-white border-l border-gray-100 animate-in slide-in-from-right duration-200 overflow-hidden"
    >
        {/* ── Header ── */}
        <div className="flex shrink-0 flex-col border-b border-gray-100">
          {/* Linha 1: breadcrumb + ações */}
          <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-xs text-gray-400">
                #{tarefa.id?.slice(-6).toUpperCase()}
              </span>
              {tarefa.origin_type && (
                <>
                  <span className="text-gray-300">/</span>
                  <span className="text-xs text-gray-500">
                    {ORIGIN_LABELS[tarefa.origin_type] || tarefa.origin_type}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {canEdit && onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(tarefa)}
                  className="h-7 gap-1.5 px-2 text-xs text-gray-500"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Editar
                </Button>
              )}
              {!hideCloseButton && (
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Linha 2: título */}
          <div className="px-5 pb-3">
            <h2
              className={`text-lg font-bold leading-tight text-gray-950 ${
                tarefa.status === "concluida" ? "text-gray-400 line-through" : ""
              }`}
            >
              {tarefa.titulo}
            </h2>
          </div>

          {/* Linha 3: meta-row (prioridade · prazo · cliente com logo · checklist) */}
          <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
            <Badge
              variant="outline"
              className={`text-[10px] ${PRIORIDADE_CONFIG[tarefa.prioridade]?.className || ""}`}
            >
              {PRIORIDADE_CONFIG[tarefa.prioridade]?.label || tarefa.prioridade}
            </Badge>
            {tarefa.prazo && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" /> {prazoFmt}
              </span>
            )}
            {tarefa.workshop_nome && (
              <span className="flex items-center gap-1.5 rounded bg-gray-100 px-2 py-0.5">
                <WorkshopAvatar
                  name={tarefa.workshop_nome}
                  logo_url={logosByWorkshop[tarefa.workshop_id]}
                  size="sm"
                  className="!w-4 !h-4 !text-[7px]"
                />
                <span className="text-[11px] font-medium text-gray-700">{tarefa.workshop_nome}</span>
              </span>
            )}
            {tarefa.checklist_total > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                  <span
                    className="absolute left-0 top-0 h-full rounded-full bg-green-500"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                {tarefa.checklist_concluidos || 0}/{tarefa.checklist_total}
              </span>
            )}
          </div>
        </div>

        {/* ── Barra de ação contextual (substitui o dropdown de status) ── */}
        <StatusActionBar
          tarefa={tarefa}
          onStatusChange={handleStatusChange}
          isPending={updateMutation.isPending}
        />

        {/* ── Abas ── */}
        <div className="flex shrink-0 border-b border-gray-100 px-3">
          <Tab label="Detalhes"  active={activeTab === "detalhes"}  onClick={() => setActiveTab("detalhes")} />
          <Tab label="Checklist" active={activeTab === "checklist"} onClick={() => setActiveTab("checklist")} />
        </div>

        {/* ── Conteúdo das abas ── */}
        <div className="min-h-0 flex-1 overflow-y-auto">

          {/* DETALHES */}
          {activeTab === "detalhes" && (
            <div className="divide-y divide-gray-50">
              {/* Banners contextuais */}
              <div className="px-5 py-3 space-y-1.5">
                <OrigemPedidoBanner tarefa={tarefa} compact />
                <AguardandoClienteBanner tarefa={tarefa} compact />
              </div>

              {/* Descrição */}
              {tarefa.descricao && (
                <div className="px-5 py-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">Descrição</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{tarefa.descricao}</p>
                </div>
              )}

              {/* Grid de campos */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4">
                <Field label="Responsável">
                  <div className="flex items-center gap-2">
                    <UserAvatar src={responsavelFoto} name={responsavelNome} size="sm" />
                    <span>{responsavelNome}</span>
                  </div>
                </Field>
                <Field label="Cliente">
                  <div className="flex items-center gap-2">
                    <WorkshopAvatar
                      name={tarefa.workshop_nome || "—"}
                      logo_url={logosByWorkshop[tarefa.workshop_id]}
                      size="sm"
                    />
                    <span>{tarefa.workshop_nome || "—"}</span>
                  </div>
                </Field>
                <Field label="Criado em">{criadoFmt}</Field>
                <Field label="Prazo">{prazoFmt}</Field>
                <Field label="Estimativa">{tarefa.tempo_estimado_horas ? `${tarefa.tempo_estimado_horas}h` : "—"}</Field>
                <Field label="Origem">{ORIGIN_LABELS[tarefa.origin_type] || "—"}</Field>
                <Field label="Impacto">{IMPACTO_CONFIG[tarefa.impacto] || "—"}</Field>
                {tarefa.tempo_real_horas && (
                  <Field label="Tempo Real">{tarefa.tempo_real_horas}h</Field>
                )}
                {tarefa.data_conclusao && (
                  <Field label="Concluído em">
                    <span className="text-green-700 font-medium">
                      {format(new Date(tarefa.data_conclusao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </Field>
                )}
              </div>

              {/* ── Divisor com fade ── */}
              <div className="px-5 py-2">
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
              </div>

              {/* ── Atividade (inline) ── */}
              <div className="px-5 py-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-2">Atividade</p>
                <ActivityFeed
                  entityType="tarefa_backlog"
                  entityId={tarefa.id}
                  workshopId={tarefa.workshop_id}
                />
              </div>

              {/* Motivo bloqueio */}
              {tarefa.motivo_bloqueio && (
                <div className="mx-5 my-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
                    <Lock className="h-3.5 w-3.5" /> Motivo do bloqueio
                  </p>
                  <p className="mt-1 text-sm text-red-800">{tarefa.motivo_bloqueio}</p>
                </div>
              )}

              {/* Notas */}
              {tarefa.notas && (
                <div className="px-5 py-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">Notas</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{tarefa.notas}</p>
                </div>
              )}
            </div>
          )}

          {/* CHECKLIST */}
          {activeTab === "checklist" && (
            <div className="px-5 py-4">
              <TarefaChecklist
                tarefaId={tarefa.id}
                workshopId={tarefa.workshop_id}
                user={user}
              />
            </div>
          )}
        </div>
    </aside>
  );
}
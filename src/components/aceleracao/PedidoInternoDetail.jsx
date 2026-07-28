import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, CheckCircle, XCircle, Printer,
  FileText, ListChecks,
  AlertTriangle, ArrowUp, Minus, ArrowDown,
  Clock, CalendarClock, Hash, Building2,
  Edit2, ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import ActivityFeed from "./ActivityFeed";
import PedidoInternoStepper from "./PedidoInternoStepper";
import StatusBadge from "@/components/shared/StatusBadge";
import PriorityBadge from "@/components/shared/PriorityBadge";
import useEmployeeResolver from "@/hooks/useEmployeeResolver";
import AttachmentGallery from "./AttachmentGallery";
import {
  PEDIDO_STATUS_CONFIG,
  TIPO_PEDIDO_LABELS, IMPACTO_CLIENTE_LABELS,
} from "@/components/shared/backlogConstants";

// ── Helpers visuais ────────────────────────────────────────────────────────
const STATUS_PILL_CLS = {
  pendente:   "bg-gray-100 text-gray-700 border-gray-200",
  em_analise: "bg-blue-100 text-blue-700 border-blue-200",
  aprovado:   "bg-green-100 text-green-700 border-green-200",
  recusado:   "bg-red-100 text-red-700 border-red-200",
  concluido:  "bg-purple-100 text-purple-700 border-purple-200",
};

function StatusPill({ status }) {
  const label = PEDIDO_STATUS_CONFIG[status]?.label || status;
  const cls   = STATUS_PILL_CLS[status] || "bg-gray-100 text-gray-600 border-gray-200";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

function AvatarWithPhoto({ name, photoUrl, size = "sm" }) {
  const initials = name ? name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  const COLORS = ["bg-blue-500","bg-violet-500","bg-teal-500","bg-orange-500","bg-pink-500","bg-cyan-500","bg-indigo-500","bg-amber-500"];
  const ci = name ? name.charCodeAt(0) % COLORS.length : 0;
  const dim = size === "md" ? "h-7 w-7 text-[11px]" : "h-5 w-5 text-[9px]";

  if (photoUrl) {
    return (
      <span className={`relative ${dim} shrink-0`}>
        <span className={`absolute inset-0 inline-flex items-center justify-center rounded-full font-bold text-white ${COLORS[ci]}`}>{initials}</span>
        <img
          src={photoUrl}
          alt={name || ""}
          className={`relative ${dim} rounded-full object-cover ring-1 ring-gray-200`}
          onError={(e) => { e.target.style.display = "none"; }}
        />
      </span>
    );
  }
  return <span className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-full font-bold text-white ${COLORS[ci]}`}>{initials}</span>;
}

function InfoField({ label, icon: Icon, children, className = "" }) {
  if (!children) return null;
  return (
    <div className={`flex items-start gap-2 ${className}`}>
      {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <div className="mt-0.5 text-sm text-gray-800">{children}</div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function PedidoInternoDetail({ 
  pedido, 
  user, 
  totalPedidos = 0,
  currentIndex = 0,
  onNavigate,
  onEdit,
  onCancel, 
  onSuccess 
}) {
  const queryClient = useQueryClient();
  const { getName, getPhoto } = useEmployeeResolver();

  // Navegação por setas do teclado
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowUp" && onNavigate) onNavigate("prev");
      if (e.key === "ArrowDown" && onNavigate) onNavigate("next");
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onNavigate]);

  const { data: tarefas = [] } = useQuery({
    queryKey: ["tarefas-pedido", pedido.id],
    queryFn: async () => {
      const r = await base44.entities.TarefaBacklog.filter(
        { origin_type: "pedido", origin_id: pedido.id }, "-created_date", 50
      );
      return Array.isArray(r) ? r : [];
    },
    enabled: !!pedido.id,
  });

  const isReadOnly = ["concluido", "recusado"].includes(pedido.status);
  const isInternal = user?.user_type === "internal" || user?.data?.user_type === "internal";
  const canRespond = user?.id === pedido.assignee_id || user?.role === "admin" || isInternal;
  const canEdit    = canRespond;

  const criadoEm  = pedido.created_date || pedido.data_criacao;
  const criadoFmt = criadoEm ? format(new Date(criadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—";
  const slaLabel  = criadoEm ? formatDistanceToNow(new Date(criadoEm), { locale: ptBR }) : null;
  const prazoFmt  = pedido.prazo ? format(new Date(pedido.prazo), "dd/MM/yyyy", { locale: ptBR }) : null;
  const isVencido = pedido.prazo && !isReadOnly && new Date(pedido.prazo) < new Date();

  // Nomes resolvidos
  const requesterName = getName(pedido.requester_id, pedido.requester_name);
  const requesterPhoto = getPhoto(pedido.requester_id);
  const assigneeName = getName(pedido.assignee_id, pedido.assignee_name);
  const assigneePhoto = getPhoto(pedido.assignee_id);

  const done = tarefas.filter(t => t.status === "concluida").length;

  // ── Formatação de Anexos para a nova AttachmentGallery ─────────────────
  const medias = pedido?.midias_anexas || [];
  const arquivosFormatados = medias.map(media => {
    // Nova inteligência: Tenta extrair do NOME primeiro (mais confiável), depois da URL
    const extNome = media.nome?.split('.').pop()?.toLowerCase();
    const extUrl = media.url?.split('.').pop()?.split('?')[0]?.toLowerCase();

    // Se a extensão extraída do nome for muito grande, não é extensão.
    const validExtNome = extNome?.length <= 4 ? extNome : null;

    return {
      id: media.id || Math.random().toString(),
      url: media.url,
      name: media.nome,
      type: media.type === "imagem" ? "image" : media.type === "link" ? "link" : "document",
      mimeType: media.mimeType,
      size: media.size,
      extension: media.extension || validExtNome || extUrl || "", // Acha o PDF em qualquer lugar!
      createdBy: media.createdBy || "Sistema",
      origin: "Anexo do Pedido"
    };
  });

  const recusarMutation = useMutation({
    mutationFn: async () => base44.entities.PedidoInterno.update(pedido.id, {
      status: "recusado",
      data_primeira_resposta: pedido.data_primeira_resposta || new Date().toISOString(),
    }),
    onSuccess: () => { toast.success("Pedido recusado."); queryClient.invalidateQueries({ queryKey: ["pedidos-internos"] }); onSuccess?.(); },
    onError: () => toast.error("Erro ao recusar"),
  });

  const NEXT_STATUS = { pendente: "em_analise", em_analise: "aprovado", aprovado: "concluido" };
  const NEXT_LABEL = { pendente: "Iniciar Análise", em_analise: "Aprovar", aprovado: "Concluir" };
  const nextStatus = NEXT_STATUS[pedido.status];

  const advanceMutation = useMutation({
    mutationFn: async () => {
      const data = { status: nextStatus };
      if (nextStatus === "concluido") data.data_conclusao = new Date().toISOString();
      return base44.entities.PedidoInterno.update(pedido.id, data);
    },
    onSuccess: () => { toast.success("Status atualizado!"); queryClient.invalidateQueries({ queryKey: ["pedidos-internos"] }); },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-gray-200">
        {/* Linha 1: voltar + código + título + controles (Nav/Editar) + status */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2 pr-14">
          
          <div className="flex items-start gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={onCancel} className="mt-0.5 h-7 w-7 shrink-0 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="flex items-center gap-1 font-mono text-[11px] font-semibold text-gray-400">
                  <Hash className="h-3 w-3" />{pedido.codigo || `#${pedido.id?.slice(-6).toUpperCase()}`}
                </span>
                {pedido.tipo && (
                  <><span className="text-gray-300">·</span><span className="text-[11px] text-gray-400 capitalize">{pedido.tipo?.replace(/_/g, " ")}</span></>
                )}
              </div>
              <h2 className={`text-base font-bold leading-snug ${isReadOnly ? "text-gray-400" : "text-gray-950"}`}>{pedido.titulo}</h2>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-1">
              {canEdit && onEdit && (
                <Button variant="ghost" size="sm" onClick={() => onEdit(pedido)} className="h-7 gap-1.5 px-2 text-xs text-gray-500">
                  <Edit2 className="h-3 w-3" /> Editar
                </Button>
              )}
              {onNavigate && (
                <div className="flex items-center gap-0.5 rounded-md border border-gray-200 bg-gray-50 p-0.5">
                  <button 
                    onClick={() => onNavigate("prev")} 
                    disabled={currentIndex === 0} 
                    className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-200 disabled:opacity-30"
                    title="Anterior (↑)"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[9px] text-gray-500 px-1 font-medium">{currentIndex + 1}/{totalPedidos}</span>
                  <button 
                    onClick={() => onNavigate("next")} 
                    disabled={currentIndex === totalPedidos - 1} 
                    className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-200 disabled:opacity-30"
                    title="Próximo (↓)"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            <StatusPill status={pedido.status} />
          </div>

        </div>

        {/* Linha 2: meta-row com fotos */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pb-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-gray-400">De</span>
            <AvatarWithPhoto name={requesterName} photoUrl={requesterPhoto} />
            <span className="font-medium text-gray-700">{requesterName}</span>
          </div>
          <span className="h-3 w-px bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-gray-400">Para</span>
            <AvatarWithPhoto name={assigneeName} photoUrl={assigneePhoto} />
            <span className="font-medium text-gray-700">{assigneeName}</span>
          </div>
          <span className="h-3 w-px bg-gray-200" />
          <PriorityBadge prioridade={pedido.prioridade} />
          {slaLabel && (
            <>
              <span className="h-3 w-px bg-gray-200" />
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${isVencido ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                {isVencido ? `Vencido há ${slaLabel}` : `Aberto há ${slaLabel}`}
              </span>
            </>
          )}
          <div className="ml-auto flex items-center gap-1 text-gray-400">
            <CalendarClock className="h-3 w-3" />
            <span className="text-[10px]">{criadoFmt}</span>
          </div>
        </div>

        {/* Linha 3: Stepper clicável */}
        <div className="border-t border-gray-100 px-5 py-2.5">
          <PedidoInternoStepper pedido={pedido} />
        </div>
      </div>

      {/* ── SPLIT PRINCIPAL: Atividade (60%) | Detalhes+Tarefas (40%) ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ESQUERDA: Atividade */}
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 space-y-3">
            {pedido.descricao && (
              <div className="rounded-lg border border-[#e6e6a3] bg-[#FFFF99]/30 p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#999933]">Descrição</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#b3b34d]">{pedido.descricao}</p>
              </div>
            )}
            <ActivityFeed
              entityType="pedido_interno"
              entityId={pedido.id}
              workshopId={pedido.workshop_id}
              maxHeight="100%"
            />
          </div>
        </div>

        {/* DIREITA: Detalhes + Tarefas */}
        <div className="w-[320px] shrink-0 overflow-y-auto bg-gray-50/50">

          {/* Resposta oficial */}
          {pedido.resposta && (
            <div className={`mx-3 my-3 rounded-lg border p-3 ${pedido.status === "recusado" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
              <p className={`mb-1 text-[10px] font-bold uppercase tracking-wide ${pedido.status === "recusado" ? "text-red-500" : "text-green-600"}`}>
                {pedido.status === "recusado" ? "Motivo da Recusa" : "Resposta Oficial"}
              </p>
              <p className="whitespace-pre-wrap text-sm text-gray-800">{pedido.resposta}</p>
            </div>
          )}

          {/* Informações */}
          <div className="border-b border-gray-100 px-4 py-3 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Informações</p>
            <InfoField label="Cliente"    icon={Building2}>{pedido.workshop_nome || "—"}</InfoField>
            <InfoField label="Categoria"  icon={FileText}>{TIPO_PEDIDO_LABELS[pedido.tipo] || pedido.tipo || "—"}</InfoField>
            <InfoField label="Prazo" icon={Clock}>
              {prazoFmt ? <span className={isVencido ? "font-semibold text-red-600" : ""}>{prazoFmt}</span> : "—"}
            </InfoField>
            {pedido.impacto_cliente && (
              <InfoField label="Impacto" icon={AlertTriangle}>{IMPACTO_CLIENTE_LABELS[pedido.impacto_cliente] || pedido.impacto_cliente}</InfoField>
            )}
            {pedido.data_conclusao && (
              <InfoField label="Concluído em" icon={CheckCircle}>
                <span className="font-medium text-green-700">{format(new Date(pedido.data_conclusao), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
              </InfoField>
            )}
          </div>

          {/* Nova Galeria de Anexos */}
          {arquivosFormatados.length > 0 && (
            <div className="border-b border-gray-100 px-4 py-4">
              <AttachmentGallery files={arquivosFormatados} />
            </div>
          )}

          {/* Tarefas geradas */}
          <div className="px-4 py-3">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
              <ListChecks className="h-3 w-3" />
              Tarefas Geradas ({tarefas.length})
            </p>
            {tarefas.length > 0 && (
              <div className="mb-3 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${tarefas.length > 0 ? Math.round(done / tarefas.length * 100) : 0}%` }} />
                </div>
                <span className="text-[10px] text-gray-500">{done}/{tarefas.length}</span>
              </div>
            )}
            {tarefas.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nenhuma tarefa gerada</p>
            ) : (
              <div className="space-y-1.5">
                {tarefas.map(t => (
                  <div key={t.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5
                    ${t.status === "concluida" ? "border-green-200 bg-green-50" : "border-gray-200 bg-white shadow-sm"}`}>
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full
                      ${t.status === "concluida" ? "bg-green-500" : "bg-gray-200"}`}>
                      {t.status === "concluida" ? <CheckCircle className="h-2.5 w-2.5 text-white" /> : <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />}
                    </span>
                    <span className={`flex-1 truncate text-xs ${t.status === "concluida" ? "text-gray-400 line-through" : "text-gray-700"}`}>{t.titulo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-5 py-2">
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => window.print()} className="h-7 gap-1 px-2 text-xs text-gray-400">
            <Printer className="h-3 w-3" /> Imprimir
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {canRespond && pedido.status === "pendente" && (
            <Button variant="ghost" size="sm"
              onClick={() => { if (window.confirm("Esta ação não pode ser desfeita. Deseja recusar este pedido?")) recusarMutation.mutate(); }}
              disabled={recusarMutation.isPending}
              className="h-7 gap-1 text-xs text-red-500 hover:bg-red-50">
              <XCircle className="h-3.5 w-3.5" /> Recusar
            </Button>
          )}
          {canRespond && !isReadOnly && nextStatus ? (
            <Button size="sm"
              onClick={() => advanceMutation.mutate()}
              disabled={advanceMutation.isPending}
              className="h-7 gap-1 text-xs bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-3.5 w-3.5" /> {NEXT_LABEL[pedido.status]}
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCancel}>Fechar</Button>
          )}
        </div>
      </div>
    </div>
  );
}
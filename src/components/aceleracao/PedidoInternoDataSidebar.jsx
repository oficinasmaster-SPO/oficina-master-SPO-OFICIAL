import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Building2, User, UserCheck, Tag, Flag, Clock,
  CheckCircle, Circle, FileText, Paperclip, ListChecks, AlertCircle,
} from "lucide-react";
import {
  TIPO_PEDIDO_LABELS, IMPACTO_CLIENTE_LABELS,
} from "@/components/shared/backlogConstants";
import PriorityBadge from "@/components/shared/PriorityBadge";
import StatusBadge from "@/components/shared/StatusBadge";

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-gray-400">{label}</p>
        <div className="text-sm text-gray-800">{children}</div>
      </div>
    </div>
  );
}

export default function PedidoInternoDataSidebar({ pedido }) {
  const { data: tarefas = [] } = useQuery({
    queryKey: ["tarefas-pedido", pedido.id],
    queryFn: async () => {
      const result = await base44.entities.TarefaBacklog.filter(
        { origin_type: "pedido", origin_id: pedido.id },
        "-created_date",
        50
      );
      return Array.isArray(result) ? result : [];
    },
    enabled: !!pedido.id,
  });

  const medias = pedido.midias_anexas || [];

  return (
    <div className="space-y-3">
      {/* Informações */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Informações</h3>
        <InfoRow icon={Building2} label="Cliente">{pedido.workshop_nome || "—"}</InfoRow>
        <InfoRow icon={User} label="Solicitante">{pedido.requester_name || "—"}</InfoRow>
        <InfoRow icon={UserCheck} label="Responsável">{pedido.assignee_name || "—"}</InfoRow>
        <InfoRow icon={Tag} label="Categoria">{TIPO_PEDIDO_LABELS[pedido.tipo] || pedido.tipo || "—"}</InfoRow>
        <InfoRow icon={Flag} label="Prioridade"><PriorityBadge prioridade={pedido.prioridade} className="text-[10px]" /></InfoRow>
        <InfoRow icon={Clock} label="Prazo">{pedido.prazo ? new Date(pedido.prazo).toLocaleDateString("pt-BR") : "—"}</InfoRow>
        <InfoRow icon={CheckCircle} label="Status"><StatusBadge entity="pedido" status={pedido.status} className="text-[10px]" /></InfoRow>
        {pedido.impacto_cliente && (
          <InfoRow icon={AlertCircle} label="Impacto no Cliente">{IMPACTO_CLIENTE_LABELS[pedido.impacto_cliente] || pedido.impacto_cliente}</InfoRow>
        )}
      </div>

      {/* Descrição */}
      {pedido.descricao && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Descrição</h3>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{pedido.descricao}</p>
        </div>
      )}

      {/* Resposta registrada */}
      {pedido.resposta && (
        <div className={`rounded-lg border p-4 ${pedido.status === "recusado" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
          <h3 className={`mb-2 text-xs font-bold uppercase tracking-wide ${pedido.status === "recusado" ? "text-red-400" : "text-green-600"}`}>
            {pedido.status === "recusado" ? "Recusa" : "Resposta"}
          </h3>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{pedido.resposta}</p>
        </div>
      )}

      {/* Tarefas Geradas */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-400">
          <ListChecks className="h-3.5 w-3.5" />
          Tarefas Geradas ({tarefas.length})
        </h3>
        {tarefas.length === 0 ? (
          <p className="text-xs text-gray-400">Nenhuma tarefa gerada ainda.</p>
        ) : (
          <div className="space-y-2">
            {tarefas.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                {t.status === "concluida" ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 flex-shrink-0 text-gray-300" />
                )}
                <span className="flex-1 truncate text-sm text-gray-700">{t.titulo}</span>
                <StatusBadge entity="tarefa" status={t.status} className="text-[9px]" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Arquivos */}
      {medias.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-400">
            <Paperclip className="h-3.5 w-3.5" />
            Arquivos ({medias.length})
          </h3>
          <div className="space-y-1.5">
            {medias.map((m, idx) => (
              <a
                key={idx}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <FileText className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                <span className="flex-1 truncate">{m.nome || "arquivo"}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
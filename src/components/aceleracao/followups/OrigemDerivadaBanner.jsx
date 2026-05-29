/**
 * OrigemDerivadaBanner — Banner contextual no IniciarAtendimentoModal
 *
 * Exibido quando followUp.origin_type é 'tarefa_backlog' ou 'pedido_interno'.
 * Mostra contexto do item de origem + botão para ver ATA.
 */
import React, { useState, useEffect } from "react";
import { FileText, ExternalLink, User, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isOrigemDerivadaFlow, getOrigemLabel, getOrigemBadgeStyle } from "@/utils/followUpOrigemHelper";
import { base44 } from "@/api/base44Client";

const STATUS_LABELS = {
  aberta: 'Aberta',
  em_execucao: 'Em Execução',
  bloqueada: 'Bloqueada',
  concluida: 'Concluída',
  pendente: 'Pendente',
  em_analise: 'Em Análise',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const STATUS_COLORS = {
  aberta: 'bg-blue-100 text-blue-700',
  em_execucao: 'bg-orange-100 text-orange-700',
  bloqueada: 'bg-red-100 text-red-700',
  concluida: 'bg-green-100 text-green-700',
  concluido: 'bg-green-100 text-green-700',
  pendente: 'bg-gray-100 text-gray-700',
  em_analise: 'bg-yellow-100 text-yellow-700',
  aprovado: 'bg-teal-100 text-teal-700',
  recusado: 'bg-red-100 text-red-700',
  cancelado: 'bg-gray-100 text-gray-500',
};

export default function OrigemDerivadaBanner({ followUp, onVerAta }) {
  const [statusAtual, setStatusAtual] = useState(followUp?.origem_status || null);

  // Sincronização lazy do status em background
  useEffect(() => {
    if (!followUp?.id || !isOrigemDerivadaFlow(followUp)) return;
    let cancelled = false;

    const syncStatus = async () => {
      try {
        if (followUp.origin_type === 'tarefa_backlog' && followUp.origem_tarefa_id) {
          const items = await base44.entities.TarefaBacklog.filter({ id: followUp.origem_tarefa_id });
          if (!cancelled && items?.[0]?.status) setStatusAtual(items[0].status);
        } else if (followUp.origin_type === 'pedido_interno' && followUp.origem_pedido_id) {
          const items = await base44.entities.PedidoInterno.filter({ id: followUp.origem_pedido_id });
          if (!cancelled && items?.[0]?.status) setStatusAtual(items[0].status);
        }
      } catch {
        // Silencioso — cache é suficiente
      }
    };

    syncStatus();
    return () => { cancelled = true; };
  }, [followUp?.id]);

  if (!isOrigemDerivadaFlow(followUp)) return null;

  const style = getOrigemBadgeStyle(followUp.origin_type);
  const label = getOrigemLabel(followUp);
  const isTarefa = followUp.origin_type === 'tarefa_backlog';
  const statusLabel = STATUS_LABELS[statusAtual] || statusAtual || '—';
  const statusColor = STATUS_COLORS[statusAtual] || 'bg-gray-100 text-gray-700';

  return (
    <div className={`rounded-lg border-2 p-3 mb-2 ${style.bg} ${style.border}`}>
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
          {label}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Descrição do item */}
      {followUp.origem_descricao && (
        <p className={`text-sm font-semibold mb-1 ${style.text}`}>
          {followUp.origem_descricao}
        </p>
      )}

      {/* Detalhes */}
      <div className="space-y-1 mt-1">
        {followUp.origem_responsavel_nome && (
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-gray-500 flex-shrink-0" />
            <span className="text-xs text-gray-600">
              {isTarefa ? 'Responsável' : 'Responsável'}: <span className="font-medium">{followUp.origem_responsavel_nome}</span>
            </span>
          </div>
        )}
        {followUp.origem_solicitante_nome && !isTarefa && (
          <div className="flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-gray-500 flex-shrink-0" />
            <span className="text-xs text-gray-600">
              Solicitante: <span className="font-medium">{followUp.origem_solicitante_nome}</span>
            </span>
          </div>
        )}
        {followUp.origem_ata_titulo && (
          <div className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-gray-500 flex-shrink-0" />
            <span className="text-xs text-gray-600">
              ATA origem: <span className="font-medium">{followUp.origem_ata_titulo}</span>
            </span>
          </div>
        )}
      </div>

      {/* Ações */}
      {(followUp.origem_ata_id && onVerAta) && (
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className={`text-xs h-7 gap-1 border ${style.border} ${style.text} bg-white/70 hover:bg-white`}
            onClick={() => onVerAta(followUp.origem_ata_id)}
          >
            <ExternalLink className="w-3 h-3" />
            Ver ATA de Origem
          </Button>
        </div>
      )}
    </div>
  );
}
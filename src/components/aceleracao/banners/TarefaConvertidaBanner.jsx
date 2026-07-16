/**
 * TarefaConvertidaBanner — Banner de rastreabilidade no PedidoInternoResponder
 *
 * Exibido quando um PedidoInterno aprovado já foi convertido em TarefaBacklog.
 * Consulta TarefaBacklog por origin_type=pedido + origin_id=pedido.id.
 * Mostra o título da tarefa + status + link para visualizá-la.
 */
import React, { useState, useEffect } from "react";
import { CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const STATUS_LABELS = {
  aberta: 'Aberta',
  em_execucao: 'Em Execução',
  bloqueada: 'Bloqueada',
  concluida: 'Concluída',
};

const STATUS_COLORS = {
  aberta: 'bg-blue-100 text-blue-700',
  em_execucao: 'bg-orange-100 text-orange-700',
  bloqueada: 'bg-red-100 text-red-700',
  concluida: 'bg-green-100 text-green-700',
};

export default function TarefaConvertidaBanner({ pedido }) {
  const [tarefa, setTarefa] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pedido?.id) return;
    let cancelled = false;

    const buscarTarefa = async () => {
      try {
        const items = await base44.entities.TarefaBacklog.filter({
          origin_type: 'pedido',
          origin_id: pedido.id,
        });
        if (!cancelled) setTarefa(items?.[0] || null);
      } catch {
        // Silencioso — pedido sem tarefa é estado válido (não aprovado ainda)
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    buscarTarefa();
    return () => { cancelled = true; };
  }, [pedido?.id]);

  // Só mostra banner se o pedido foi aprovado (ou derivado) e existe tarefa
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center gap-2">
        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        <span className="text-xs text-gray-500">Verificando tarefa vinculada...</span>
      </div>
    );
  }

  if (!tarefa) return null;

  const statusLabel = STATUS_LABELS[tarefa.status] || tarefa.status;
  const statusColor = STATUS_COLORS[tarefa.status] || 'bg-gray-100 text-gray-700';

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 flex items-start gap-3">
      <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-teal-900">
          ✅ Convertida em Tarefa do Backlog
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-teal-700 truncate">{tarefa.titulo}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
      </div>
      <a
        href={`/ControleAceleracao?tab=backlog&tarefa_id=${tarefa.id}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900 whitespace-nowrap flex-shrink-0 mt-0.5"
      >
        <ExternalLink className="w-3.5 h-3.5" /> Ver Tarefa
      </a>
    </div>
  );
}
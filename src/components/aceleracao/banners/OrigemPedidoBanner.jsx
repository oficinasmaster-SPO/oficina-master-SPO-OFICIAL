/**
 * OrigemPedidoBanner — Banner de rastreabilidade na TarefaBacklogDetalhe
 *
 * Exibido quando tarefa.origin_type === 'pedido', indicando que a tarefa
 * foi gerada automaticamente a partir de um PedidoInterno aprovado.
 * Mostra o título do pedido de origem + link para visualizá-lo.
 */
import React from "react";
import { FileText, ExternalLink } from "lucide-react";

export default function OrigemPedidoBanner({ tarefa }) {
  if (tarefa.origin_type !== 'pedido' || !tarefa.origin_id) return null;

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 flex items-start gap-3">
      <FileText className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-teal-900">
          📋 Originada de um Pedido Interno aprovado
        </p>
        <p className="text-xs text-teal-700 mt-0.5 truncate">
          {tarefa.origin_title || tarefa.titulo}
        </p>
      </div>
      <a
        href={`/ControleAceleracao?tab=pedidos&pedido_id=${tarefa.origin_id}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900 whitespace-nowrap flex-shrink-0 mt-0.5"
      >
        <ExternalLink className="w-3.5 h-3.5" /> Ver Pedido
      </a>
    </div>
  );
}
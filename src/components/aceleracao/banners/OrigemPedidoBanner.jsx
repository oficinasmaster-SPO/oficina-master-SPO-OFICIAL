/**
 * OrigemPedidoBanner — Banner de rastreabilidade na TarefaBacklogDetalhe
 *
 * Exibido quando tarefa.origin_type === 'pedido', indicando que a tarefa
 * foi gerada automaticamente a partir de um PedidoInterno aprovado.
 * Busca o pedido de origem para exibir #ID, status (badge colorido) e
 * botão "Ver Pedido Original" que abre um modal com detalhes.
 */
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, ExternalLink, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PEDIDO_STATUS_CONFIG = {
  pendente:   { label: 'Pendente',   className: 'bg-gray-100 text-gray-800' },
  em_analise: { label: 'Em Análise', className: 'bg-blue-100 text-blue-800' },
  aprovado:   { label: 'Aprovado',   className: 'bg-green-100 text-green-800' },
  recusado:   { label: 'Recusado',   className: 'bg-red-100 text-red-800' },
  concluido:  { label: 'Concluído',  className: 'bg-teal-100 text-teal-800' },
};

const PEDIDO_TIPO_LABELS = {
  apoio_tecnico: 'Apoio Técnico',
  decisao_estrategica: 'Decisão Estratégica',
  liberacao_material: 'Liberação de Material',
  excecao_escopo: 'Exceção de Escopo',
  outros: 'Outros',
};

export default function OrigemPedidoBanner({ tarefa }) {
  const [open, setOpen] = useState(false);

  const { data: pedido } = useQuery({
    queryKey: ['pedido-origem', tarefa.origin_id],
    queryFn: async () => {
      const results = await base44.entities.PedidoInterno.filter({ id: tarefa.origin_id });
      return Array.isArray(results) && results.length > 0 ? results[0] : null;
    },
    enabled: tarefa.origin_type === 'pedido' && !!tarefa.origin_id,
    staleTime: 60 * 1000,
    retry: 1,
  });

  if (tarefa.origin_type !== 'pedido' || !tarefa.origin_id) return null;

  const statusCfg = pedido?.status ? PEDIDO_STATUS_CONFIG[pedido.status] : null;
  const pedidoIdShort = tarefa.origin_id?.slice(-6) || '';

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 flex items-start gap-3">
      <FileText className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-teal-900">
          📋 Originada de um Pedido Interno
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          <span className="text-xs text-teal-700 truncate">
            #{pedidoIdShort} · {pedido?.titulo || tarefa.origin_title || tarefa.titulo}
          </span>
          {statusCfg && (
            <Badge variant="outline" className={`text-[10px] ${statusCfg.className}`}>
              {statusCfg.label}
            </Badge>
          )}
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900 whitespace-nowrap flex-shrink-0 mt-0.5"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Ver Pedido Original
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-lg" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              Pedido Interno #{pedidoIdShort}
            </DialogTitle>
          </DialogHeader>
          {pedido ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Status:</span>
                {statusCfg && <Badge className={statusCfg.className}>{statusCfg.label}</Badge>}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Título</p>
                <p className="text-sm font-medium text-gray-900">{pedido.titulo}</p>
              </div>
              {pedido.descricao && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Descrição</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{pedido.descricao}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Solicitante</p>
                  <p className="text-sm">{pedido.requester_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Responsável</p>
                  <p className="text-sm">{pedido.assignee_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Tipo</p>
                  <p className="text-sm">{PEDIDO_TIPO_LABELS[pedido.tipo] || pedido.tipo || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Prazo</p>
                  <p className="text-sm">{pedido.prazo ? format(new Date(pedido.prazo), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</p>
                </div>
              </div>
              <div className="pt-3 border-t flex justify-end">
                <a
                  href={`/ControleAceleracao?tab=pedidos&pedido_id=${tarefa.origin_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button size="sm" variant="outline" className="gap-1">
                    Abrir página do pedido <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4 text-center">Carregando detalhes do pedido...</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
/**
 * transicionarStatusPedido — Transição de status de PedidoInterno com
 * validação de máquina de estados e compare-and-swap (CAS).
 *
 * Previne regressão de status por stale write: só atualiza se o status
 * atual no banco ainda for o `from_status` informado pelo cliente.
 *
 * Payload:
 *   { pedido_id, from_status, to_status, extra?: {...} }
 *
 * extra aceita apenas: resposta, data_conclusao, concluido_por_id,
 * concluido_por_nome. `data_primeira_resposta` é gravada automaticamente
 * na primeira transição para aprovado/recusado/concluido, se ausente.
 *
 * Respostas:
 *   200 ok / 400 payload inválido / 401 não autenticado
 *   409 conflict (status mudou no servidor ou pedido inexistente)
 *   422 transição inválida
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const TRANSITIONS = {
  pendente: ['em_analise', 'aprovado', 'recusado'],
  em_analise: ['aprovado', 'recusado'],
  aprovado: ['concluido'],
  concluido: [],
  recusado: [],
};

const EXTRA_ALLOWED = ['resposta', 'data_conclusao', 'concluido_por_id', 'concluido_por_nome'];
const RESPONSE_STATUSES = ['aprovado', 'recusado', 'concluido'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { pedido_id, from_status, to_status } = body;
    const extra = body.extra || {};

    if (!pedido_id || !from_status || !to_status) {
      return Response.json(
        { error: 'pedido_id, from_status e to_status são obrigatórios' },
        { status: 400 }
      );
    }

    if (!(TRANSITIONS[from_status] || []).includes(to_status)) {
      return Response.json(
        { error: `Transição inválida: ${from_status} → ${to_status}` },
        { status: 422 }
      );
    }

    // CAS: só atualiza se o status no servidor ainda for o esperado
    const matches = await base44.entities.PedidoInterno.filter({
      id: pedido_id,
      status: from_status,
    });
    if (!matches || matches.length === 0) {
      const current = await base44.entities.PedidoInterno.filter({ id: pedido_id });
      const current_status = current?.[0]?.status || null;
      return Response.json({
        conflict: true,
        error: current_status
          ? `Status atual do pedido é "${current_status}", não "${from_status}"`
          : 'Pedido não encontrado',
        current_status,
      }, { status: 409 });
    }

    const pedido = matches[0];
    const patch = { status: to_status };
    for (const key of EXTRA_ALLOWED) {
      if (extra[key] !== undefined) patch[key] = extra[key];
    }
    if (!pedido.data_primeira_resposta && RESPONSE_STATUSES.includes(to_status)) {
      patch.data_primeira_resposta = new Date().toISOString();
    }

    const updated = await base44.entities.PedidoInterno.update(pedido_id, patch);
    return Response.json({ ok: true, pedido: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
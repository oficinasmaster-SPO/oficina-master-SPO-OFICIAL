/**
 * transicionarStatusPedido — Transição de status de PedidoInterno com
 * validação de máquina de estados, AUTORIZAÇÃO DE SERVIDOR (BUG-04) e
 * compare-and-swap (CAS).
 *
 * BUG-04: a autorização é validada AQUI, no servidor, ANTES de qualquer
 * alteração — somente assignee, admin ou usuário interno podem transicionar.
 * A UI (canRespond) NÃO é camada de segurança. Em caso de negação (403),
 * nada é gravado e nenhum workflow/ActivityLog decorrente é disparado.
 *
 * BUG-02: pedido inexistente retorna 404 (not_found) — DISTINTO do 409
 * (conflict) usado para divergência de status entre cliente e servidor.
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
 *   403 sem permissão (não é assignee/admin/interno) — BUG-04
 *   404 pedido inexistente — BUG-02
 *   409 conflict (status mudou no servidor)
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

    // ── BUG-02: carregar o pedido ANTES de qualquer alteração.
    // Inexistente = 404 (não confundir com conflito de status).
    const found = await base44.entities.PedidoInterno.filter({ id: pedido_id });
    if (!found || found.length === 0) {
      return Response.json(
        { not_found: true, error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }
    const pedido = found[0];

    // ── BUG-04: autorização REAL no servidor, ANTES do update.
    // Somente o responsável (assignee), admin ou usuário interno.
    const isAssignee = !!user.id && pedido.assignee_id === user.id;
    const isAdmin = user.role === 'admin';
    const isInternal = user.user_type === 'internal' || user.data?.user_type === 'internal';
    if (!isAssignee && !isAdmin && !isInternal) {
      return Response.json(
        { forbidden: true, error: 'Você não tem permissão para alterar o status deste pedido.' },
        { status: 403 }
      );
    }

    if (!(TRANSITIONS[from_status] || []).includes(to_status)) {
      return Response.json(
        { error: `Transição inválida: ${from_status} → ${to_status}` },
        { status: 422 }
      );
    }

    // CAS: só atualiza se o status carregado ainda for o esperado pelo cliente
    if (pedido.status !== from_status) {
      return Response.json({
        conflict: true,
        error: `Status atual do pedido é "${pedido.status}", não "${from_status}"`,
        current_status: pedido.status,
      }, { status: 409 });
    }

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
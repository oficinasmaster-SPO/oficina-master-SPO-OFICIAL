/**
 * atualizarPedidoInterno — Atualização de CONTEÚDO de PedidoInterno com
 * segurança server-side (LOTE 3).
 *
 * A UI trata concluido/recusado como somente leitura, mas isso não é camada
 * de segurança: esta função garante no servidor que um pedido finalizado
 * NÃO pode ser alterado por chamada direta ao SDK/API, e que nenhum payload
 * do cliente altera campos estruturais (status, codigo, requester_id,
 * workshop_id, datas de auditoria...).
 *
 * Ordem atômica — nenhuma alteração persiste se qualquer validação falhar:
 *   1. 401 — não autenticado (base44.auth.me(); identidade NUNCA vem do payload).
 *   2. 400 — payload inválido (pedido_id ausente; changes ausente/vazio).
 *   3. 404 — pedido inexistente (sem criação implícita).
 *   4. 403 — sem permissão. Mesma regra de identidade do fluxo de Pedido
 *            Interno (transicionarStatusPedido + RLS de update): requester,
 *            assignee, admin ou usuário interno. role/user_type do cliente
 *            NÃO são consultados.
 *   5. 409 — status finalizado (concluido/recusado): conteúdo bloqueado.
 *   6. 409 — CAS opcional: se from_updated_date informado e divergente do
 *            banco, rejeita (reutiliza o padrão de CAS já existente no
 *            transicionarStatusPedido — sem infra nova de concorrência).
 *   7. 422 — qualquer campo fora da whitelist rejeita o payload INTEIRO
 *            (anti mass-assignment: detecta tentativa de tocar status,
 *            codigo, requester_id, workshop_id, etc.).
 *   8. 422 — tipo/valor inválido em campo permitido.
 *   9. update — SOMENTE com o objeto sanitizado pela whitelist.
 *
 * Mudança de status permanece EXCLUSIVA de transicionarStatusPedido.
 * Auditoria: o workflow "ActivityLog — PedidoInterno Update" continua
 * disparado pelo update da entidade — nenhum evento novo foi criado.
 *
 * Payload:
 *   { pedido_id, changes: {...}, from_updated_date?: string }
 *
 * Whitelist (espelha exatamente o modo edição do NovoPedidoModal):
 *   tipo, prioridade, titulo, descricao, assignee_id, assignee_name,
 *   prazo, impacto_cliente, midias_anexas
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const ALLOWED_FIELDS = [
  'tipo', 'prioridade', 'titulo', 'descricao',
  'assignee_id', 'assignee_name', 'prazo',
  'impacto_cliente', 'midias_anexas',
];

const ENUMS = {
  tipo: ['apoio_tecnico', 'decisao_estrategica', 'liberacao_material', 'excecao_escopo', 'outros'],
  prioridade: ['baixa', 'media', 'alta', 'critica'],
  impacto_cliente: ['nenhum', 'baixo', 'medio', 'alto', 'critico'],
};

const FINAL_STATUSES = ['concluido', 'recusado'];

const json = (body, status) => Response.json(body, { status });

export default async function(req) {
  try {
    // 1. Autenticação server-side — nada é lido/gravado antes dela.
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Payload inválido' }, 400);
    }
    const { pedido_id, changes, from_updated_date } = body || {};

    // 2. Validação básica do payload.
    if (!pedido_id || typeof pedido_id !== 'string') {
      return json({ error: 'pedido_id é obrigatório' }, 400);
    }
    if (
      !changes || typeof changes !== 'object' || Array.isArray(changes) ||
      Object.keys(changes).length === 0
    ) {
      return json({ error: 'changes é obrigatório e não pode ser vazio' }, 400);
    }

    // 3. Localizar o pedido ANTES de qualquer alteração. O SDK lança erro
    //    ("Invalid id value ... Object not found") para id inexistente em
    //    vez de retornar lista vazia — tratado aqui como 404.
    let found;
    try {
      found = await base44.entities.PedidoInterno.filter({ id: pedido_id });
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes('not found') || msg.includes('Invalid id')) {
        return json({ not_found: true, error: 'Pedido não encontrado' }, 404);
      }
      throw e;
    }
    if (!found || found.length === 0) {
      return json({ not_found: true, error: 'Pedido não encontrado' }, 404);
    }
    const pedido = found[0];

    // 4. Autorização REAL no servidor (identidade da sessão, nunca do payload).
    //    Mesma regra do fluxo de Pedido Interno: requester/assignee (RLS de
    //    update) + admin/interno (transicionarStatusPedido/BUG-04).
    const isRequester = !!user.id && pedido.requester_id === user.id;
    const isAssignee = !!user.id && pedido.assignee_id === user.id;
    const isAdmin = user.role === 'admin';
    const isInternal = user.user_type === 'internal' || user.data?.user_type === 'internal';
    if (!isRequester && !isAssignee && !isAdmin && !isInternal) {
      return json(
        { forbidden: true, error: 'Você não tem permissão para editar este pedido.' },
        403
      );
    }

    // 5. Guard de status finalizado — regra central do Lote 3. Vale para
    //    qualquer chamada (UI, SDK direto, DevTools), incondicional.
    if (FINAL_STATUSES.includes(pedido.status)) {
      return json({
        conflict: true,
        error: 'Pedido finalizado não pode ser alterado.',
        current_status: pedido.status,
      }, 409);
    }

    // 6. CAS opcional (reutiliza o padrão do transicionarStatusPedido).
    if (from_updated_date && pedido.updated_date && from_updated_date !== pedido.updated_date) {
      return json({
        conflict: true,
        error: 'O pedido foi alterado por outra pessoa desde que você abriu a edição. Recarregue antes de salvar.',
        current_updated_date: pedido.updated_date,
      }, 409);
    }

    // 7. Whitelist: campo fora da lista rejeita o payload inteiro — cobre
    //    status, codigo, requester_id, workshop_id, workshop_nome, id,
    //    created_by, created_date, updated_date e qualquer campo estrutural.
    const unknown = Object.keys(changes).filter((k) => !ALLOWED_FIELDS.includes(k));
    if (unknown.length > 0) {
      return json({
        error: `Campos não permitidos na atualização: ${unknown.join(', ')}`,
        allowed_fields: ALLOWED_FIELDS,
        rejected_fields: unknown,
      }, 422);
    }

    // 8. Validação de tipo/valor + sanitização.
    const patch = {};
    for (const key of ALLOWED_FIELDS) {
      if (!(key in changes)) continue;
      const value = changes[key];
      if (ENUMS[key]) {
        if (!ENUMS[key].includes(value)) {
          return json({ error: `Valor inválido para "${key}": ${value}` }, 422);
        }
      } else if (key === 'titulo') {
        if (typeof value !== 'string' || !value.trim()) {
          return json({ error: 'Campo "titulo" deve ser texto não vazio' }, 422);
        }
      } else if (key === 'descricao' || key === 'assignee_id' || key === 'assignee_name') {
        if (typeof value !== 'string') {
          return json({ error: `Campo "${key}" deve ser texto` }, 422);
        }
      } else if (key === 'prazo') {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return json({ error: 'Campo "prazo" deve ser uma data YYYY-MM-DD' }, 422);
        }
      } else if (key === 'midias_anexas') {
        if (!Array.isArray(value)) {
          return json({ error: 'Campo "midias_anexas" deve ser uma lista' }, 422);
        }
      }
      patch[key] = value;
    }
    if (Object.keys(patch).length === 0) {
      return json({ error: 'Nenhum campo válido para atualização' }, 422);
    }

    // 9. Update com objeto sanitizado — status/estrutura nunca inclusos.
    const updated = await base44.entities.PedidoInterno.update(pedido_id, patch);
    return Response.json({ ok: true, pedido: updated });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
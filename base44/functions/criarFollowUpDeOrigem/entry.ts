/**
 * criarFollowUpDeOrigem — Backend function
 *
 * Cria um FollowUpReminder a partir de uma TarefaBacklog ou PedidoInterno.
 * Garante idempotência: não cria duplicado se já existe FU aberto para o mesmo item.
 *
 * Payload:
 * {
 *   tipo: 'tarefa_backlog' | 'pedido_interno',
 *   origem_id: string,          // ID da tarefa ou pedido
 *   consultor_id?: string,      // quem vai fazer o follow-up (CS, secretária)
 *   consultor_nome?: string,
 *   dias_prazo?: number,        // padrão: 3
 * }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { tipo, origem_id, consultor_id, consultor_nome, dias_prazo = 3 } = body;

    if (!tipo || !origem_id) {
      return Response.json({ error: 'tipo e origem_id são obrigatórios' }, { status: 400 });
    }

    if (!['tarefa_backlog', 'pedido_interno'].includes(tipo)) {
      return Response.json({ error: 'tipo deve ser tarefa_backlog ou pedido_interno' }, { status: 400 });
    }

    // ── Buscar o item de origem ──
    let origem = null;
    if (tipo === 'tarefa_backlog') {
      const items = await base44.asServiceRole.entities.TarefaBacklog.filter({ id: origem_id });
      origem = items?.[0] || null;
    } else {
      const items = await base44.asServiceRole.entities.PedidoInterno.filter({ id: origem_id });
      origem = items?.[0] || null;
    }

    if (!origem) {
      return Response.json({ error: `${tipo} não encontrado: ${origem_id}` }, { status: 404 });
    }

    // ── Idempotência: verificar se já existe FU aberto para este item ──
    const campoFiltro = tipo === 'tarefa_backlog' ? 'origem_tarefa_id' : 'origem_pedido_id';
    const existentes = await base44.asServiceRole.entities.FollowUpReminder.filter({
      [campoFiltro]: origem_id,
      is_completed: false,
    });

    if (existentes && existentes.length > 0) {
      return Response.json({
        created: false,
        message: 'Follow-up já existe para este item',
        followUp: existentes[0],
      });
    }

    // ── Calcular prazo ──
    const prazo = new Date();
    prazo.setDate(prazo.getDate() + Math.max(1, parseInt(dias_prazo) || 3));
    const prazoStr = prazo.toISOString().split('T')[0];

    // ── Montar dados do FU ──
    const consultorIdFinal = consultor_id || (tipo === 'tarefa_backlog' ? origem.consultor_id : origem.responsavel_id) || user.id;
    const consultorNomeFinal = consultor_nome || (tipo === 'tarefa_backlog' ? origem.consultor_nome : origem.responsavel_nome) || user.full_name || null;

    let fuData = null;

    if (tipo === 'tarefa_backlog') {
      fuData = {
        workshop_id: origem.cliente_id,
        workshop_name: origem.cliente_nome || null,
        consultor_id: consultorIdFinal,
        consultor_nome: consultorNomeFinal,
        reminder_date: prazoStr,
        sequence_number: 1,
        origin_type: 'tarefa_backlog',
        origem_tarefa_id: origem.id,
        origem_ata_id: origem.origem_id || null,
        origem_ata_titulo: origem.origem_titulo || null,
        origem_descricao: origem.titulo || null,
        origem_status: origem.status || 'aberta',
        origem_responsavel_id: origem.atribuido_para_id || consultorIdFinal,
        origem_responsavel_nome: null,
        origem_solicitante_nome: null,
        is_completed: false,
        notes: `Follow-up de tarefa: ${origem.titulo || ''}`,
        consulting_firm_id: user?.data?.consulting_firm_id || null,
      };
    } else {
      fuData = {
        workshop_id: origem.cliente_id,
        workshop_name: origem.cliente_nome || null,
        consultor_id: consultorIdFinal,
        consultor_nome: consultorNomeFinal,
        reminder_date: prazoStr,
        sequence_number: 1,
        origin_type: 'pedido_interno',
        origem_pedido_id: origem.id,
        origem_ata_id: null,
        origem_ata_titulo: null,
        origem_descricao: origem.titulo || null,
        origem_status: origem.status || 'pendente',
        origem_responsavel_id: origem.responsavel_id || null,
        origem_responsavel_nome: origem.responsavel_nome || null,
        origem_solicitante_nome: origem.solicitante_nome || null,
        is_completed: false,
        notes: `Follow-up de pedido interno: ${origem.titulo || ''}`,
        consulting_firm_id: user?.data?.consulting_firm_id || null,
      };
    }

    const novoFU = await base44.asServiceRole.entities.FollowUpReminder.create(fuData);

    return Response.json({
      created: true,
      followUp: novoFU,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
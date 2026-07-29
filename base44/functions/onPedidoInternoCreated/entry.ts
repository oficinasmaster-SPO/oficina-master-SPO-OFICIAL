/**
 * onPedidoInternoCreated — Entity Automation handler
 *
 * Disparado quando um PedidoInterno é criado.
 * Cria automaticamente um FollowUpReminder com origin_type='pedido_interno'.
 * Garante idempotência.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;

    if (event?.type !== 'create') {
      return Response.json({ skipped: true, reason: 'Não é evento de criação' });
    }

    const pedido = data;
    if (!pedido?.id || !pedido?.workshop_id) {
      return Response.json({ skipped: true, reason: 'Pedido sem id ou workshop_id' });
    }

    // ── Guard: workshop_id deve resolver para um Workshop real (previne órfãos) ──
    if (!/^[0-9a-f]{24}$/.test(pedido.workshop_id)) {
      return Response.json({ skipped: true, reason: `workshop_id inválido (não-ObjectId): ${pedido.workshop_id}` });
    }
    try {
      const wsItems = await base44.asServiceRole.entities.Workshop.filter({ id: pedido.workshop_id });
      if (!wsItems || wsItems.length === 0) {
        return Response.json({ skipped: true, reason: `Workshop não encontrado: ${pedido.workshop_id}` });
      }
    } catch (e) {
      return Response.json({ skipped: true, reason: `Falha ao validar workshop: ${e.message}` });
    }

    // ── Gerar código sequencial (PED-0001, PED-0002, ...) se ainda não existir ──
    if (!pedido.codigo) {
      try {
        const todos = await base44.asServiceRole.entities.PedidoInterno.list('-created_date', 100000);
        let maxNum = 0;
        for (const p of todos || []) {
          if (p.codigo) {
            const m = p.codigo.match(/PED-(\d+)/);
            if (m) {
              const n = parseInt(m[1], 10);
              if (n > maxNum) maxNum = n;
            }
          }
        }
        const novoCodigo = `PED-${String(maxNum + 1).padStart(4, '0')}`;
        await base44.asServiceRole.entities.PedidoInterno.update(pedido.id, { codigo: novoCodigo });
      } catch (e) {
        // não crítico — o pedido segue sem código
      }
    }

    // Idempotência
    const existentes = await base44.asServiceRole.entities.FollowUpReminder.filter({
      origem_pedido_id: pedido.id,
      is_completed: false,
    });

    if (existentes && existentes.length > 0) {
      return Response.json({ created: false, message: 'FU já existe para este pedido' });
    }

    // Prazo baseado no prazo do pedido ou +3 dias
    let prazoStr;
    if (pedido.prazo) {
      prazoStr = pedido.prazo;
    } else {
      const prazo = new Date();
      prazo.setDate(prazo.getDate() + 3);
      prazoStr = prazo.toISOString().split('T')[0];
    }

    // Tentar obter consulting_firm_id do responsável para respeitar RLS
    let consultingFirmId = null;
    if (pedido.assignee_id) {
      try {
        const users = await base44.asServiceRole.entities.User.filter({ id: pedido.assignee_id });
        consultingFirmId = users?.[0]?.data?.consulting_firm_id || null;
      } catch { /* não crítico */ }
    }

    // ── Buscar Workshop para herdar consultor_principal ──
    let consultorPrincipalId = null;
    let consultorPrincipalNome = null;
    if (pedido.workshop_id) {
      try {
        const wsItems = await base44.asServiceRole.entities.Workshop.filter({ id: pedido.workshop_id });
        const ws = wsItems?.[0];
        if (ws?.consultor_principal_id) {
          consultorPrincipalId = ws.consultor_principal_id;
          consultorPrincipalNome = ws.consultor_principal_nome || null;
        }
      } catch { /* não crítico */ }
    }

    const fuData = {
      workshop_id: pedido.workshop_id,
      workshop_name: pedido.workshop_nome || null,
      consultor_id: pedido.assignee_id,
      consultor_nome: pedido.assignee_name || null,
      reminder_date: prazoStr,
      sequence_number: 1,
      origin_type: 'pedido_interno',
      origem_pedido_id: pedido.id,
      origem_ata_id: null,
      origem_ata_titulo: null,
      origem_descricao: pedido.titulo || null,
      origem_status: pedido.status || 'pendente',
      origem_responsavel_id: pedido.assignee_id || null,
      origem_responsavel_nome: pedido.assignee_name || null,
      origem_solicitante_nome: pedido.requester_name || null,
      is_completed: false,
      notes: `Follow-up de pedido interno: ${pedido.titulo || ''}`,
      consulting_firm_id: consultingFirmId,
      consultor_principal_id: consultorPrincipalId,
      consultor_principal_nome: consultorPrincipalNome,
    };

    const novoFU = await base44.asServiceRole.entities.FollowUpReminder.create(fuData);

    return Response.json({ created: true, followUp: novoFU });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
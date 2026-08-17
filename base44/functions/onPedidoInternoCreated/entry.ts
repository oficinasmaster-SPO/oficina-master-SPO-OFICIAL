import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * onPedidoInternoCreated — Entity Automation handler
 *
 * Disparado quando um PedidoInterno é criado.
 *
 * S1-05: APENAS gera o código sequencial PED-xxxx.
 * Criação de FollowUpReminder REMOVIDA (gerava FUs duplicados e fora da cadência).
 *
 * S1-05: Adicionado guard de workshop inativo (antes só checava existência).
 */

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

    // Guard: workshop_id deve ser ObjectId válido
    if (!/^[0-9a-f]{24}$/.test(pedido.workshop_id)) {
      return Response.json({ skipped: true, reason: `workshop_id inválido: ${pedido.workshop_id}` });
    }

    // Guard: workshop deve existir E estar ativo (S1-05: adicionado guard de status)
    let workshop = null;
    try {
      const wsItems = await base44.asServiceRole.entities.Workshop.filter({ id: pedido.workshop_id });
      workshop = wsItems?.[0] || null;
    } catch (e) {
      return Response.json({ skipped: true, reason: `Falha ao validar workshop: ${e.message}` });
    }

    if (!workshop) {
      return Response.json({ skipped: true, reason: `Workshop não encontrado: ${pedido.workshop_id}` });
    }

    // S1-05: Guard inativo — antes ausente, agora explícito
    if (workshop.status !== 'ativo') {
      console.log(`[onPedidoInternoCreated] ${workshop.name}: status=${workshop.status}. Skip.`);
      return Response.json({ skipped: true, reason: `workshop_inativo: ${workshop.status}` });
    }

    // ── Gerar código sequencial PED-xxxx (única responsabilidade desta function) ──
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
        console.log(`[onPedidoInternoCreated] Código gerado: ${novoCodigo} para pedido ${pedido.id}`);
        return Response.json({ ok: true, codigo: novoCodigo });
      } catch (e) {
        console.error('[onPedidoInternoCreated] Erro ao gerar código:', e.message);
        return Response.json({ ok: true, codigo_error: e.message });
      }
    }

    return Response.json({ ok: true, codigo: pedido.codigo, msg: 'Código já existia' });

  } catch (error) {
    console.error('[onPedidoInternoCreated] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

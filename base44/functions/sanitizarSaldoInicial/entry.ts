import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Sanitiza registros duplicados de saldo_inicial para um workshopId + mes.
 * Remove registros legados (schema antigo: detalhes.banco) mantendo apenas o novo (detalhes.bancos[]).
 * Garante exatamente 1 registro válido por workshopId + mes + grupo=saldo_inicial.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, mes } = await req.json();

    if (!workshop_id || !mes) {
      return Response.json({ error: 'workshop_id e mes são obrigatórios' }, { status: 400 });
    }

    // Busca todos os registros saldo_inicial do mês
    const registros = await base44.asServiceRole.entities.DFCLancamento.filter(
      { workshop_id, mes, grupo: 'saldo_inicial' },
      '-updated_date',
      20
    );

    if (!registros || registros.length <= 1) {
      // Nenhuma duplicata — nada a fazer
      return Response.json({ success: true, action: 'noop', total: registros?.length || 0 });
    }

    // Separar novo (tem detalhes.bancos como array) de legado (tem detalhes.banco singular ou sem bancos)
    const novo = registros.find(r =>
      r.detalhes && (Array.isArray(r.detalhes.bancos) || Array.isArray(r.detalhes.maquinas_cartao))
    );

    const legados = registros.filter(r =>
      r.id !== (novo?.id) &&
      !(Array.isArray(r.detalhes?.bancos) || Array.isArray(r.detalhes?.maquinas_cartao))
    );

    if (legados.length === 0) {
      // Todos têm schema novo — manter o mais recente, deletar os demais
      const [manter, ...excedentes] = registros; // já ordenado por -updated_date
      for (const r of excedentes) {
        await base44.asServiceRole.entities.DFCLancamento.delete(r.id);
      }
      return Response.json({ success: true, action: 'dedup_novo', deletados: excedentes.length });
    }

    // Deletar todos os legados
    for (const legado of legados) {
      await base44.asServiceRole.entities.DFCLancamento.delete(legado.id);
    }

    return Response.json({
      success: true,
      action: 'removed_legacy',
      deletados: legados.length,
      registro_valido_id: novo?.id || null,
    });

  } catch (error) {
    // Falha silenciosa — não deve quebrar o fluxo do modal
    console.error('[sanitizarSaldoInicial] erro:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
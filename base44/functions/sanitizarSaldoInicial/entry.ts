import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Sanitiza registros duplicados de saldo_inicial para um workshopId + mes.
 *
 * Critério de schema LEGADO:  detalhes.banco !== undefined OU detalhes.maquina_cartao !== undefined
 * Critério de schema NOVO:    Array.isArray(detalhes.bancos) OU Array.isArray(detalhes.maquinas_cartao)
 *
 * Estratégia:
 *   1. Busca todos os registros { workshop_id, mes, grupo: saldo_inicial }
 *   2. Identifica legados pelo critério acima
 *   3. Remove todos os legados
 *   4. Se restar mais de 1 registro novo, mantém o mais recente e remove os excedentes
 *   → Garante exatamente 1 registro válido no schema novo
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

    // Busca todos os registros saldo_inicial do mês, ordenados do mais recente ao mais antigo
    const registros = await base44.asServiceRole.entities.DFCLancamento.filter(
      { workshop_id, mes, grupo: 'saldo_inicial' },
      '-updated_date',
      50
    );

    if (!registros || registros.length === 0) {
      return Response.json({ success: true, action: 'noop', total: 0 });
    }

    if (registros.length === 1) {
      return Response.json({ success: true, action: 'noop', total: 1 });
    }

    // ── Classificar registros ──────────────────────────────────────
    // Formato novo: tem bancos[] ou maquinas_cartao[] — independente de ter campos legados residuais
    const isNovo = (r) =>
      r.detalhes != null && (
        Array.isArray(r.detalhes.bancos) ||
        Array.isArray(r.detalhes.maquinas_cartao)
      );

    // Legado: tem campos banco/maquina_cartao MAS não tem o formato novo
    const isLegado = (r) =>
      !isNovo(r) &&
      r.detalhes != null && (
        r.detalhes.banco !== undefined ||
        r.detalhes.maquina_cartao !== undefined
      );

    const legados = registros.filter(r => isLegado(r));
    const novos   = registros.filter(r => isNovo(r));
    // registros sem detalhes ou sem campos reconhecidos — tratar como legado
    const semSchema = registros.filter(r => !isLegado(r) && !isNovo(r));

    const deletados = [];

    // ── 1. Deletar todos os legados ────────────────────────────────
    for (const r of [...legados, ...semSchema]) {
      await base44.asServiceRole.entities.DFCLancamento.delete(r.id);
      deletados.push(r.id);
    }

    // ── 2. Se sobrar mais de 1 novo, manter apenas o mais recente ──
    if (novos.length > 1) {
      // novos já está ordenado por -updated_date (mais recente primeiro)
      const [_manter, ...excedentes] = novos;
      for (const r of excedentes) {
        await base44.asServiceRole.entities.DFCLancamento.delete(r.id);
        deletados.push(r.id);
      }
    }

    const registroValidoId = novos[0]?.id || null;

    return Response.json({
      success: true,
      action: deletados.length > 0 ? 'sanitized' : 'noop',
      deletados: deletados.length,
      ids_deletados: deletados,
      legados_removidos: legados.length + semSchema.length,
      duplicatas_novas_removidas: Math.max(0, novos.length - 1),
      registro_valido_id: registroValidoId,
    });

  } catch (error) {
    console.error('[sanitizarSaldoInicial] erro:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
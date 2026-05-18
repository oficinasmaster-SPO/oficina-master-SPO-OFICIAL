import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * QA FIX: Limpeza de Próximos Passos e CronogramaImplementacao duplicados
 * 
 * Detecta e remove duplicatas em ConsultoriaProximoPasso baseado em:
 * - workshop_id + titulo normalizado + prazo (chave de negócio)
 * - item_id_hash (quando disponível)
 * 
 * Detecta e remove duplicatas em CronogramaImplementacao baseado em:
 * - item_id (deve ser único por workshop)
 * 
 * Mantém SEMPRE o mais antigo (primeiro criado), remove os demais.
 */

async function deleteInBatches(entity, ids) {
  let removed = 0;
  let errors = 0;
  // Deletar um por vez com delay para evitar rate limit
  for (const id of ids) {
    try {
      await entity.delete(id);
      removed++;
      await new Promise(r => setTimeout(r, 150)); // 150ms entre cada deleção
    } catch (err) {
      errors++;
      console.error(`❌ Erro ao remover ${id}:`, err.message);
      await new Promise(r => setTimeout(r, 500)); // aguarda mais em caso de erro
    }
  }
  return { removed, errors };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem rodar cleanup' }, { status: 403 });
    }

    console.log('🔧 Iniciando cleanup de duplicatas (ConsultoriaProximoPasso + CronogramaImplementacao)...');

    const resumo = {
      proximosPasso: { encontrados: 0, duplicatas: 0, removidos: 0, erros: 0 },
      cronograma: { encontrados: 0, duplicatas: 0, removidos: 0, erros: 0 }
    };

    // ── FASE 1: ConsultoriaProximoPasso ────────────────────────────────────────
    const todosPPs = await base44.asServiceRole.entities.ConsultoriaProximoPasso.filter(
      { origem: 'ata' }, 'created_date', 2000
    );
    resumo.proximosPasso.encontrados = todosPPs.length;
    console.log(`📊 ConsultoriaProximoPasso (origem=ata): ${todosPPs.length}`);

    const gruposPP = {};
    for (const pp of todosPPs) {
      const tituloNorm = (pp.titulo || '').toLowerCase().trim();
      const responsavelNorm = (pp.responsavel_nome || '').toLowerCase().trim();
      const prazo = pp.prazo || 'sem-prazo';
      const chave = `${pp.workshop_id}|${tituloNorm}|${responsavelNorm}|${prazo}`;

      if (!gruposPP[chave]) gruposPP[chave] = [];
      gruposPP[chave].push(pp);
    }

    const ppRemover = [];
    for (const grupo of Object.values(gruposPP)) {
      if (grupo.length > 1) {
        grupo.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        const duplicatas = grupo.slice(1);
        ppRemover.push(...duplicatas.map(p => p.id));
        resumo.proximosPasso.duplicatas += duplicatas.length;
        console.log(`⚠️ PP duplicado: "${grupo[0].titulo?.substring(0, 40)}" (${grupo.length} cópias)`);
      }
    }

    if (ppRemover.length > 0) {
      const r = await deleteInBatches(base44.asServiceRole.entities.ConsultoriaProximoPasso, ppRemover);
      resumo.proximosPasso.removidos = r.removed;
      resumo.proximosPasso.erros = r.errors;
    }

    // ── FASE 2: CronogramaImplementacao (item_tipo=proximo_passo_ata) ──────────
    const todosCronograma = await base44.asServiceRole.entities.CronogramaImplementacao.filter(
      { item_tipo: 'proximo_passo_ata' }, 'created_date', 2000
    );
    resumo.cronograma.encontrados = todosCronograma.length;
    console.log(`📊 CronogramaImplementacao (proximo_passo_ata): ${todosCronograma.length}`);

    const gruposCron = {};
    for (const item of todosCronograma) {
      // item_id deve ser único (formato: ata-{ata_id}-{hash})
      const chave = `${item.workshop_id}|${item.item_id}`;
      if (!gruposCron[chave]) gruposCron[chave] = [];
      gruposCron[chave].push(item);
    }

    const cronRemover = [];
    for (const grupo of Object.values(gruposCron)) {
      if (grupo.length > 1) {
        grupo.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        const duplicatas = grupo.slice(1);
        cronRemover.push(...duplicatas.map(p => p.id));
        resumo.cronograma.duplicatas += duplicatas.length;
        console.log(`⚠️ Cron duplicado: "${grupo[0].item_nome?.substring(0, 40)}" (${grupo.length} cópias)`);
      }
    }

    if (cronRemover.length > 0) {
      const r = await deleteInBatches(base44.asServiceRole.entities.CronogramaImplementacao, cronRemover);
      resumo.cronograma.removidos = r.removed;
      resumo.cronograma.erros = r.errors;
    }

    // ── FASE 3: FollowUpReminder — duplicatas por (atendimento_id + sequence_number) ──
    const resumoFU = { encontrados: 0, duplicatas: 0, removidos: 0, erros: 0 };
    const todosFU = await base44.asServiceRole.entities.FollowUpReminder.filter(
      {}, 'created_date', 3000
    ).catch(() => []);
    resumoFU.encontrados = todosFU.length;
    console.log(`📊 FollowUpReminder total: ${todosFU.length}`);

    const gruposFU = {};
    for (const fu of todosFU) {
      if (!fu.atendimento_id) continue; // sem atendimento_id não agrupa
      const chave = `${fu.atendimento_id}|${fu.sequence_number}|${fu.is_completed ? '1' : '0'}`;
      if (!gruposFU[chave]) gruposFU[chave] = [];
      gruposFU[chave].push(fu);
    }

    const fuRemover = [];
    for (const grupo of Object.values(gruposFU)) {
      if (grupo.length > 1) {
        grupo.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        const duplicatas = grupo.slice(1);
        fuRemover.push(...duplicatas.map(f => f.id));
        resumoFU.duplicatas += duplicatas.length;
        console.log(`⚠️ FU duplicado: atendimento=${grupo[0].atendimento_id} seq=${grupo[0].sequence_number} (${grupo.length} cópias)`);
      }
    }

    if (fuRemover.length > 0) {
      const r = await deleteInBatches(base44.asServiceRole.entities.FollowUpReminder, fuRemover);
      resumoFU.removidos = r.removed;
      resumoFU.erros = r.errors;
    }

    const resultado = {
      sucesso: true,
      resumo: {
        proximosPasso: resumo.proximosPasso,
        cronograma: resumo.cronograma,
        followUpReminders: resumoFU
      },
      totalRemovidos: resumo.proximosPasso.removidos + resumo.cronograma.removidos + resumoFU.removidos,
      mensagem: `Cleanup concluído: ${resumo.proximosPasso.removidos} PP + ${resumo.cronograma.removidos} Cron + ${resumoFU.removidos} FU duplicatas removidas`
    };

    console.log('✅ CLEANUP CONCLUÍDO:', resultado.mensagem);
    return Response.json(resultado);

  } catch (error) {
    console.error('Erro crítico no cleanup:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});
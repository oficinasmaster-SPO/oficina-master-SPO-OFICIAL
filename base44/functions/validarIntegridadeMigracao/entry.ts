import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * VALIDAÇÃO: Verifica integridade dos dados após migração
 * 
 * Validações:
 * 1. DRELancamentos sem recorrencia_id mas que deveriam ter
 * 2. BudgetMeta anual vs soma das mensais
 * 3. Inconsistências de valores
 * 4. Meses faltantes
 * 
 * Retorna relatório detalhado de inconsistências
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const { workshop_id, ano = 2026 } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id required' }, { status: 400 });
    }

    const relatorio = {
      workshop_id,
      ano,
      timestamp: new Date().toISOString(),
      dre: {
        total_lancamentos: 0,
        com_recorrencia: 0,
        sem_recorrencia: 0,
        inconsistencias: []
      },
      budget: {
        total_metas: 0,
        metas_anuais: 0,
        metas_mensais: 0,
        inconsistencias: []
      },
      resumo: {
        status: 'OK',
        total_inconsistencias: 0,
        recomendacoes: []
      }
    };

    // === VALIDAÇÃO DRE ===
    const lancamentos = await base44.entities.DRELancamento.filter({
      workshop_id,
      mes: `${ano}-`
    });

    relatorio.dre.total_lancamentos = lancamentos.length;
    relatorio.dre.com_recorrencia = lancamentos.filter(l => l.recorrencia_id).length;
    relatorio.dre.sem_recorrencia = lancamentos.filter(l => !l.recorrencia_id).length;

    // Agrupa por descrição para identificar possíveis recorrências não marcadas
    const gruposDRE = new Map();
    lancamentos.forEach(l => {
      const key = `${l.descricao}|${l.categoria}|${l.tipo}`;
      if (!gruposDRE.has(key)) gruposDRE.set(key, []);
      gruposDRE.get(key).push(l);
    });

    // Identifica grupos que parecem recorrências mas não estão marcados
    for (const [key, itens] of gruposDRE.entries()) {
      if (itens.length >= 3 && !itens[0].recorrencia_id) {
        const [descricao] = key.split('|');
        const valores = itens.map(i => i.valor);
        const valorMedio = valores.reduce((a, b) => a + b, 0) / valores.length;
        const variacao = Math.max(...valores.map(v => Math.abs(v - valorMedio) / valorMedio));

        if (variacao <= 0.15) {
          relatorio.dre.inconsistencias.push({
            tipo: 'POSSIVEL_RECORRENCIA_NAO_MARCADA',
            descricao,
            meses: itens.length,
            valor_medio: valorMedio,
            ids: itens.map(i => i.id),
            severidade: 'MEDIA'
          });
        }
      }
    }

    // === VALIDAÇÃO BUDGET ===
    const metas = await base44.entities.BudgetMeta.filter({
      workshop_id,
      mes: `${ano}-`
    });

    relatorio.budget.total_metas = metas.length;
    relatorio.budget.metas_anuais = metas.filter(m => m.periodicidade === 'anual' || m.mes.endsWith('-ANUAL')).length;
    relatorio.budget.metas_mensais = metas.filter(m => !m.periodicidade || m.periodicidade === 'mensal').length;

    // Agrupa metas mensais por item
    const metasMensaisPorItem = new Map();
    const metasAnuais = [];

    metas.forEach(m => {
      if (m.mes.endsWith('-ANUAL') || m.periodicidade === 'anual') {
        metasAnuais.push(m);
      } else {
        const key = `${m.item}|${m.categoria}|${m.tipo}`;
        if (!metasMensaisPorItem.has(key)) metasMensaisPorItem.set(key, []);
        metasMensaisPorItem.get(key).push(m);
      }
    });

    // Compara anual vs soma das mensais
    metasAnuais.forEach(metaAnual => {
      const key = `${metaAnual.item}|${metaAnual.categoria}|${metaAnual.tipo}`;
      const mensais = metasMensaisPorItem.get(key) || [];

      const somaMensais = mensais.reduce((sum, m) => sum + (m.meta_fixa_rs || 0), 0);
      const diff = Math.abs(somaMensais - (metaAnual.meta_fixa_rs || 0));
      const diffPercentual = somaMensais > 0 ? diff / somaMensais : 0;

      if (diffPercentual > 0.05) { // 5% de tolerância
        relatorio.budget.inconsistencias.push({
          tipo: 'DIVERGENCIA_ANUAL_VS_MENSAIS',
          item: metaAnual.item,
          valor_anual: metaAnual.meta_fixa_rs,
          soma_mensais: somaMensais,
          diff_percentual: (diffPercentual * 100).toFixed(2) + '%',
          severidade: diffPercentual > 0.2 ? 'ALTA' : 'MEDIA'
        });
      }
    });

    // Verifica meses faltantes
    const mesesEsperados = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const mesesCobertos = new Set(metas.map(m => m.mes.split('-')[1]));
    
    const mesesFaltantes = mesesEsperados.filter(m => !mesesCobertos.has(m));
    if (mesesFaltantes.length > 0) {
      relatorio.budget.inconsistencias.push({
        tipo: 'MESES_FALTANTES',
        meses: mesesFaltantes,
        severidade: 'BAIXA'
      });
    }

    // === RESUMO ===
    relatorio.resumo.total_inconsistencias = 
      relatorio.dre.inconsistencias.length + 
      relatorio.budget.inconsistencias.length;

    if (relatorio.resumo.total_inconsistencias > 0) {
      relatorio.resumo.status = 'ATENCAO';
      
      if (relatorio.dre.inconsistencias.length > 0) {
        relatorio.resumo.recomendacoes.push(
          `Executar backfillRecorrencias (dry_run=false) para marcar ${relatorio.dre.inconsistencias.length} possíveis recorrências`
        );
      }

      if (relatorio.budget.inconsistencias.length > 0) {
        relatorio.resumo.recomendacoes.push(
          `Revisar ${relatorio.budget.inconsistencias.length} divergências entre metas anuais e mensais`
        );
      }
    } else {
      relatorio.resumo.status = 'OK';
      relatorio.resumo.recomendacoes.push('Dados consistentes. Nenhuma ação necessária.');
    }

    return Response.json(relatorio);
  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});
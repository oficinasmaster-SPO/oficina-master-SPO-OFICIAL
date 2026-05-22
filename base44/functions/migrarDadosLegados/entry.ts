import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Migra dados legados para nova estrutura
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admin' }, { status: 403 });
    }

    const { workshop_id } = await req.json();
    if (!workshop_id) {
      return Response.json({ error: 'workshop_id obrigatório' }, { status: 400 });
    }

    const resultados = {
      dre_migrados: 0,
      dfc_migrados: 0,
      metas_migradas: 0,
      erros: []
    };

    // 1. Migra DRE antigo para novo formato
    const dreAntigo = await base44.entities.DREMonthly.filter({
      workshop_id
    });

    for (const dre of dreAntigo) {
      try {
        // Verifica se já existe no novo formato
        const existente = await base44.entities.DRELancamento.filter({
          workshop_id,
          mes: dre.mes
        });

        if (existente.length === 0) {
          // Cria lançamentos consolidados
          await base44.entities.DRELancamento.create({
            workshop_id,
            mes: dre.mes,
            tipo: 'receita',
            categoria: 'Faturamento',
            descricao: 'Faturamento consolidado',
            valor: dre.faturamento || 0,
            entra_tcmp2: false
          });
          resultados.dre_migrados++;
        }
      } catch (error) {
        resultados.erros.push({ entidade: 'DRE', id: dre.id, error: error.message });
      }
    }

    // 2. Migra metas antigas
    const metasAntigas = await base44.entities.Goal.filter({
      workshop_id
    });

    for (const meta of metasAntigas) {
      try {
        const mes = meta.month ? `${meta.year}-${String(meta.month).padStart(2, '0')}` : null;
        if (!mes) continue;

        const existente = await base44.entities.BudgetMeta.filter({
          workshop_id,
          mes,
          item: meta.category || 'Meta'
        });

        if (existente.length === 0) {
          await base44.entities.BudgetMeta.create({
            workshop_id,
            mes,
            item: meta.category || 'Meta',
            categoria: meta.category || 'Geral',
            tipo: 'receita',
            meta_fixa_rs: meta.target_value || 0,
            responsavel_nome: meta.responsavel || 'Não definido'
          });
          resultados.metas_migradas++;
        }
      } catch (error) {
        resultados.erros.push({ entidade: 'BudgetMeta', id: meta.id, error: error.message });
      }
    }

    return Response.json({
      success: true,
      ...resultados,
      resumo: `Migrados ${resultados.dre_migrados} DREs, ${resultados.metas_migradas} metas`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
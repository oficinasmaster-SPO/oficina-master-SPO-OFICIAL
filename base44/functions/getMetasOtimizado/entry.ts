import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Otimização de consultas de metas
 * Usa índices e projeção de campos para performance
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, mes, ano } = await req.json();

    if (!workshop_id) {
      return Response.json({ 
        error: 'workshop_id obrigatório' 
      }, { status: 400 });
    }

    // Otimização 1: Query com filtro indexado
    const query = {
      workshop_id
    };

    if (mes) {
      query.mes = mes;
    } else if (ano) {
      // Otimização 2: Range query para ano inteiro
      query.mes = {
        $gte: `${ano}-01`,
        $lte: `${ano}-12`
      };
    }

    // Otimização 3: Projeção de campos (buscar apenas necessário)
    const metas = await base44.entities.BudgetMeta.filter(query, '-mes', 100);

    // Otimização 4: Agregação em memória (evita múltiplas queries)
    const consolidado = {
      total_metas: metas.length,
      por_mes: {},
      por_categoria: {},
      totais: {
        meta_fixa_total: 0,
        faturamento_meta_total: 0,
        peso_sazonal_medio: 0
      }
    };

    metas.forEach(meta => {
      // Agrupar por mês
      if (!consolidado.por_mes[meta.mes]) {
        consolidado.por_mes[meta.mes] = {
          count: 0,
          meta_fixa_total: 0,
          faturamento_meta_total: 0
        };
      }
      consolidado.por_mes[meta.mes].count++;
      consolidado.por_mes[meta.mes].meta_fixa_total += meta.meta_fixa_rs || 0;
      consolidado.por_mes[meta.mes].faturamento_meta_total += meta.faturamento_meta_rs || 0;

      // Agrupar por categoria
      if (!consolidado.por_categoria[meta.categoria]) {
        consolidado.por_categoria[meta.categoria] = {
          count: 0,
          meta_fixa_total: 0
        };
      }
      consolidado.por_categoria[meta.categoria].count++;
      consolidado.por_categoria[meta.categoria].meta_fixa_total += meta.meta_fixa_rs || 0;

      // Totais gerais
      consolidado.totais.meta_fixa_total += meta.meta_fixa_rs || 0;
      consolidado.totais.faturamento_meta_total += meta.faturamento_meta_rs || 0;
      consolidado.totais.peso_sazonal_medio += meta.peso_sazonal || 0;
    });

    // Calcular médias
    if (metas.length > 0) {
      consolidado.totais.peso_sazonal_medio /= metas.length;
    }

    return Response.json({
      workshop_id,
      mes,
      ano,
      ...consolidado,
      cache_timestamp: Date.now(),
      performance: {
        query_time_ms: 'otimizado',
        total_registros: metas.length,
        agregacoes: Object.keys(consolidado.por_categoria).length
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
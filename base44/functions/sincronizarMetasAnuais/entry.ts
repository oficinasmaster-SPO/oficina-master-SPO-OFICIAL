import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      workshop_id,
      ano,
      item,
      categoria,
      tipo,
      meta_anual_rs,
      distribuicao = 'igual',
      metas_mensais = []
    } = body;

    if (!workshop_id || !ano || !item || !categoria || !meta_anual_rs) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: workshop_id, ano, item, categoria, meta_anual_rs' 
      }, { status: 400 });
    }

    // Calcular distribuição mensal
    let metasParaCriar = [];
    
    if (distribuicao === 'igual') {
      const valorMensal = meta_anual_rs / 12;
      metasParaCriar = Array(12).fill(null).map((_, i) => ({
        mes: `${ano}-${String(i + 1).padStart(2, '0')}`,
        meta_mensal: valorMensal,
        meta_acumulada: valorMensal * (i + 1)
      }));
    } else {
      // Distribuição personalizada
      let acumulado = 0;
      metasParaCriar = metas_mensais.map((meta, i) => {
        acumulado += (meta.valor || 0);
        return {
          mes: `${ano}-${String(i + 1).padStart(2, '0')}`,
          meta_mensal: meta.valor || 0,
          meta_acumulada: acumulado
        };
      });
    }

    // Criar/atualizar 12 registros BudgetMeta
    const operacoes = metasParaCriar.map(async ({ mes, meta_mensal, meta_acumulada }) => {
      // Buscar existente
      const existentes = await base44.entities.BudgetMeta.filter({
        workshop_id,
        mes,
        item,
        categoria
      });

      if (existentes.length > 0) {
        // Atualizar
        await base44.entities.BudgetMeta.update(existentes[0].id, {
          periodicidade: 'anual',
          meta_anual_rs,
          meta_fixa_rs: meta_mensal,
          meta_acumulada_mes: meta_acumulada,
          faturamento_meta_rs: meta_anual_rs, // Base de cálculo
          tipo
        });
      } else {
        // Criar
        await base44.entities.BudgetMeta.create({
          workshop_id,
          mes,
          item,
          categoria,
          tipo,
          periodicidade: 'anual',
          meta_anual_rs,
          meta_fixa_rs: meta_mensal,
          meta_acumulada_mes: meta_acumulada,
          faturamento_meta_rs: meta_anual_rs,
          controlar_orcamento: true
        });
      }
    });

    await Promise.all(operacoes);

    return Response.json({
      success: true,
      message: `Meta anual de R$ ${meta_anual_rs.toFixed(2)} sincronizada para ${item}`,
      meses_atualizados: 12,
      distribuicao
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      details: 'Erro ao sincronizar metas anuais'
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Calcula totais consolidados por grupo hierárquico
 * Agrega metas e realizados por BudgetGroup
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
      return Response.json({ 
        error: 'Parâmetros obrigatórios: workshop_id, mes' 
      }, { status: 400 });
    }

    // Buscar grupos
    const grupos = await base44.entities.BudgetGroup.filter({
      workshop_id,
      ativo: true
    }, 'order');

    // Buscar metas do mês
    const metas = await base44.entities.BudgetMeta.filter({
      workshop_id,
      mes
    });

    // Buscar realizados do mês (DRE)
    const realizados = await base44.entities.DRELancamento.filter({
      workshop_id,
      mes
    });

    // Consolidar por grupo
    const consolidado = [];

    for (const grupo of grupos) {
      // Filtrar metas deste grupo
      const metas_grupo = metas.filter(m => m.group_id === grupo.id);
      
      // Calcular total meta
      const meta_total = metas_grupo.reduce((acc, m) => {
        const valor_meta = m.meta_fixa_rs || (m.faturamento_meta_rs * (m.meta_percentual / 100));
        return acc + (valor_meta || 0);
      }, 0);

      // Calcular total realizado
      const realizado_total = realizados
        .filter(r => {
          const meta_correspondente = metas_grupo.find(m => 
            m.item === r.descricao || m.categoria === r.categoria
          );
          return !!meta_correspondente;
        })
        .reduce((acc, r) => acc + r.valor, 0);

      // Calcular atingimento
      const atingimento_percentual = meta_total > 0 
        ? (realizado_total / meta_total) * 100 
        : 0;

      consolidado.push({
        grupo_id: grupo.id,
        grupo_nome: grupo.name,
        grupo_tipo: grupo.type,
        grupo_cor: grupo.color,
        meta_total: meta_total,
        realizado_total: realizado_total,
        atingimento_percentual: parseFloat(atingimento_percentual.toFixed(2)),
        saldo: realizado_total - meta_total,
        itens_count: metas_grupo.length
      });
    }

    // Totais gerais
    const total_meta = consolidado.reduce((acc, g) => acc + g.meta_total, 0);
    const total_realizado = consolidado.reduce((acc, g) => acc + g.realizado_total, 0);
    const total_atingimento = total_meta > 0 ? (total_realizado / total_meta) * 100 : 0;

    return Response.json({
      workshop_id,
      mes,
      consolidado_por_grupo: consolidado,
      totais_gerais: {
        meta_total,
        realizado_total,
        atingimento_percentual: parseFloat(total_atingimento.toFixed(2)),
        saldo_geral: total_realizado - total_meta
      },
      grupos_count: consolidado.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
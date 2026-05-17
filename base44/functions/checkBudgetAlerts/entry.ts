import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { workshopId, mes } = await req.json();

    if (!workshopId || !mes) {
      return Response.json({ error: 'workshopId e mes são obrigatórios' }, { status: 400 });
    }

    // Buscar metas e lançamentos
    const metas = await base44.entities.BudgetMeta.filter({
      workshop_id: workshopId,
      mes: mes
    });

    const lancamentos = await base44.entities.DRELancamento.filter({
      workshop_id: workshopId,
      mes: mes
    });

    if (!metas || metas.length === 0) {
      return Response.json({ alerts: [], message: 'Nenhuma meta configurada para este mês' });
    }

    // Calcular alertas
    const alerts = [];

    metas.forEach(meta => {
      const meta_rs = meta.meta_percentual 
        ? (meta.meta_percentual / 100) * (meta.faturamento_meta_rs || 0)
        : meta.meta_fixa_rs;

      const realizado = (lancamentos || [])
        .filter(l => l.categoria === meta.categoria && l.item === meta.item)
        .reduce((sum, l) => sum + (l.valor || 0), 0);

      const percentual = meta_rs > 0 ? (realizado / meta_rs) * 100 : 0;

      // Alerta quando > 110% da meta
      if (percentual > 110) {
        alerts.push({
          tipo: 'critical',
          categoria: meta.categoria,
          item: meta.item,
          responsavel: meta.responsavel_nome || 'Sem responsável',
          meta_rs,
          realizado,
          percentual: Math.round(percentual),
          excesso: realizado - meta_rs,
          mensagem: `${meta.item} ultrapassou a meta em ${Math.round(percentual - 100)}%`
        });
      }
      // Aviso quando > 95% e <= 110%
      else if (percentual > 95) {
        alerts.push({
          tipo: 'warning',
          categoria: meta.categoria,
          item: meta.item,
          responsavel: meta.responsavel_nome || 'Sem responsável',
          meta_rs,
          realizado,
          percentual: Math.round(percentual),
          excesso: realizado - meta_rs,
          mensagem: `${meta.item} está próximo ao limite (${Math.round(percentual)}%)`
        });
      }
    });

    // Ordenar por severidade
    const alertasOrdenados = alerts.sort((a, b) => {
      if (a.tipo === 'critical' && b.tipo !== 'critical') return -1;
      if (a.tipo !== 'critical' && b.tipo === 'critical') return 1;
      return b.percentual - a.percentual;
    });

    return Response.json({
      alerts: alertasOrdenados,
      totalCritical: alertasOrdenados.filter(a => a.tipo === 'critical').length,
      totalWarning: alertasOrdenados.filter(a => a.tipo === 'warning').length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao verificar alertas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
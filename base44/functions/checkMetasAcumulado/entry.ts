import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { workshop_id, mes_referencia } = await req.json();

    if (!workshop_id || !mes_referencia) {
      return Response.json({ error: 'workshop_id e mes_referencia são obrigatórios' }, { status: 400 });
    }

    // Extrair ano e mês
    const [ano, mes] = mes_referencia.split('-');
    const mesNumero = parseInt(mes);

    // Buscar todas as metas anuais da oficina
    const metasAnuais = await base44.entities.BudgetMeta.filter({
      workshop_id,
      periodicidade: 'anual'
    });

    if (!metasAnuais || metasAnuais.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'Nenhuma meta anual encontrada',
        alertas_gerados: 0 
      });
    }

    // Agrupar metas por item/categoria
    const metasPorItem = {};
    metasAnuais.forEach(meta => {
      const key = `${meta.item}-${meta.categoria}`;
      if (!metasPorItem[key]) {
        metasPorItem[key] = {
          ...meta,
          meta_anual_rs: meta.meta_anual_rs || 0,
          meses: []
        };
      }
      metasPorItem[key].meses.push(meta);
    });

    const alertas = [];

    // Para cada meta, calcular acumulado até o mês atual
    for (const [key, metaAgrupada] of Object.entries(metasPorItem)) {
      const metaAnual = metaAgrupada.meta_anual_rs;
      const metaAcumuladaEsperada = (metaAnual / 12) * mesNumero;
      
      // Buscar realizados do DRE até o mês atual (filtro otimizado)
      const realizados = await base44.entities.DRELancamento.filter({
        workshop_id,
        categoria: metaAgrupada.categoria,
        descricao: metaAgrupada.item
      });

      const realizadosAcumulados = realizados
        .filter(l => {
          const [lAno, lMes] = l.mes.split('-');
          return parseInt(lAno) === parseInt(ano) && parseInt(lMes) <= mesNumero;
        })
        .reduce((sum, l) => sum + (l.valor || 0), 0);

      // Calcular % de atingimento acumulado
      const percentualAtingimento = metaAcumuladaEsperada > 0 
        ? (realizadosAcumulados / metaAcumuladaEsperada) * 100 
        : 0;

      // Se < 80%, gerar alerta
      if (percentualAtingimento < 80 && percentualAtingimento > 0) {
        const alerta = {
          workshop_id,
          consultor_id: user.id,
          tipo: 'desvio_orcamentario',
          titulo: `Alerta: ${metaAgrupada.item} abaixo da meta`,
          mensagem: `O item "${metaAgrupada.item}" está com ${percentualAtingimento.toFixed(1)}% da meta acumulada (${formatarMoeda(realizadosAcumulados)} realizado vs ${formatarMoeda(metaAcumuladaEsperada)} esperado)`,
          meta_item: metaAgrupada.item,
          meta_categoria: metaAgrupada.categoria,
          percentual_atingimento: percentualAtingimento,
          valor_realizado: realizadosAcumulados,
          valor_esperado: metaAcumuladaEsperada,
          mes_referencia: mes_referencia,
          criado_em: new Date().toISOString()
        };

        alertas.push(alerta);

        // Criar notificação
        await base44.entities.Notification.create({
          user_id: user.id,
          title: `🚨 Desvio Orçamentário: ${metaAgrupada.item}`,
          message: alerta.mensagem,
          type: 'alerta_orcamento',
          metadata: {
            workshop_id,
            item: metaAgrupada.item,
            categoria: metaAgrupada.categoria,
            percentual: percentualAtingimento
          }
        });

        // Enviar email (opcional)
        try {
          await base44.integrations.Core.SendEmail({
            to: user.email,
            subject: `Alerta de Desvio Orçamentário - ${metaAgrupada.item}`,
            body: `
              <h2>Alerta de Desvio Orçamentário</h2>
              <p><strong>Item:</strong> ${metaAgrupada.item}</p>
              <p><strong>Categoria:</strong> ${metaAgrupada.categoria}</p>
              <p><strong>Período:</strong> Acumulado até ${mesNumero}/${ano}</p>
              <hr>
              <p><strong>Meta Acumulada:</strong> ${formatarMoeda(metaAcumuladaEsperada)}</p>
              <p><strong>Realizado:</strong> ${formatarMoeda(realizadosAcumulados)}</p>
              <p><strong>Percentual:</strong> ${percentualAtingimento.toFixed(1)}%</p>
              <hr>
              <p style="color: #dc2626;"><strong>⚠️ Atenção:</strong> O realizado está abaixo de 80% da meta esperada.</p>
              <p>Recomendamos revisar as ações para este item e tomar medidas corretivas.</p>
            `
          });
        } catch (emailError) {
          console.error('Erro ao enviar email de alerta:', emailError);
        }
      }
    }

    return Response.json({
      success: true,
      message: `Verificação concluída. ${alertas.length} alerta(s) gerado(s)`,
      alertas_gerados: alertas.length,
      alertas,
      mes_referencia: mes_referencia
    });

  } catch (error) {
    console.error('Erro ao verificar metas acumuladas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
};
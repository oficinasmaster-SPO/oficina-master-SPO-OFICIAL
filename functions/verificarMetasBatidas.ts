import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const workshops = await base44.asServiceRole.entities.Workshop.list();
    let notificacoesCriadas = 0;

    for (const workshop of workshops) {
      if (!workshop.monthly_goals || !workshop.monthly_goals.projected_revenue) continue;

      const metaPrevista = workshop.monthly_goals.projected_revenue;
      const faturamentoAtual = workshop.monthly_goals.actual_revenue_achieved || 0;
      const ticketMedioMeta = workshop.monthly_goals.average_ticket || 0;
      const volumeClientesMeta = workshop.monthly_goals.customer_volume || 0;

      // Verificar se já notificou esse mês
      const mesAtual = new Date().toISOString().slice(0, 7);
      const notificacoesExistentes = await base44.asServiceRole.entities.Notification.filter({
        workshop_id: workshop.id,
        type: 'meta_batida'
      });

      const jaNotificadoEsteMes = notificacoesExistentes.some(n => 
        n.created_date.startsWith(mesAtual)
      );

      if (jaNotificadoEsteMes) continue;

      // Meta de faturamento batida
      if (faturamentoAtual >= metaPrevista && metaPrevista > 0) {
        await criarNotificacaoMeta(base44, workshop, 'faturamento', faturamentoAtual, metaPrevista);
        notificacoesCriadas++;
        
        // Notificação nacional
        await criarNotificacaoNacional(base44, workshop, 'faturamento', faturamentoAtual);
      }

      // Verificar metas de colaboradores
      const colaboradores = await base44.asServiceRole.entities.Employee.filter({
        workshop_id: workshop.id,
        status: 'ativo'
      });

      for (const colab of colaboradores) {
        const metasColab = await verificarMetasColaborador(base44, colab, workshop);
        if (metasColab.bateuMeta) {
          await criarNotificacaoMetaColaborador(base44, workshop, colab, metasColab);
          notificacoesCriadas++;
        }
      }
    }

    return Response.json({ 
      success: true, 
      notificacoes_criadas: notificacoesCriadas
    });

  } catch (error) {
    console.error("Erro ao verificar metas:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});

async function criarNotificacaoMeta(base44, workshop, tipoMeta, valorAtual, valorMeta) {
  const colaboradores = await base44.asServiceRole.entities.Employee.filter({
    workshop_id: workshop.id,
    status: 'ativo'
  });

  const percentual = ((valorAtual / valorMeta) * 100).toFixed(1);

  for (const colab of colaboradores) {
    if (!colab.user_id) continue;

    const prefs = await base44.asServiceRole.entities.Notification.filter({
      user_id: colab.user_id,
      type: 'config_preferencias'
    });

    const notificarMetas = prefs[0]?.metadata?.notificar_metas !== false;

    if (notificarMetas) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: colab.user_id,
        workshop_id: workshop.id,
        type: 'meta_batida',
        title: '🎯 Meta Batida!',
        message: `Parabéns! A meta de ${tipoMeta} foi atingida (${percentual}%)`,
        is_read: false,
        email_sent: false,
        metadata: {
          tipo_meta: tipoMeta,
          valor_atual: valorAtual,
          valor_meta: valorMeta,
          percentual: percentual
        }
      });
    }
  }
}

async function criarNotificacaoNacional(base44, workshop, tipoMeta, valor) {
  const todosWorkshops = await base44.asServiceRole.entities.Workshop.list();
  
  for (const outroWorkshop of todosWorkshops) {
    if (outroWorkshop.id === workshop.id) continue;

    const colaboradores = await base44.asServiceRole.entities.Employee.filter({
      workshop_id: outroWorkshop.id,
      status: 'ativo'
    });

    for (const colab of colaboradores) {
      if (!colab.user_id) continue;

      const prefs = await base44.asServiceRole.entities.Notification.filter({
        user_id: colab.user_id,
        type: 'config_preferencias'
      });

      const notificarNacional = prefs[0]?.metadata?.notificar_metas_nacionais !== false;

      if (notificarNacional) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: colab.user_id,
          type: 'meta_nacional_empresa',
          title: '🏆 Meta Nacional Batida',
          message: `${workshop.name} de ${workshop.city}/${workshop.state} bateu a meta de ${tipoMeta}!`,
          is_read: false,
          email_sent: false,
          metadata: {
            workshop_nome: workshop.name,
            workshop_cidade: workshop.city,
            workshop_estado: workshop.state,
            tipo_meta: tipoMeta,
            valor: valor
          }
        });
      }
    }
  }
}

async function verificarMetasColaborador(base44, colaborador, workshop) {
  // Aqui você pode buscar métricas de produtividade, vendas, etc.
  const diagnosticos = await base44.asServiceRole.entities.ProductivityDiagnostic.filter({
    employee_id: colaborador.id
  });

  if (diagnosticos.length === 0) {
    return { bateuMeta: false };
  }

  const ultimo = diagnosticos[diagnosticos.length - 1];
  const classificacao = ultimo.classification;

  if (classificacao === 'ideal') {
    return {
      bateuMeta: true,
      tipo: 'produtividade',
      valor: ultimo.cost_percentage
    };
  }

  return { bateuMeta: false };
}

async function criarNotificacaoMetaColaborador(base44, workshop, colaborador, metasInfo) {
  const todosWorkshops = await base44.asServiceRole.entities.Workshop.list();
  
  for (const outroWorkshop of todosWorkshops) {
    const colaboradores = await base44.asServiceRole.entities.Employee.filter({
      workshop_id: outroWorkshop.id,
      status: 'ativo'
    });

    for (const colab of colaboradores) {
      if (!colab.user_id) continue;

      const prefs = await base44.asServiceRole.entities.Notification.filter({
        user_id: colab.user_id,
        type: 'config_preferencias'
      });

      const notificarColaboradores = prefs[0]?.metadata?.notificar_colaboradores_nacionais !== false;

      if (notificarColaboradores) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: colab.user_id,
          type: 'meta_nacional_colaborador',
          title: '⭐ Colaborador Destaque',
          message: `${colaborador.full_name} (${colaborador.position}) de ${workshop.name} - ${workshop.city}/${workshop.state} bateu meta de ${metasInfo.tipo}!`,
          is_read: false,
          email_sent: false,
          metadata: {
            colaborador_nome: colaborador.full_name,
            colaborador_cargo: colaborador.position,
            workshop_nome: workshop.name,
            workshop_cidade: workshop.city,
            workshop_estado: workshop.state,
            tipo_meta: metasInfo.tipo
          }
        });
      }
    }
  }
}
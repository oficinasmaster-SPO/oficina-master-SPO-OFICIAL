import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Payload da automação de entidade
    const { event, data, old_data } = await req.json();

    if (!event || !data) {
      return Response.json({ error: 'Payload inválido' }, { status: 400 });
    }

    // Verificar se é atualização de BudgetMeta
    if (event.entity_name !== 'BudgetMeta' || event.type !== 'update') {
      return Response.json({ message: 'Evento não processado' });
    }

    const workshopId = data.workshop_id;
    const mes = data.mes;

    if (!workshopId || !mes) {
      return Response.json({ error: 'workshop_id ou mes ausentes' }, { status: 400 });
    }

    // Calcular meta e realizado
    const meta_rs = data.meta_percentual 
      ? (data.meta_percentual / 100) * (data.faturamento_meta_rs || 0)
      : data.meta_fixa_rs;

    // Buscar realizados do DRE
    const lancamentos = await base44.entities.DRELancamento.filter({
      workshop_id: workshopId,
      mes: mes,
      categoria: data.categoria,
      descricao: data.item
    });

    const realizado = lancamentos.reduce((sum, l) => sum + (l.valor || 0), 0);

    // Calcular % de atingimento
    const percentualAtingimento = meta_rs > 0 ? (realizado / meta_rs) * 100 : 0;

    // Se realizado < 80% da meta, gerar alerta
    if (percentualAtingimento < 80 && percentualAtingimento > 0) {
      // Usar service role para criar notificação (automation não tem user auth)
      const base44Service = createClientFromRequest(req);
      const userId = data.created_by; // Usar criador da meta

      await base44Service.asServiceRole.entities.Notification.create({
        user_id: userId,
        title: `🚨 Desvio Orçamentário: ${data.item}`,
        message: `O item "${data.item}" está com apenas ${percentualAtingimento.toFixed(1)}% da meta (${formatarMoeda(realizado)} realizado vs ${formatarMoeda(meta_rs)} esperado)`,
        type: 'alerta_orcamento',
        metadata: {
          workshop_id: workshopId,
          item: data.item,
          categoria: data.categoria,
          percentual: percentualAtingimento,
          budget_meta_id: data.id
        }
      });

      // Enviar email para o responsável
      if (data.responsavel_nome) {
        try {
          const responsavel = await base44Service.asServiceRole.entities.User.filter({ 
            full_name: data.responsavel_nome 
          });

          if (responsavel && responsavel.length > 0) {
            await base44Service.asServiceRole.integrations.Core.SendEmail({
              to: responsavel[0].email,
              subject: `Alerta de Desvio Orçamentário - ${data.item}`,
              body: `
                <h2>⚠️ Alerta de Desvio Orçamentário</h2>
                <p><strong>Item:</strong> ${data.item}</p>
                <p><strong>Categoria:</strong> ${data.categoria}</p>
                <p><strong>Período:</strong> ${mes}</p>
                <hr>
                <p><strong>Meta:</strong> ${formatarMoeda(meta_rs)}</p>
                <p><strong>Realizado:</strong> ${formatarMoeda(realizado)}</p>
                <p><strong>Percentual:</strong> ${percentualAtingimento.toFixed(1)}%</p>
                <hr>
                <p style="color: #dc2626;"><strong>⚠️ Atenção:</strong> O realizado está abaixo de 80% da meta.</p>
                <p>Recomendamos revisar as ações para este item.</p>
              `
            });
          }
        } catch (emailError) {
          console.error('Erro ao enviar email de alerta:', emailError);
        }
      }

      return Response.json({
        success: true,
        message: `Alerta gerado: ${data.item} com ${percentualAtingimento.toFixed(1)}% da meta`,
        alerta: {
          item: data.item,
          percentual: percentualAtingimento,
          meta: meta_rs,
          realizado: realizado
        }
      });
    }

    return Response.json({ message: 'Sem alertas' });

  } catch (error) {
    console.error('Erro ao verificar desvio orçamentário:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
};
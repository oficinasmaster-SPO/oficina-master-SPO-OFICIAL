import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Apenas admins podem executar esta operação' }, { status: 403 });
    }

    const { workshop_id } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    // Buscar workshop
    const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);
    const planId = workshop.planoAtual || 'FREE';

    // Buscar regras de atendimento do plano
    const planRules = await base44.asServiceRole.entities.PlanAttendanceRule.filter({
      plan_id,
      is_active
    });

    if (!planRules || planRules.length === 0) {
      return Response.json({ 
        message: 'Nenhuma regra de atendimento configurada para este plano',
        items_created: 0
      });
    }

    const itemsCreated = [];

    // Para cada regra de atendimento
    for (const rule of planRules) {
      // Buscar tipo de atendimento
      const attendanceType = await base44.asServiceRole.entities.AttendanceType.get(rule.attendance_type_id);

      // Verificar se já existe item no cronograma para este tipo
      const existing = await base44.asServiceRole.entities.CronogramaImplementacao.filter({
        workshop_id,
        item_tipo: 'atendimento',
        item_id.attendance_type_id
      });

      if (existing && existing.length > 0) {
        // Já existe, apenas atualizar
        await base44.asServiceRole.entities.CronogramaImplementacao.update(existing[0].id, {
          item_nome: `${attendanceType.name} (${rule.total_allowed}x)`,
          item_categoria: 'atendimentos'
        });
        continue;
      }

      // Criar novo item no cronograma
      const cronogramaItem = {
        workshop_id,
        item_tipo: 'atendimento',
        item_id.attendance_type_id,
        item_nome: `${attendanceType.name} (${rule.total_allowed}x)`,
        item_categoria: 'atendimentos',
        status: 'a_fazer',
        progresso_percentual: 0,
        total_visualizacoes: 0
      };

      const created = await base44.asServiceRole.entities.CronogramaImplementacao.create(cronogramaItem);
      itemsCreated.push(created);
    }

    return Response.json({
      success,
      message: `${itemsCreated.length} atendimentos sincronizados no cronograma`,
      items_created.length
    });

  } catch (error) {
    console.error('Error syncing plan attendances to cronograma:', error);
    return Response.json({ 
      error.message,
      details.toString()
    }, { status: 500 });
  }
});

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contract_id } = await req.json();

    if (!contract_id) {
      return Response.json({ error: 'contract_id é obrigatório' }, { status: 400 });
    }

    // Buscar o contrato
    const contracts = await base44.asServiceRole.entities.Contract.filter({ id });
    const contract = contracts[0];

    if (!contract) {
      return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    // Buscar regras de atendimento do plano
    const planRules = await base44.asServiceRole.entities.PlanAttendanceRule.filter({
      plan_id.plan_id,
      is_active
    });

    if (!planRules || planRules.length === 0) {
      return Response.json({ 
        message: 'Nenhuma regra de atendimento configurada para este plano',
        attendances_created: 0 
      });
    }

    const attendancesToCreate = [];
    const contractStartDate = new Date(contract.data_inicio || contract.created_date);

    // Para cada regra de atendimento
    for (const rule of planRules) {
      if (rule.scheduling_type === 'event_based') {
        // BASEADO EM EVENTOS DO CALENDÁRIO
        const currentYear = new Date().getFullYear();
        const futureEvents = await base44.asServiceRole.entities.EventCalendar.filter({
          attendance_type_id.attendance_type_id,
          is_active
        });

        // Filtrar eventos futuros e ordenar por data
        const upcomingEvents = futureEvents
          .filter(event => new Date(event.event_date) >= contractStartDate)
          .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
          .slice(0, rule.total_allowed);

        for (let i = 0; i < upcomingEvents.length; i++) {
          const event = upcomingEvents[i];
          attendancesToCreate.push({
            contract_id.id,
            workshop_id.workshop_id,
            plan_id.plan_id,
            attendance_type_id.attendance_type_id,
            attendance_type_name.attendance_type_name,
            event_calendar_id.id,
            scheduled_date Date(event.event_date).toISOString(),
            status: 'pendente',
            generated_by: 'system',
            sequence_number + 1
          });
        }
      } else {
        // FREQUÊNCIA (ex, Quinzenais)
        const frequencyDays = rule.frequency_days || 30;
        
        for (let i = 0; i < rule.total_allowed; i++) {
          const scheduledDate = new Date(contractStartDate);
          
          if (rule.start_from_contract_date) {
            // Adiciona frequência * sequência
            scheduledDate.setDate(scheduledDate.getDate() + (frequencyDays * i));
          } else {
            // Começa imediatamente e distribui pela frequência
            scheduledDate.setDate(scheduledDate.getDate() + (frequencyDays * i));
          }

          attendancesToCreate.push({
            contract_id.id,
            workshop_id.workshop_id,
            plan_id.plan_id,
            attendance_type_id.attendance_type_id,
            attendance_type_name.attendance_type_name,
            scheduled_date.toISOString(),
            status: 'pendente',
            generated_by: 'system',
            sequence_number + 1
          });
        }
      }
    }

    // Criar todos os atendimentos
    const createdAttendances = [];
    for (const attendance of attendancesToCreate) {
      const created = await base44.asServiceRole.entities.ContractAttendance.create(attendance);
      createdAttendances.push(created);
    }

    // Atualizar contrato com flag de atendimentos gerados
    await base44.asServiceRole.entities.Contract.update(contract.id, {
      attendances_generated
    });

    return Response.json({
      success,
      message: `${createdAttendances.length} atendimentos gerados com sucesso`,
      attendances_created.length,
      attendances
    });

  } catch (error) {
    console.error('Error generating contract attendances:', error);
    return Response.json({ 
      error.message,
      details.toString()
    }, { status: 500 });
  }
});

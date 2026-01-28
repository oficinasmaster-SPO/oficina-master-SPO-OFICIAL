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
    const contracts = await base44.asServiceRole.entities.Contract.filter({ id: contract_id });
    const contract = contracts[0];

    if (!contract) {
      return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    // Buscar regras de atendimento do plano
    const planRules = await base44.asServiceRole.entities.PlanAttendanceRule.filter({
      plan_id: contract.plan_id,
      is_active: true
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
      if (rule.scheduling_type === 'fixed_dates') {
        // DATAS FIXAS (ex: Imersões)
        if (rule.fixed_dates && Array.isArray(rule.fixed_dates)) {
          for (let i = 0; i < rule.fixed_dates.length; i++) {
            const fixedDate = rule.fixed_dates[i];
            attendancesToCreate.push({
              contract_id: contract.id,
              workshop_id: contract.workshop_id,
              plan_id: contract.plan_id,
              attendance_type_id: rule.attendance_type_id,
              attendance_type_name: rule.attendance_type_name,
              scheduled_date: new Date(fixedDate.date).toISOString(),
              status: 'pendente',
              generated_by: 'system',
              sequence_number: i + 1
            });
          }
        }
      } else {
        // FREQUÊNCIA (ex: Mensais, Quinzenais)
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
            contract_id: contract.id,
            workshop_id: contract.workshop_id,
            plan_id: contract.plan_id,
            attendance_type_id: rule.attendance_type_id,
            attendance_type_name: rule.attendance_type_name,
            scheduled_date: scheduledDate.toISOString(),
            status: 'pendente',
            generated_by: 'system',
            sequence_number: i + 1
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
      attendances_generated: true
    });

    return Response.json({
      success: true,
      message: `${createdAttendances.length} atendimentos gerados com sucesso`,
      attendances_created: createdAttendances.length,
      attendances: createdAttendances
    });

  } catch (error) {
    console.error('Error generating contract attendances:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});
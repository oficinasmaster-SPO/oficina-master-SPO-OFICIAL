import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, old_data, changed_fields, payload_too_large } = payload;
    
    if (!event || event.entity_name !== 'Workshop') {
      return Response.json({ message: 'Not a Workshop event' });
    }
    
    let workshop = data;
    if (payload_too_large) {
      workshop = await base44.asServiceRole.entities.Workshop.get(event.entity_id);
    }
    
    // Check if status changed to 'ativo' or planStatus changed to 'active'
    const statusChangedToAtivo = (changed_fields?.includes('status') && workshop.status === 'ativo');
    const planStatusChangedToActive = (changed_fields?.includes('planStatus') && workshop.planStatus === 'active');
    const isNewCreation = event.type === 'create' && (workshop.status === 'ativo' || workshop.planStatus === 'active');
    
    if (!statusChangedToAtivo && !planStatusChangedToActive && !isNewCreation) {
        return Response.json({ message: 'Workshop did not become active' });
    }

    const rawPlanId = workshop.planId || workshop.planoAtual;
    if (!rawPlanId) {
        return Response.json({ message: 'Workshop has no plan' });
    }

    // Normalize: try both the raw value and uppercase version to handle case mismatches
    const planIdVariants = [rawPlanId, rawPlanId.toUpperCase(), rawPlanId.toLowerCase()];
    const uniqueVariants = [...new Set(planIdVariants)];
    
    let planRules = [];
    for (const variant of uniqueVariants) {
      const rules = await base44.asServiceRole.entities.PlanAttendanceRule.filter({
        plan_id: variant,
        is_active: true
      });
      if (rules && rules.length > 0) {
        planRules = rules;
        console.log(`Found ${rules.length} rules for plan_id="${variant}"`);
        break;
      }
    }

    if (!planRules || planRules.length === 0) {
      return Response.json({ message: 'Nenhuma regra de atendimento configurada para este plano' });
    }

    const attendancesToCreate = [];
    const startDate = new Date();

    for (const rule of planRules) {
      // Only for Frequency scheduling
      if (rule.scheduling_type === 'frequency') {
        // Check if attendances already exist for this type and workshop to avoid duplicates
        const existing = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter({
          workshop_id: workshop.id,
          tipo_atendimento: rule.attendance_type_name || rule.attendance_type_id
        });

        // Only create if we haven't already created attendances for this type
        if (existing.length < rule.total_allowed) {
          const remainingToCreate = rule.total_allowed - existing.length;
          const frequencyDays = rule.frequency_days || 30;
          
          for (let i = 0; i < remainingToCreate; i++) {
            const scheduledDate = new Date(startDate);
            // i + existing.length helps space them out if some already exist
            scheduledDate.setDate(scheduledDate.getDate() + (frequencyDays * (i + existing.length)));

            attendancesToCreate.push({
              workshop_id: workshop.id,
              consultor_id: workshop.owner_id || workshop.created_by || 'system',
              consultor_nome: 'A Definir',
              tipo_atendimento: rule.attendance_type_name || rule.attendance_type_id,
              data_agendada: scheduledDate.toISOString(),
              status: 'agendado',
              fase_oficina: 1,
            });
          }
        }
      }
    }

    const createdAttendances = [];
    for (const attendance of attendancesToCreate) {
      const created = await base44.asServiceRole.entities.ConsultoriaAtendimento.create(attendance);
      createdAttendances.push(created);
    }

    return Response.json({
      success: true,
      message: `${createdAttendances.length} atendimentos gerados com sucesso`,
      attendances_created: createdAttendances.length
    });

  } catch (error) {
    console.error('Error generating workshop attendances:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
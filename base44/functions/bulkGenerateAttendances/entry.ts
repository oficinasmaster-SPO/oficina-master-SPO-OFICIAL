import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { plan_id } = await req.json();
    if (!plan_id) {
      return Response.json({ error: 'plan_id is required' }, { status: 400 });
    }

    const planUpper = plan_id.toUpperCase();
    const planLower = plan_id.toLowerCase();

    // Fetch all active workshops for both case variants
    const workshopsUpper = await base44.asServiceRole.entities.Workshop.filter({ planoAtual: planUpper, status: 'ativo' });
    const workshopsLower = await base44.asServiceRole.entities.Workshop.filter({ planoAtual: planLower, status: 'ativo' });
    
    // Deduplicate by ID
    const workshopMap = {};
    for (const w of [...workshopsUpper, ...workshopsLower]) {
      workshopMap[w.id] = w;
    }
    const workshops = Object.values(workshopMap);

    console.log(`Found ${workshops.length} active workshops with plan ${plan_id}`);

    // Fetch plan rules (try both cases)
    let planRules = await base44.asServiceRole.entities.PlanAttendanceRule.filter({ plan_id: planUpper, is_active: true });
    if (!planRules || planRules.length === 0) {
      planRules = await base44.asServiceRole.entities.PlanAttendanceRule.filter({ plan_id: planLower, is_active: true });
    }

    if (!planRules || planRules.length === 0) {
      return Response.json({ error: `No active rules found for plan ${plan_id}` });
    }

    // Only frequency-based rules
    const frequencyRules = planRules.filter(r => r.scheduling_type === 'frequency');
    console.log(`Found ${frequencyRules.length} frequency rules for plan ${plan_id}`);

    const results = [];

    for (const workshop of workshops) {
      const workshopResult = { workshop_id: workshop.id, name: workshop.name, created: 0, skipped: 0, details: [] };
      const startDate = new Date();

      for (const rule of frequencyRules) {
        const typeName = rule.attendance_type_name || rule.attendance_type_id;
        
        // Check existing attendances for this type
        const existing = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter({
          workshop_id: workshop.id,
          tipo_atendimento: typeName
        });

        if (existing.length >= rule.total_allowed) {
          workshopResult.skipped++;
          workshopResult.details.push(`${typeName}: já existe (${existing.length}/${rule.total_allowed})`);
          continue;
        }

        const remainingToCreate = rule.total_allowed - existing.length;
        const frequencyDays = rule.frequency_days || 30;

        for (let i = 0; i < remainingToCreate; i++) {
          const scheduledDate = new Date(startDate);
          scheduledDate.setDate(scheduledDate.getDate() + (frequencyDays * (i + existing.length)));

          await base44.asServiceRole.entities.ConsultoriaAtendimento.create({
            workshop_id: workshop.id,
            consultor_id: workshop.owner_id || 'system',
            consultor_nome: 'A Definir',
            tipo_atendimento: typeName,
            data_agendada: scheduledDate.toISOString(),
            status: 'agendado',
            fase_oficina: 1,
          });
          workshopResult.created++;
        }
        workshopResult.details.push(`${typeName}: criados ${remainingToCreate} (existiam ${existing.length})`);
      }

      results.push(workshopResult);
      console.log(`Workshop ${workshop.name}: ${workshopResult.created} criados, ${workshopResult.skipped} pulados`);
    }

    const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

    return Response.json({
      success: true,
      summary: {
        workshops_processed: workshops.length,
        total_attendances_created: totalCreated,
        total_types_skipped: totalSkipped,
      },
      details: results
    });

  } catch (error) {
    console.error('Bulk generate error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
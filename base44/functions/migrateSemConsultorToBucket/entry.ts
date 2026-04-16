import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Migration: moves all ConsultoriaAtendimento without consultor_id
 * to the bucket (creates ContractAttendance pendente and deletes original).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all ConsultoriaAtendimento without consultor_id
    // Need to get all and filter in-memory since filter doesn't support null/empty checks well
    const allAtendimentos = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter(
      {},
      '-created_date',
      2000
    );

    const semConsultor = allAtendimentos.filter(a => !a.consultor_id || a.consultor_id === '');

    let migrated = 0;
    const errors = [];

    for (const a of semConsultor) {
      try {
        // Create ContractAttendance pendente (bucket item)
        await base44.asServiceRole.entities.ContractAttendance.create({
          workshop_id: a.workshop_id,
          attendance_type_name: a.tipo_atendimento || 'acompanhamento_mensal',
          scheduled_date: a.data_agendada,
          status: 'pendente',
          // Don't link to the atendimento - it will be deleted
          consultoria_atendimento_id: null,
          notes: `Migrado de atendimento sem consultor (original: ${a.id})`
        });

        // Delete the original ConsultoriaAtendimento
        await base44.asServiceRole.entities.ConsultoriaAtendimento.delete(a.id);
        
        migrated++;
      } catch (err) {
        errors.push({ id: a.id, error: err.message });
      }
    }

    return Response.json({ 
      success: true, 
      migrated, 
      total_sem_consultor: semConsultor.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
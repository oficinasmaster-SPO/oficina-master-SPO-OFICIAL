import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Busca atendimentos (limite alto para garantir que pega todos)
    const allAtendimentos = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter(
      {},
      '-created_date',
      2000
    );

    // Filtra os que estão com consultor_nome = "A Definir"
    const aDefinir = allAtendimentos.filter(a => a.consultor_nome === 'A Definir');

    let migrated = 0;
    const errors = [];

    for (const a of aDefinir) {
      try {
        // Cria ContractAttendance pendente (bucket item)
        await base44.asServiceRole.entities.ContractAttendance.create({
          contract_id: 'migrated',
          plan_id: 'migrated',
          attendance_type_id: 'migrated',
          workshop_id: a.workshop_id,
          attendance_type_name: a.tipo_atendimento || 'acompanhamento_mensal',
          scheduled_date: a.data_agendada,
          status: 'pendente',
          consultoria_atendimento_id: null,
          notes: `Migrado de atendimento A Definir (original: ${a.id})`
        });

        // Deleta o ConsultoriaAtendimento original
        await base44.asServiceRole.entities.ConsultoriaAtendimento.delete(a.id);
        
        migrated++;
      } catch (err) {
        errors.push({ id: a.id, error: err.message });
      }
    }

    return Response.json({ 
      success: true, 
      migrated, 
      total_a_definir: aDefinir.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
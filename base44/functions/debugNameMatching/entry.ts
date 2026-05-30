import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Debug: Nome Matching para Backfill
 * 
 * Mostra os nomes EXATOS em ConsultoriaAtendimento vs ContractAttendance
 * para identificar por que o matching falha.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { workshop_id } = await req.json();

    const log = (event, msg, data = {}) => {
      console.log(JSON.stringify({ event, msg, ...data, ts: new Date().toISOString() }));
    };

    // ConsultoriaAtendimento realizados
    const realizados = await base44.entities.ConsultoriaAtendimento.filter(
      { workshop_id },
      null,
      200
    );

    const realizadosList = (realizados || []).filter(r => 
      r.status === 'realizado' || r.status === 'concluido'
    );

    // ContractAttendance sem link
    const contractAtt = await base44.entities.ContractAttendance.filter(
      { workshop_id },
      null,
      500
    );

    const withoutLink = (contractAtt || []).filter(c => 
      !c.consultoria_atendimento_id && 
      c.attendance_type_id !== 'migrated'
    );

    // Normalization function
    const normalize = (str) => (str || '').toLowerCase().replace(/[_\s-]+/g, ' ').trim();

    // Matching analysis
    const matching = [];

    for (const realizado of realizadosList) {
      const realizadoNome = normalize(realizado.tipo_atendimento);
      
      const matches = withoutLink.filter(c => {
        const attendanceNome = normalize(c.attendance_type_name);
        const fullMatch = attendanceNome === realizadoNome;
        const partialMatch = attendanceNome.includes(realizadoNome) || realizadoNome.includes(attendanceNome);
        return fullMatch || partialMatch;
      });

      matching.push({
        realizado: {
          id: realizado.id,
          tipo_atendimento: realizado.tipo_atendimento,
          normalized: realizadoNome,
          data: realizado.data_agendada
        },
        matches: matches.map(m => ({
          id: m.id,
          attendance_type_name: m.attendance_type_name,
          normalized: normalize(m.attendance_type_name),
          scheduled_date: m.scheduled_date,
          diff_days: Math.round((new Date(realizado.data_agendada) - new Date(m.scheduled_date)) / (1000 * 60 * 60 * 24))
        })),
        match_count: matches.length
      });
    }

    return Response.json({
      workshop_id,
      realizados_count: realizadosList.length,
      unlinked_count: withoutLink.length,
      matching_analysis: matching
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
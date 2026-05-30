import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Função de Diagnóstico — Bug de Contagem ClientHistoryFloatingPanel
 * 
 * Retorna:
 * - Quantos ContractAttendance existem por tipo
 * - Quantos têm consultoria_atendimento_id (realizados)
 * - Quantos são duplicatas
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

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id required' }, { status: 400 });
    }

    // Buscar todos os ContractAttendance do workshop
    const attendances = await base44.entities.ContractAttendance.filter(
      { workshop_id },
      null,
      500
    );

    // Agrupar por tipo
    const byType = {};
    for (const att of attendances) {
      const key = att.attendance_type_id;
      if (!key || key === 'migrated') continue;

      if (!byType[key]) {
        byType[key] = {
          name: att.attendance_type_name || key,
          total: 0,
          withLink: 0,
          withoutLink: 0,
          records: []
        };
      }

      byType[key].total++;
      byType[key].records.push({
        id: att.id,
        status: att.status,
        hasLink: !!att.consultoria_atendimento_id,
        linkId: att.consultoria_atendimento_id,
        scheduled_date: att.scheduled_date
      });

      if (att.consultoria_atendimento_id) {
        byType[key].withLink++;
      } else {
        byType[key].withoutLink++;
      }
    }

    // Detectar duplicatas
    const duplicates = Object.entries(byType)
      .filter(([_, data]) => data.total > 1)
      .map(([typeId, data]) => ({
        attendance_type_id: typeId,
        name: data.name,
        total: data.total,
        withLink: data.withLink,
        withoutLink: data.withoutLink
      }));

    // Buscar ConsultoriaAtendimento realizados
    const realizados = await base44.entities.ConsultoriaAtendimento.filter(
      { workshop_id, status: 'realizado' },
      '-data_agendada',
      50
    );

    return Response.json({
      success: true,
      workshop_id,
      summary: {
        totalAttendances: attendances.length,
        totalTypes: Object.keys(byType).length,
        totalDuplicates: duplicates.length
      },
      byType,
      duplicates,
      realizados_count: realizados.length,
      realizados: realizados.map(r => ({
        id: r.id,
        tipo: r.tipo_atendimento,
        data: r.data_agendada,
        consultor: r.consultor_nome
      }))
    });

  } catch (error) {
    console.error('Erro no diagnóstico:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});
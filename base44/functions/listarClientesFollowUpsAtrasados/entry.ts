import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hoje = new Date();
    const tresUmasDiasAtras = new Date(hoje.getTime() - 3 * 24 * 60 * 60 * 1000);
    
    console.log('[listarClientesFollowUpsAtrasados] Iniciando busca');

    // Buscar follow-ups atrasados (3+ dias)
    const followupsAtrasados = await base44.asServiceRole.entities.FollowUpReminder.filter({
      is_completed: false,
      reminder_date: { '$lte': tresUmasDiasAtras.toISOString().split('T')[0] }
    }, '-reminder_date', 500);

    console.log('[listarClientesFollowUpsAtrasados] Follow-ups atrasados:', followupsAtrasados.length);

    // Buscar todos os workshops
    const workshopIds = [...new Set(followupsAtrasados.map(f => f.workshop_id))];
    const workshops = workshopIds.length > 0 
      ? await base44.asServiceRole.entities.Workshop.filter(
          { id: { '$in': workshopIds } },
          '-created_date',
          500
        )
      : [];

    console.log('[listarClientesFollowUpsAtrasados] Workshops únicos:', workshops.length);

    // Consolidar por cliente
    const clientesMap = {};

    for (const followup of followupsAtrasados) {
      const workshop = workshops.find(w => w.id === followup.workshop_id);
      if (!workshop) continue;

      const clienteId = workshop.id;
      if (!clientesMap[clienteId]) {
        clientesMap[clienteId] = {
          id: workshop.id,
          cliente: workshop.name,
          empresa: workshop.company_id ? workshop.name : 'N/A',
          cidade: workshop.city || '—',
          estado: workshop.state || '—',
          segment: workshop.segment || workshop.segment_auto || '—',
          followups_atrasados: 0,
          dias_max_atraso: 0,
          data_ultimo_atraso: null,
          consultores: new Set(),
          status_plano: workshop.planStatus || 'unknown'
        };
      }

      const reminderDate = new Date(followup.reminder_date);
      const diasAtraso = Math.floor((hoje - reminderDate) / (1000 * 60 * 60 * 24));

      clientesMap[clienteId].followups_atrasados += 1;
      clientesMap[clienteId].dias_max_atraso = Math.max(clientesMap[clienteId].dias_max_atraso, diasAtraso);
      clientesMap[clienteId].data_ultimo_atraso = new Date(followup.reminder_date).toLocaleDateString('pt-BR');
      
      if (followup.consultor_nome) {
        clientesMap[clienteId].consultores.add(followup.consultor_nome);
      }
    }

    // Converter para array e ordenar
    const clientes = Object.values(clientesMap)
      .map(c => ({
        ...c,
        consultores: Array.from(c.consultores).join(', ') || '—'
      }))
      .sort((a, b) => b.dias_max_atraso - a.dias_max_atraso || b.followups_atrasados - a.followups_atrasados);

    console.log('[listarClientesFollowUpsAtrasados] Clientes únicos com follow-ups atrasados:', clientes.length);

    return Response.json({
      clientes,
      estatisticas: {
        total_clientes_atrasados: clientes.length,
        total_followups_atrasados: followupsAtrasados.length,
        media_followups_por_cliente: (followupsAtrasados.length / clientes.length).toFixed(1),
        cliente_maior_atraso: clientes[0]?.cliente || 'N/A',
        dias_maior_atraso: clientes[0]?.dias_max_atraso || 0,
        data_relatorio: hoje.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('[listarClientesFollowUpsAtrasados] Erro:', error);
    return Response.json({ 
      error: error.message,
      clientes: []
    }, { status: 500 });
  }
});
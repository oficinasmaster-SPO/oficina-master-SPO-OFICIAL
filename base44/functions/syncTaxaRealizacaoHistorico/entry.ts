import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role !== 'admin') {
      return Response.json({ error: 'Apenas admins podem sincronizar' }, { status: 403 });
    }

    // Buscar todos os workshops PRATA
    const workshops = await base44.entities.Workshop.list('-created_date', 500);
    const workshopsAtivos = workshops.filter(w => w.planoAtual === 'PRATA' && w.status === 'ativo');

    // Buscar TODAS as ATAs realizadas
    const atas = await base44.entities.ConsultoriaAtendimento.list('-created_date', 5000);
    const atasRealizadas = atas.filter(a => a.status === 'realizado');

    // Buscar regras de atendimento
    const planRules = await base44.entities.PlanAttendanceRule.list('-created_date', 500);
    const prataRules = planRules.filter(r => r.plan_id === 'PRATA' && r.is_active);

    const resultado = {
      workshops_prata_ativos: workshopsAtivos.length,
      total_atas_realizadas: atasRealizadas.length,
      regras_prata: prataRules.length,
      detalhes: []
    };

    // Para cada cliente PRATA, verificar e contar realizados
    for (const workshop of workshopsAtivos) {
      const atasDoClie = atasRealizadas.filter(a => a.workshop_id === workshop.id);
      const totalPrevisto = prataRules.length > 0 ? prataRules.reduce((sum, r) => sum + (r.total_allowed || 0), 0) : 0;
      const taxa = totalPrevisto > 0 ? Math.round((atasDoClie.length / totalPrevisto) * 100) : 0;

      resultado.detalhes.push({
        cliente: workshop.name,
        atas_realizadas: atasDoClie.length,
        total_previsto: totalPrevisto,
        taxa_calculada: taxa + '%',
        workshop_id: workshop.id
      });
    }

    console.log('Sincronismo completado:', resultado);

    return Response.json({
      success: true,
      mensagem: 'Sincronismo completado - dados verificados',
      resumo: resultado
    });

  } catch (error) {
    console.error('Erro ao sincronizar taxa realização:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});
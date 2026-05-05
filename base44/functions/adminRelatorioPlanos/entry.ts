import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Relatório administrativo: contagem de workshops por plano, status e outras métricas.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const workshops = await base44.asServiceRole.entities.Workshop.list();

    if (!Array.isArray(workshops)) {
      return Response.json({ error: 'Falha ao buscar workshops' }, { status: 500 });
    }

    const planos = ['FREE', 'START', 'BRONZE', 'PRATA', 'GOLD', 'IOM', 'MILLIONS'];

    // Contagem por plano
    const porPlano = {};
    for (const plano of planos) {
      porPlano[plano] = workshops.filter(w => (w.planoAtual || 'FREE').toUpperCase() === plano).length;
    }

    // Contagem por status do plano (active, trial, canceled)
    const porPlanStatus = {
      active: workshops.filter(w => w.planStatus === 'active').length,
      trial: workshops.filter(w => w.planStatus === 'trial').length,
      canceled: workshops.filter(w => w.planStatus === 'canceled').length,
      outros: workshops.filter(w => !['active', 'trial', 'canceled'].includes(w.planStatus)).length,
    };

    // Contagem por status da oficina
    const porStatusOficina = {
      ativo: workshops.filter(w => w.status === 'ativo').length,
      inativo: workshops.filter(w => w.status === 'inativo').length,
      acompanhamento: workshops.filter(w => w.status === 'acompanhamento').length,
    };

    // Contagem por estado (UF)
    const porEstado = {};
    for (const w of workshops) {
      const uf = w.state || 'N/A';
      porEstado[uf] = (porEstado[uf] || 0) + 1;
    }

    // Lista detalhada por plano
    const detalhes = {};
    for (const plano of planos) {
      detalhes[plano] = workshops
        .filter(w => (w.planoAtual || 'FREE').toUpperCase() === plano)
        .map(w => ({
          id: w.id,
          nome: w.name || '(sem nome)',
          cidade: w.city || '',
          estado: w.state || '',
          email: w.email || '',
          telefone: w.telefone || '',
          planStatus: w.planStatus || '',
          statusOficina: w.status || '',
          dataAssinatura: w.dataAssinatura || null,
          dataRenovacao: w.dataRenovacao || null,
          criadoEm: w.created_date || null,
        }));
    }

    return Response.json({
      success: true,
      total: workshops.length,
      porPlano,
      porPlanStatus,
      porStatusOficina,
      porEstado,
      detalhes,
      geradoEm: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Erro no adminRelatorioPlanos:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
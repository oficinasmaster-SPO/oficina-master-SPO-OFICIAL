import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const LOTES = {
  financeiro: [
    ['DRELancamento', 'workshop_id'],
    ['DREMonthly', 'workshop_id'],
    ['DFCLancamento', 'workshop_id'],
    ['BudgetMeta', 'workshop_id'],
    ['ContaPagar', 'workshop_id'],
    ['ContaReceber', 'workshop_id'],
    ['LiquidacaoFinanceira', 'workshop_id']
  ],
  crm_agenda: [
    ['Client', 'workshop_id'],
    ['CustomerFeedback', 'workshop_id'],
    ['FollowUpReminder', 'workshop_id'],
    ['FollowUpConcluido', 'workshop_id'],
    ['FollowUpContador', 'workshop_id'],
    ['AgendamentoSolicitacao', 'workshop_id'],
    ['SugestaoAgendamento', 'workshop_id'],
    ['TipoAtendimentoConsultoria', 'workshop_id'],
    ['ConsultoriaAtendimento', 'workshop_id']
  ],
  completo: [
    ['DRELancamento', 'workshop_id'],
    ['DREMonthly', 'workshop_id'],
    ['DFCLancamento', 'workshop_id'],
    ['BudgetMeta', 'workshop_id'],
    ['ContaPagar', 'workshop_id'],
    ['ContaReceber', 'workshop_id'],
    ['LiquidacaoFinanceira', 'workshop_id'],
    ['CronogramaImplementacao', 'workshop_id'],
    ['ConsultoriaSprint', 'workshop_id'],
    ['ConsultoriaAtendimento', 'workshop_id'],
    ['Goal', 'workshop_id'],
    ['Task', 'workshop_id'],
    ['PedidoInterno', 'cliente_id']
  ]
};

// Regressão RLS real: todas as consultas de negócio usam o token do usuário
// autenticado. asServiceRole não é usado nas asserções.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const lote = ['financeiro', 'crm_agenda', 'completo'].includes(body.lote)
      ? body.lote
      : 'financeiro';
    const targetWorkshopId = body.workshop_id || user.tenant_workshop_id || null;

    // Fonte primária: memberships ativas visíveis ao próprio usuário.
    const memberships = await base44.entities.TenantMembership.filter(
      { user_id: user.id, status: 'active' }, 'created_date', 500
    );
    const membershipWorkshopIds = [...new Set((memberships || []).map((m) => m.workshop_id).filter(Boolean))];

    // Dual-read somente quando não há membership ativa.
    const legacyWorkshopIds = [user.workshop_id, user.data?.workshop_id].filter(Boolean);
    const fallbackUsed = membershipWorkshopIds.length === 0;
    const authorizedWorkshopIds = fallbackUsed
      ? [...new Set(legacyWorkshopIds)]
      : membershipWorkshopIds;

    if (targetWorkshopId && !authorizedWorkshopIds.includes(targetWorkshopId) && user.role !== 'admin') {
      return Response.json({
        error: 'Sem membership ativa para a filial selecionada',
        workshop_id: targetWorkshopId,
        memberships_ativas: membershipWorkshopIds
      }, { status: 403 });
    }

    const entities = LOTES[lote];
    const resultados = {};
    let entidadesComVazamento = 0;
    let entidadesComErro = 0;

    for (const [name, field] of entities) {
      try {
        const records = await base44.entities[name].list('-created_date', 1000);
        const arr = Array.isArray(records) ? records : [];
        let filialSelecionada = 0;
        let outraFilialAutorizada = 0;
        let naoAutorizada = 0;
        let semOficina = 0;
        const oficinasNaoAutorizadas = new Set();

        for (const record of arr) {
          const workshopId = record[field];
          if (!workshopId) {
            semOficina++;
          } else if (targetWorkshopId && workshopId === targetWorkshopId) {
            filialSelecionada++;
          } else if (authorizedWorkshopIds.includes(workshopId)) {
            outraFilialAutorizada++;
          } else {
            naoAutorizada++;
            oficinasNaoAutorizadas.add(workshopId);
          }
        }

        // Admin possui visibilidade global por desenho; para demais perfis,
        // qualquer oficina sem membership/fallback é vazamento real.
        const vazamento = user.role !== 'admin' && naoAutorizada > 0;
        if (vazamento) entidadesComVazamento++;

        resultados[name] = {
          campo_oficina: field,
          total_visiveis: arr.length,
          filial_selecionada: filialSelecionada,
          outras_filiais_com_membership: outraFilialAutorizada,
          oficinas_sem_membership: naoAutorizada,
          sem_oficina: semOficina,
          vazamento,
          oficinas_nao_autorizadas: Array.from(oficinasNaoAutorizadas).slice(0, 20)
        };
      } catch (error) {
        entidadesComErro++;
        resultados[name] = { erro: error.message };
      }
    }

    const branchesToTest = membershipWorkshopIds.map((workshopId) => ({
      workshop_id: workshopId,
      tested_now: workshopId === targetWorkshopId
    }));

    return Response.json({
      executado_em: new Date().toISOString(),
      lote,
      perspectiva: 'usuario_autenticado (asserções sem asServiceRole)',
      usuario: {
        id: user.id,
        role: user.role,
        profile_id: memberships?.[0]?.profile_id || null,
        membership_types: [...new Set((memberships || []).map((m) => m.membership_type).filter(Boolean))],
        tenant_workshop_id: user.tenant_workshop_id || null,
        workshop_id_raiz: user.workshop_id || null,
        workshop_id_legado: user.data?.workshop_id || null
      },
      tenant: {
        fonte_primaria: fallbackUsed ? 'legacy_fallback' : 'TenantMembership',
        fallback_usado: fallbackUsed,
        filial_selecionada: targetWorkshopId,
        memberships_ativas: membershipWorkshopIds,
        filiais_da_matriz: branchesToTest,
        alternancia_multifilial_completa: branchesToTest.length <= 1 || branchesToTest.every((item) => item.tested_now)
      },
      matriz: {
        caso_atual: {
          role: user.role,
          profile_id: memberships?.[0]?.profile_id || null,
          membership_types: [...new Set((memberships || []).map((m) => m.membership_type).filter(Boolean))],
          workshop_id: targetWorkshopId
        },
        instrucao: membershipWorkshopIds.length > 1
          ? 'Executar novamente com cada workshop_id listado em filiais_da_matriz após alternar a filial no app.'
          : 'Caso de tenant único executado.'
      },
      resumo: {
        entidades_testadas: entities.length,
        entidades_com_vazamento: entidadesComVazamento,
        entidades_com_erro: entidadesComErro,
        aprovado: entidadesComVazamento === 0 && entidadesComErro === 0
      },
      resultados
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
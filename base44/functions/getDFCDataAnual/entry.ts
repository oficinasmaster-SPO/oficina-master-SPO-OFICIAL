import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const TENANT_FALLBACK_EVENT = 'TENANT_RESOLVE_FALLBACK';

// ── CÓPIA FIEL de shared/tenantResolver.resolveTenantCore — manter sincronizada ──
async function resolveTenantCore(sr, authUser, params = {}) {
  const { workshop_id, admin_workshop_id, impersonated_user_id, sync_user_field } = params;
  const isAdmin = authUser.role === 'admin';

  let effectiveUser = authUser;
  let isImpersonating = false;
  if (impersonated_user_id && impersonated_user_id !== authUser.id) {
    if (!isAdmin) return { status: 403, error: 'Apenas administradores podem impersonar usuários' };
    const target = await sr.entities.User.get(impersonated_user_id).catch(() => null);
    if (!target) return { status: 404, error: 'Usuário impersonado não encontrado' };
    effectiveUser = target;
    isImpersonating = true;
  }

  let memberships = await sr.entities.TenantMembership.filter(
    { user_id: effectiveUser.id, status: 'active' }, 'created_date', 500
  );

  let fallbackUsed = false;
  if (memberships.length === 0) {
    const legacyWid = effectiveUser.workshop_id || effectiveUser.data?.workshop_id || null;
    console.warn(`[resolveTenant] BACKFILL PENDENTE: user ${effectiveUser.id} (${effectiveUser.email}) sem TenantMembership — fallback user.workshop_id=${legacyWid}`);
    try {
      await sr.entities.SystemEventLog.create({
        event_type: TENANT_FALLBACK_EVENT,
        entity_type: 'TenantMembership',
        entity_id: effectiveUser.id,
        workshop_id: legacyWid,
        triggered_by: 'system',
        status: 'warning',
        timestamp: new Date().toISOString(),
        details: { user_id: effectiveUser.id, email: effectiveUser.email, legacy_workshop_id: legacyWid },
      });
    } catch (_) {}
    if (legacyWid) {
      fallbackUsed = true;
      memberships = [{
        id: null, user_id: effectiveUser.id, workshop_id: legacyWid,
        membership_type: 'employee', status: 'active', is_default: true,
        notes: 'fallback-user-field',
      }];
    }
  }

  let effectiveMembership = null;
  if (admin_workshop_id) {
    if (!isAdmin) return { status: 403, error: 'admin_workshop_id é restrito a administradores' };
    effectiveMembership = memberships.find((m) => m.workshop_id === admin_workshop_id) || {
      id: null, user_id: effectiveUser.id, workshop_id: admin_workshop_id,
      membership_type: 'admin_support', status: 'active', is_default: false,
      notes: 'admin-override',
    };
  } else if (workshop_id) {
    effectiveMembership = memberships.find((m) => m.workshop_id === workshop_id);
    if (!effectiveMembership) return { status: 403, error: 'Sem membership ativa para o workshop solicitado' };
  } else {
    effectiveMembership = memberships.find((m) => m.is_default) || (memberships.length === 1 ? memberships[0] : null);
    if (!effectiveMembership && memberships.length > 1) {
      const preferido = effectiveUser.workshop_id || effectiveUser.data?.workshop_id;
      effectiveMembership = memberships.find((m) => m.workshop_id === preferido) || memberships[0];
    }
    if (!effectiveMembership) return { status: 404, error: 'Nenhum tenant disponível para o usuário' };
  }

  const workshop = await sr.entities.Workshop.get(effectiveMembership.workshop_id).catch(() => null);
  if (!workshop) return { status: 404, error: 'Workshop do tenant não encontrado' };

  if (sync_user_field && !isImpersonating && effectiveMembership.notes !== 'admin-override' &&
      (effectiveUser.tenant_workshop_id || null) !== effectiveMembership.workshop_id) {
    try { await sr.entities.User.update(effectiveUser.id, { tenant_workshop_id: effectiveMembership.workshop_id }); } catch (_) {}
  }

  return {
    status: 200,
    data: {
      effective_user_id: effectiveUser.id,
      membership: effectiveMembership,
      workshop: {
        id: workshop.id, name: workshop.name, status: workshop.status,
        segment: workshop.segment || workshop.segment_auto || null,
        city: workshop.city || null, company_id: workshop.company_id || null,
        consulting_firm_id: workshop.consulting_firm_id || null,
        planStatus: workshop.planStatus || null,
      },
      company_id: effectiveMembership.company_id || workshop.company_id || null,
      consulting_firm_id: effectiveMembership.consulting_firm_id || workshop.consulting_firm_id || null,
      profile_id: effectiveMembership.profile_id || null,
      membership_type: effectiveMembership.membership_type || null,
      isAdmin,
      isImpersonating,
      fallback_used: fallbackUsed,
      memberships,
    },
  };
}
// ── Fim da cópia fiel ──

// Mapeamento de categoria DRE → grupo DFC
function mapCategoriaToGrupoDFC(lancamento) {
  const { categoria, subcategoria } = lancamento;
  if (["manutencao"].includes(categoria)) return "investimento";
  if (subcategoria === "Parcelamento de equipamento") return "investimento";
  if (subcategoria === "Compra de imóvel/terreno") return "investimento";
  if (subcategoria === "Financiamento (veículo/imóvel)") return "financiamento";
  if (subcategoria === "Consórcio") return "financiamento";
  if (subcategoria === "Processos judiciais") return "financiamento";
  if (["financeiro"].includes(categoria)) return "financiamento";
  return "operacional";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { ano, workshop_id } = body;

    if (!ano || !workshop_id) {
      return Response.json({ error: 'ano e workshop_id são obrigatórios' }, { status: 400 });
    }

    // Validação de tenant EXCLUSIVAMENTE via resolveTenantCore (membership-first).
    const tenant = await resolveTenantCore(
      base44.asServiceRole, user,
      user.role === 'admin' ? { admin_workshop_id: workshop_id } : { workshop_id }
    );
    if (tenant.status !== 200) {
      return Response.json({ error: tenant.error }, { status: tenant.status });
    }
    const effectiveWorkshopId = tenant.data.workshop.id;

    // Buscar TODOS os dados do ano em paralelo (após membership validada)
    const [dfcLancamentosAno, dreLancamentosAno] = await Promise.all([
      base44.asServiceRole.entities.DFCLancamento.filter(
        { workshop_id: effectiveWorkshopId, mes: { $gte: `${ano}-01`, $lte: `${ano}-12` } },
        "-created_date", 500
      ),
      base44.asServiceRole.entities.DRELancamento.filter(
        { workshop_id: effectiveWorkshopId, mes: { $gte: `${ano}-01`, $lte: `${ano}-12` } },
        "-created_date", 500
      ),
    ]);

    // Indexar por mês para acesso O(1)
    const dfcPorMes = {};
    const drePorMes = {};

    for (const l of (dfcLancamentosAno || [])) {
      if (!dfcPorMes[l.mes]) dfcPorMes[l.mes] = [];
      dfcPorMes[l.mes].push(l);
    }
    for (const l of (dreLancamentosAno || [])) {
      if (!drePorMes[l.mes]) drePorMes[l.mes] = [];
      drePorMes[l.mes].push(l);
    }

    // Acumuladores para grupos anuais
    const gruposMap = {
      operacional:   { grupo: "operacional",   label: "Operacional",   total: 0, entradas: 0, saidas: 0 },
      investimento:  { grupo: "investimento",  label: "Investimento",  total: 0, entradas: 0, saidas: 0 },
      financiamento: { grupo: "financiamento", label: "Financiamento", total: 0, entradas: 0, saidas: 0 },
    };

    const meses = [];

    for (let m = 1; m <= 12; m++) {
      const mesRef = `${ano}-${String(m).padStart(2, '0')}`;

      const dfcManuais = (dfcPorMes[mesRef] || []).filter(l => l.grupo !== "saldo_inicial" && l.origem === "manual");
      const saldoRecord = (dfcPorMes[mesRef] || []).find(l => l.grupo === "saldo_inicial");

      const dreParaDFC = (drePorMes[mesRef] || []).map(l => ({
        grupo: mapCategoriaToGrupoDFC(l),
        tipo: l.tipo === "receita" ? "entrada" : "saida",
        valor: l.valor || 0,
      }));

      const todosItens = [...dfcManuais, ...dreParaDFC];

      const calcFluxo = (grupo) =>
        todosItens
          .filter(i => i.grupo === grupo)
          .reduce((sum, i) => sum + (i.tipo === "entrada" ? i.valor : -i.valor), 0);

      const operacional   = calcFluxo("operacional");
      const investimento  = calcFluxo("investimento");
      const financiamento = calcFluxo("financiamento");

      // Acumular nos grupos anuais
      for (const item of todosItens) {
        const g = gruposMap[item.grupo];
        if (!g) continue;
        if (item.tipo === "entrada") {
          g.entradas += item.valor;
        } else {
          g.saidas += item.valor;
        }
        g.total += item.tipo === "entrada" ? item.valor : -item.valor;
      }

      const saldoInicial = saldoRecord?.valor ?? saldoRecord?.saldo_inicial ?? 0;

      meses.push({
        mes: mesRef,
        mes_nome: new Date(ano, m - 1).toLocaleString('pt-BR', { month: 'short' }),
        operacional,
        investimento,
        financiamento,
        saldo_inicial: saldoInicial,
        saldo_final: saldoInicial + operacional + investimento + financiamento,
      });
    }

    const totalAnualOperacional   = meses.reduce((s, m) => s + m.operacional,   0);
    const totalAnualInvestimento  = meses.reduce((s, m) => s + m.investimento,  0);
    const totalAnualFinanciamento = meses.reduce((s, m) => s + m.financiamento, 0);
    const totalAnualSaldo         = totalAnualOperacional + totalAnualInvestimento + totalAnualFinanciamento;

    return Response.json({
      success: true,
      ano,
      workshop_id: effectiveWorkshopId,
      total_anual: {
        operacional:   totalAnualOperacional,
        investimento:  totalAnualInvestimento,
        financiamento: totalAnualFinanciamento,
        saldo_final:   totalAnualSaldo,
      },
      media_mensal: {
        operacional:   totalAnualOperacional  / 12,
        investimento:  totalAnualInvestimento / 12,
        financiamento: totalAnualFinanciamento / 12,
        saldo_final:   totalAnualSaldo        / 12,
      },
      meses,
      grupos: Object.values(gruposMap),
    });

  } catch (error) {
    return Response.json({ error: error.message, details: error.stack }, { status: 500 });
  }
});
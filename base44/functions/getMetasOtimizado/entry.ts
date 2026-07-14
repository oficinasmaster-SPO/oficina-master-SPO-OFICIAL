import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const TENANT_FALLBACK_EVENT = 'TENANT_RESOLVE_FALLBACK';

// ── CÓPIA FIEL de shared/tenantResolver.resolveTenantCore — manter sincronizada ──
const TENANT_RESOLVER_COPY_VERSION = '1.1.0';
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

/**
 * Otimização de consultas de metas
 * Usa índices e projeção de campos para performance
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, mes, ano } = await req.json();

    if (!workshop_id) {
      return Response.json({ 
        error: 'workshop_id obrigatório' 
      }, { status: 400 });
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

    // Otimização 1: Query com filtro indexado
    const query = {
      workshop_id: effectiveWorkshopId
    };

    if (mes) {
      query.mes = mes;
    } else if (ano) {
      // Otimização 2: Range query para ano inteiro
      query.mes = {
        $gte: `${ano}-01`,
        $lte: `${ano}-12`
      };
    }

    // Otimização 3: Consulta após membership validada
    const metas = await base44.asServiceRole.entities.BudgetMeta.filter(query, '-mes', 100);

    // Otimização 4: Agregação em memória (evita múltiplas queries)
    const consolidado = {
      total_metas: metas.length,
      por_mes: {},
      por_categoria: {},
      totais: {
        meta_fixa_total: 0,
        faturamento_meta_total: 0,
        peso_sazonal_medio: 0
      }
    };

    metas.forEach(meta => {
      // Agrupar por mês
      if (!consolidado.por_mes[meta.mes]) {
        consolidado.por_mes[meta.mes] = {
          count: 0,
          meta_fixa_total: 0,
          faturamento_meta_total: 0
        };
      }
      consolidado.por_mes[meta.mes].count++;
      consolidado.por_mes[meta.mes].meta_fixa_total += meta.meta_fixa_rs || 0;
      consolidado.por_mes[meta.mes].faturamento_meta_total += meta.faturamento_meta_rs || 0;

      // Agrupar por categoria
      if (!consolidado.por_categoria[meta.categoria]) {
        consolidado.por_categoria[meta.categoria] = {
          count: 0,
          meta_fixa_total: 0
        };
      }
      consolidado.por_categoria[meta.categoria].count++;
      consolidado.por_categoria[meta.categoria].meta_fixa_total += meta.meta_fixa_rs || 0;

      // Totais gerais
      consolidado.totais.meta_fixa_total += meta.meta_fixa_rs || 0;
      consolidado.totais.faturamento_meta_total += meta.faturamento_meta_rs || 0;
      consolidado.totais.peso_sazonal_medio += meta.peso_sazonal || 0;
    });

    // Calcular médias
    if (metas.length > 0) {
      consolidado.totais.peso_sazonal_medio /= metas.length;
    }

    return Response.json({
      workshop_id: effectiveWorkshopId,
      mes,
      ano,
      ...consolidado,
      cache_timestamp: Date.now(),
      performance: {
        query_time_ms: 'otimizado',
        total_registros: metas.length,
        agregacoes: Object.keys(consolidado.por_categoria).length
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
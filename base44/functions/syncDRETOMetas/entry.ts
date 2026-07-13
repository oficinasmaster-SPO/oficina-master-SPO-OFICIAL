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

/**
 * Sincroniza dados do DRE para Metas Mensais
 * Atualiza metas quando valores no DRE são alterados
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dre_id, workshop_id, month } = await req.json();
    
    if (!dre_id || !workshop_id || !month) {
      return Response.json(
        { error: 'dre_id, workshop_id e month são obrigatórios' },
        { status: 400 }
      );
    }

    // Validação de tenant EXCLUSIVAMENTE via resolveTenantCore (membership-first).
    // Nenhum asServiceRole de dados de negócio antes da resolução de membership.
    const tenant = await resolveTenantCore(
      base44.asServiceRole, user,
      user.role === 'admin' ? { admin_workshop_id: workshop_id } : { workshop_id }
    );
    if (tenant.status !== 200) {
      return Response.json({ error: tenant.error }, { status: tenant.status });
    }
    const effectiveWorkshopId = tenant.data.workshop.id;

    // 1. Buscar DRE após validar o vínculo do usuário com a oficina
    const dre = await base44.asServiceRole.entities.DREMonthly.get(dre_id);
    
    if (!dre) {
      return Response.json({ error: 'DRE não encontrado' }, { status: 404 });
    }

    if (dre.workshop_id !== effectiveWorkshopId) {
      return Response.json({ error: 'O DRE não pertence à oficina informada' }, { status: 400 });
    }

    // 2. Buscar Workshop com acesso de serviço já autorizado acima
    const workshop = await base44.asServiceRole.entities.Workshop.get(effectiveWorkshopId);
    
    if (!workshop) {
      return Response.json({ error: 'Workshop não encontrado' }, { status: 404 });
    }

    // 3. Buscar registros diários do mês para comparação
    const monthlyGoalHistory = await base44.asServiceRole.entities.MonthlyGoalHistory.filter({
      workshop_id: effectiveWorkshopId,
      month
    });

    // Consolidar dados históricos
    let historicalRevenueParts = 0;
    let historicalRevenueServices = 0;

    monthlyGoalHistory.forEach(log => {
      historicalRevenueParts += log.revenue_parts || 0;
      historicalRevenueServices += log.revenue_services || 0;
    });

    // 4. Comparar e detectar discrepâncias
    const drePartsRevenue = dre.revenue?.parts_applied || 0;
    const dreServicesRevenue = dre.revenue?.services || 0;
    
    const discrepancies = [];
    const tolerance = 0.05; // 5%

    if (historicalRevenueParts > 0) {
      const diff = Math.abs(drePartsRevenue - historicalRevenueParts) / historicalRevenueParts;
      if (diff > tolerance) {
        discrepancies.push({
          field: 'revenue_parts',
          historical: historicalRevenueParts,
          dre: drePartsRevenue,
          diff_percent: (diff * 100).toFixed(2),
          need_confirmation: true
        });
      }
    }

    if (historicalRevenueServices > 0) {
      const diff = Math.abs(dreServicesRevenue - historicalRevenueServices) / historicalRevenueServices;
      if (diff > tolerance) {
        discrepancies.push({
          field: 'revenue_services',
          historical: historicalRevenueServices,
          dre: dreServicesRevenue,
          diff_percent: (diff * 100).toFixed(2),
          need_confirmation: true
        });
      }
    }

    // 5. Se há discrepâncias significativas, não atualizar automaticamente
    if (discrepancies.length > 0) {
      return Response.json({
        success: false,
        requires_confirmation: true,
        discrepancies,
        message: 'Existem inconsistências entre DRE e Histórico de Produção. Confirme qual valor utilizar.'
      });
    }

    // 6. Se sem discrepâncias, atualizar metas com valores do DRE
    const updatedMonthlyGoals = {
      ...workshop.monthly_goals,
      month,
      revenue_parts: drePartsRevenue,
      revenue_services: dreServicesRevenue
    };

    await base44.asServiceRole.entities.Workshop.update(effectiveWorkshopId, {
      monthly_goals: updatedMonthlyGoals
    });

    return Response.json({
      success: true,
      message: 'Metas atualizadas com valores do DRE',
      updated_values: {
        revenue_parts: drePartsRevenue,
        revenue_services: dreServicesRevenue
      }
    });

  } catch (error) {
    console.error('Erro na sincronização DRE→Metas:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});
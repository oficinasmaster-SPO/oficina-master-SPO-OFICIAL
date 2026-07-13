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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id required' }, { status: 400 });
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // [1] Busca Sprints abertas
    const sprints = await base44.asServiceRole.entities.ConsultoriaSprint.filter({
      workshop_id: effectiveWorkshopId,
      status: { '$ne': 'completed' }
    }, '-created_date', 50);

    // [2] Busca Pedidos Internos
    const pedidosInternos = await base44.asServiceRole.entities.PedidoInterno.filter({
      cliente_id: effectiveWorkshopId,
      status: { '$ne': 'concluido' }
    }, '-created_date', 50);

    // [3] Busca Backlog Tarefas
    const backlogTarefas = await base44.asServiceRole.entities.TarefaBacklog.filter({
      cliente_id: effectiveWorkshopId,
      status: { '$in': ['aberta', 'bloqueada'] }
    }, '-created_date', 50);

    // [4] Busca Cronograma Itens
    const cronogramaItems = await base44.asServiceRole.entities.CronogramaImplementacao.filter({
      workshop_id: effectiveWorkshopId,
      status: { '$ne': 'concluido' }
    }, '-created_date', 50);

    // Helper para calcular dias até/desde data
    const calculateDaysDiff = (dateStr) => {
      if (!dateStr) return null;
      const targetDate = new Date(dateStr);
      targetDate.setHours(0, 0, 0, 0);
      const diffTime = targetDate - today;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // [5] Enriquecer dados com severity
    const enrichedSprints = sprints.map(s => {
      const daysDiff = s.end_date ? calculateDaysDiff(s.end_date) : null;
      return {
        id: s.id,
        title: s.title,
        status: s.status,
        due_date: s.end_date,
        phase_completion: s.progress_percentage || 0,
        dias_para_vencer: daysDiff,
        severity: calculateSprintSeverity(s.end_date, s.progress_percentage)
      };
    });

    const enrichedPedidos = pedidosInternos.map(p => ({
      id: p.id,
      titulo: p.titulo,
      status: p.status,
      prazo: p.prazo,
      vencido: calculateDaysDiff(p.prazo) < 0,
      dias_para_vencer: calculateDaysDiff(p.prazo),
      severity: calculatePedidoSeverity(p.prazo)
    }));

    const enrichedBacklog = backlogTarefas.map(t => ({
      id: t.id,
      titulo: t.titulo,
      status: t.status,
      prazo_final: t.prazo,
      dias_vencido: Math.max(0, calculateDaysDiff(t.prazo) * -1),
      severity: calculateTarefaSeverity(t.prazo)
    }));

    const enrichedCronograma = cronogramaItems.map(c => {
      const daysDiff = calculateDaysDiff(c.data_termino_previsto) || 0;
      return {
        id: c.id,
        item_nome: c.item_nome,
        status: c.status,
        prazo_previsto: c.data_termino_previsto,
        dias_atraso: daysDiff < 0 ? Math.abs(daysDiff) : 0,
        severity: calculateCronogramaSeverity(c.data_termino_previsto)
      };
    });

    // Validar dados antes de retornar
    const allCritical = [
      ...enrichedSprints.filter(s => s.severity === 'RED'),
      ...enrichedPedidos.filter(p => p.severity === 'RED'),
      ...enrichedBacklog.filter(t => t.severity === 'RED'),
      ...enrichedCronograma.filter(c => c.severity === 'RED')
    ];

    return Response.json({
      sprints: enrichedSprints || [],
      pedidosInternos: enrichedPedidos || [],
      backlogTarefas: enrichedBacklog || [],
      cronogramaItems: enrichedCronograma || [],
      summary: {
        totalDemands: enrichedSprints.length + enrichedPedidos.length + enrichedBacklog.length + enrichedCronograma.length,
        criticalCount: allCritical.length
      }
    });
  } catch (error) {
    console.error('Error in getClientParallelDemands:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Helpers para calcular severity
function calculateSprintSeverity(endDate, progressPercentage) {
  if (!endDate) return 'GRAY';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(endDate);
  targetDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) return 'RED'; // Vencida
  if (daysDiff === 0) return 'RED'; // Vence hoje
  if (daysDiff <= 2) return 'YELLOW';
  return 'GRAY';
}

function calculatePedidoSeverity(prazo) {
  if (!prazo) return 'GRAY';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const prazoDt = new Date(prazo);
  prazoDt.setHours(0, 0, 0, 0);
  const daysDiff = Math.ceil((prazoDt - today) / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) return 'RED'; // Vencido
  if (daysDiff === 0) return 'RED'; // Vence hoje
  if (daysDiff <= 2) return 'YELLOW';
  return 'GRAY';
}

function calculateTarefaSeverity(prazo) {
  if (!prazo) return 'GRAY';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const prazoDt = new Date(prazo);
  prazoDt.setHours(0, 0, 0, 0);
  const daysDiff = Math.ceil((prazoDt - today) / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) return 'RED'; // Vencido
  if (daysDiff === 0) return 'RED';
  if (daysDiff <= 2) return 'YELLOW';
  return 'GRAY';
}

function calculateCronogramaSeverity(prazo) {
  if (!prazo) return 'GRAY';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const prazoDt = new Date(prazo);
  prazoDt.setHours(0, 0, 0, 0);
  const daysDiff = Math.ceil((prazoDt - today) / (1000 * 60 * 60 * 24));

  if (daysDiff < 0 && Math.abs(daysDiff) > 3) return 'RED'; // Mais de 3 dias atrasado
  if (daysDiff < 0) return 'RED';
  if (daysDiff === 0) return 'RED';
  if (daysDiff <= 2) return 'YELLOW';
  return 'GRAY';
}
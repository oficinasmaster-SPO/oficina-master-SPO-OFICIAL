import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const TENANT_FALLBACK_EVENT = 'TENANT_RESOLVE_FALLBACK';

async function resolveTenantCore(sr, authUser, params = {}) {
  const { workshop_id, admin_workshop_id } = params;
  const isAdmin = authUser.role === 'admin';
  let memberships = await sr.entities.TenantMembership.filter({ user_id: authUser.id, status: 'active' }, 'created_date', 500);
  let fallbackUsed = false;
  if (memberships.length === 0) {
    const legacyWid = authUser.workshop_id || authUser.data?.workshop_id || null;
    console.warn(`[resolveTenant] BACKFILL PENDENTE: user ${authUser.id} (${authUser.email}) sem TenantMembership — fallback user.workshop_id=${legacyWid}`);
    try { await sr.entities.SystemEventLog.create({ event_type: TENANT_FALLBACK_EVENT, entity_type: 'TenantMembership', entity_id: authUser.id, workshop_id: legacyWid, triggered_by: 'system', status: 'warning', timestamp: new Date().toISOString(), details: { user_id: authUser.id, email: authUser.email, legacy_workshop_id: legacyWid } }); } catch (_) {}
    if (legacyWid) {
      fallbackUsed = true;
      memberships = [{ id: null, user_id: authUser.id, workshop_id: legacyWid, membership_type: 'employee', status: 'active', is_default: true, notes: 'fallback-user-field' }];
    }
  }
  let membership;
  if (admin_workshop_id) {
    if (!isAdmin) return { status: 403, error: 'admin_workshop_id é restrito a administradores' };
    membership = memberships.find((m) => m.workshop_id === admin_workshop_id) || { workshop_id: admin_workshop_id, membership_type: 'admin_support', notes: 'admin-override' };
  } else if (workshop_id) {
    membership = memberships.find((m) => m.workshop_id === workshop_id);
    if (!membership) return { status: 403, error: 'Sem membership ativa para o workshop solicitado' };
  } else {
    membership = memberships.find((m) => m.is_default) || memberships[0];
  }
  if (!membership) return { status: 404, error: 'Nenhum tenant disponível para o usuário' };
  const workshop = await sr.entities.Workshop.get(membership.workshop_id).catch(() => null);
  if (!workshop) return { status: 404, error: 'Workshop do tenant não encontrado' };
  return { status: 200, data: { workshop, membership, memberships, fallback_used: fallbackUsed } };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { workshop_id } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    const tenant = await resolveTenantCore(
      base44.asServiceRole,
      user,
      user.role === 'admin' ? { admin_workshop_id: workshop_id } : { workshop_id }
    );
    if (tenant.status !== 200) return Response.json({ error: tenant.error }, { status: tenant.status });
    const effectiveWorkshopId = tenant.data.workshop.id;
    const workshop = tenant.data.workshop;

    // Buscar sprints do cliente
    const sprints = await base44.entities.ConsultoriaSprint.filter({
      workshop_id: effectiveWorkshopId
    });

    // Buscar trilhas selecionadas
    const cronogramas = await base44.entities.CronogramaTemplate.filter({
      workshop_id: effectiveWorkshopId
    });

    const trilhasSelecionadas = cronogramas?.length > 0 ? (cronogramas[0].missoes_selecionadas || []) : [];

    // Agrupar sprints por missão
    const sprintsPorMissao = {};
    sprints.forEach(sprint => {
      if (!sprintsPorMissao[sprint.mission_id]) {
        sprintsPorMissao[sprint.mission_id] = [];
      }
      sprintsPorMissao[sprint.mission_id].push({
        numero: sprint.sprint_number,
        titulo: sprint.title,
        status: sprint.status,
        data_inicio: sprint.start_date,
        data_fim: sprint.end_date
      });
    });

    return Response.json({
      workshop: {
        id: workshop.id,
        nome: workshop.name
      },
      trilhas_selecionadas: trilhasSelecionadas,
      sprints_criados: Object.keys(sprintsPorMissao),
      detalhes_sprints: sprintsPorMissao,
      total_sprints: sprints.length,
      mensagem: `${sprints.length} sprints criados, ${trilhasSelecionadas.length} trilhas selecionadas`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
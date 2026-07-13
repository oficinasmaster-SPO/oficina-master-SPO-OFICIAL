import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const TENANT_FALLBACK_EVENT = 'TENANT_RESOLVE_FALLBACK';
const cache = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000;

// CÓPIA FIEL do fluxo membership-first de shared/tenantResolver.
async function resolveTenantCore(sr, authUser, params = {}) {
  const isAdmin = authUser.role === 'admin';
  let effectiveUser = authUser;
  if (params.impersonated_user_id && params.impersonated_user_id !== authUser.id) {
    if (!isAdmin) return { status: 403, error: 'Apenas administradores podem impersonar usuários' };
    const target = await sr.entities.User.get(params.impersonated_user_id).catch(() => null);
    if (!target) return { status: 404, error: 'Usuário impersonado não encontrado' };
    effectiveUser = target;
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
        details: { user_id: effectiveUser.id, email: effectiveUser.email, legacy_workshop_id: legacyWid }
      });
    } catch (_) {}
    if (legacyWid) {
      fallbackUsed = true;
      memberships = [{
        id: null,
        user_id: effectiveUser.id,
        workshop_id: legacyWid,
        membership_type: 'employee',
        status: 'active',
        is_default: true,
        notes: 'fallback-user-field'
      }];
    }
  }

  let membership = null;
  if (params.admin_workshop_id) {
    if (!isAdmin) return { status: 403, error: 'admin_workshop_id é restrito a administradores' };
    membership = memberships.find((item) => item.workshop_id === params.admin_workshop_id) || {
      workshop_id: params.admin_workshop_id,
      membership_type: 'admin_support',
      notes: 'admin-override'
    };
  } else if (params.workshop_id) {
    membership = memberships.find((item) => item.workshop_id === params.workshop_id);
    if (!membership) return { status: 403, error: 'Sem membership ativa para o workshop solicitado' };
  } else {
    membership = memberships.find((item) => item.is_default) ||
      (memberships.length === 1 ? memberships[0] : null);
    if (!membership && memberships.length > 1) {
      const preferred = effectiveUser.workshop_id || effectiveUser.data?.workshop_id;
      membership = memberships.find((item) => item.workshop_id === preferred) || memberships[0];
    }
  }

  if (!membership) return { status: 404, error: 'Nenhum tenant disponível para o usuário' };
  const workshop = await sr.entities.Workshop.get(membership.workshop_id).catch(() => null);
  if (!workshop) return { status: 404, error: 'Workshop do tenant não encontrado' };
  return { status: 200, data: { effectiveUser, workshop, membership, memberships, fallback_used: fallbackUsed } };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authenticatedUser = await base44.auth.me();
    if (!authenticatedUser) {
      return Response.json({ error: 'Unauthorized: Autenticação obrigatória.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedIds = Array.isArray(body.workshopIds)
      ? [...new Set(body.workshopIds.filter(Boolean))]
      : body.workshopId ? [body.workshopId] : [];
    const impersonatedUserId = body.impersonated_user_id || null;

    if (authenticatedUser.role === 'admin' && requestedIds.length === 0 && !impersonatedUserId) {
      const workshops = await base44.asServiceRole.entities.Workshop.list('name', 500);
      return Response.json({ workshops: workshops || [], user: authenticatedUser });
    }

    const cacheKey = `${authenticatedUser.id}:${impersonatedUserId || 'self'}`;
    const cached = requestedIds.length === 0 ? cache.get(cacheKey) : null;
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return Response.json(
        { workshops: cached.workshops, user: cached.user },
        { headers: { 'X-Cache': 'HIT' } }
      );
    }

    const firstRequested = requestedIds[0] || null;
    let params = {};
    if (impersonatedUserId) params.impersonated_user_id = impersonatedUserId;
    if (firstRequested) {
      if (authenticatedUser.role === 'admin' && !impersonatedUserId) {
        params.admin_workshop_id = firstRequested;
      } else {
        params.workshop_id = firstRequested;
      }
    }

    const tenant = await resolveTenantCore(base44.asServiceRole, authenticatedUser, params);
    if (tenant.status !== 200) {
      return Response.json({ error: tenant.error }, { status: tenant.status });
    }

    const allowedIds = tenant.data.memberships.map((item) => item.workshop_id).filter(Boolean);
    if (requestedIds.length > 0 && authenticatedUser.role !== 'admin') {
      const unauthorized = requestedIds.filter((id) => !allowedIds.includes(id));
      if (unauthorized.length > 0) {
        return Response.json({
          error: 'Acesso negado: uma ou mais oficinas solicitadas não pertencem ao usuário autenticado.'
        }, { status: 403 });
      }
    }

    const idsToLoad = requestedIds.length > 0 ? requestedIds : allowedIds;
    const workshops = (await Promise.all(
      idsToLoad.map((id) => base44.asServiceRole.entities.Workshop.get(id).catch(() => null))
    )).filter(Boolean);
    const preferredId = tenant.data.membership.workshop_id;
    workshops.sort((a, b) => {
      if (a.id === preferredId && b.id !== preferredId) return -1;
      if (b.id === preferredId && a.id !== preferredId) return 1;
      const aInactive = a.status === 'inativo';
      const bInactive = b.status === 'inativo';
      if (aInactive !== bInactive) return aInactive ? 1 : -1;
      return (a.name || '').localeCompare(b.name || '');
    });

    const responseUser = tenant.data.effectiveUser;
    if (requestedIds.length === 0) {
      if (cache.size > 200) cache.delete(cache.keys().next().value);
      cache.set(cacheKey, { workshops, user: responseUser, timestamp: Date.now() });
    }
    return Response.json(
      { workshops, user: responseUser },
      { headers: { 'X-Cache': 'MISS' } }
    );
  } catch (error) {
    console.error('[getUserWorkshops] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
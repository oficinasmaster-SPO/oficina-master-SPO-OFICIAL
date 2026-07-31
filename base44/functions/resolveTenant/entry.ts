/**
 * resolveTenant — ÚNICA autoridade de resolução de tenant (endpoint HTTP).
 *
 * FONTE CANÔNICA: functions/shared/tenantResolver/entry.ts
 * CONTRATO DE SINCRONIZAÇÃO: resolveTenantCore abaixo é CÓPIA FIEL do módulo
 * compartilhado (a plataforma não permite import local entre functions e
 * chamadas HTTP entre functions retornam 508). Alterações devem ser feitas
 * primeiro no módulo compartilhado e espelhadas aqui.
 *
 * Input: { workshop_id?, admin_workshop_id? (só admin), impersonated_user_id? (só admin) }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const TENANT_FALLBACK_EVENT = 'TENANT_RESOLVE_FALLBACK';

// ── CÓPIA FIEL de shared/tenantResolver.resolveTenantCore ────────────────────
const TENANT_RESOLVER_COPY_VERSION = '1.2.0';
async function resolveTenantCore(sr, authUser, params = {}) {
  const { workshop_id, admin_workshop_id, impersonated_user_id, sync_user_field } = params;
  const isAdmin = authUser.role === 'admin';

  // 1. Usuário efetivo (impersonação — só admin)
  let effectiveUser = authUser;
  let isImpersonating = false;
  if (impersonated_user_id && impersonated_user_id !== authUser.id) {
    if (!isAdmin) return { status: 403, error: 'Apenas administradores podem impersonar usuários' };
    const target = await sr.entities.User.get(impersonated_user_id).catch(() => null);
    if (!target) return { status: 404, error: 'Usuário impersonado não encontrado' };
    effectiveUser = target;
    isImpersonating = true;
  }

  // 2. Todas as memberships ativas do usuário efetivo
  let memberships = await sr.entities.TenantMembership.filter(
    { user_id: effectiveUser.id, status: 'active' }, 'created_date', 500
  );

  // 5. Fallback temporário — sem membership → user.workshop_id (monitorar backfill)
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

  // 3/4. Seleção da membership efetiva
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

  // Dados básicos do workshop
  const workshop = await sr.entities.Workshop.get(effectiveMembership.workshop_id).catch(() => null);
  if (!workshop) return { status: 404, error: 'Workshop do tenant não encontrado' };

  // Denormalização p/ RLS: user.tenant_workshop_id espelha a membership ativa.
  // IMPORTANTE: templates RLS só resolvem {{user.id}}, {{user.email}}, {{user.role}}
  // e {{user.data.<field>}}. Campos custom top-level (tenant_workshop_id, workshop_id)
  // NÃO resolvem em RLS — por isso espelhamos também em data.workshop_id, que as regras
  // RLS existentes já leem. Assim clientes externos (role=user, user_type=external)
  // conseguem ler os dados da própria oficina.
  // Só quando sync_user_field=true (endpoint resolveTenant); nunca em impersonação
  // nem em override sintético de admin.
  if (sync_user_field && !isImpersonating && effectiveMembership.notes !== 'admin-override') {
    const updates = {};
    if ((effectiveUser.tenant_workshop_id || null) !== effectiveMembership.workshop_id) {
      updates.tenant_workshop_id = effectiveMembership.workshop_id;
    }
    if ((effectiveUser.data?.workshop_id || null) !== effectiveMembership.workshop_id) {
      updates.data = { ...(effectiveUser.data || {}), workshop_id: effectiveMembership.workshop_id };
    }
    if (Object.keys(updates).length) {
      try { await sr.entities.User.update(effectiveUser.id, updates); } catch (_) {}
    }
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
// ── Fim da cópia fiel ─────────────────────────────────────────────────────────

// ── INSTRUMENTAÇÃO TEMPORÁRIA (diagnóstico F5 × Ctrl+Shift+R) ──────────────────
// Registra user_id, e-mail, timestamp, origem da chamada (quando enviada pelo
// front) e o motivo exato de qualquer 500. Remover após confirmação da causa.
Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  let authUser = null;
  let origin = null;
  try {
    const base44 = createClientFromRequest(req);
    authUser = await base44.auth.me();
    if (!authUser) {
      console.warn('[resolveTenant] NO_AUTH', { ts: startedAt, origin: null });
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    origin = body?.origin || null;
    const params = {
      workshop_id: body?.workshop_id || null,
      admin_workshop_id: body?.admin_workshop_id || null,
      impersonated_user_id: body?.impersonated_user_id || null,
      sync_user_field: true,
    };

    console.log('[resolveTenant] INVOKE', {
      ts: startedAt,
      user_id: authUser.id,
      email: authUser.email,
      role: authUser.role,
      origin,
      params,
    });

    const result = await resolveTenantCore(base44.asServiceRole, authUser, params);

    if (result.status !== 200) {
      console.warn('[resolveTenant] NON_200', {
        ts: startedAt,
        user_id: authUser.id,
        email: authUser.email,
        role: authUser.role,
        origin,
        status: result.status,
        error: result.error,
      });
      return Response.json({ error: result.error }, { status: result.status });
    }

    console.log('[resolveTenant] OK', {
      ts: startedAt,
      user_id: authUser.id,
      email: authUser.email,
      origin,
      workshop_id: result.data?.workshop?.id || null,
      fallback_used: result.data?.fallback_used || false,
      memberships_count: (result.data?.memberships || []).length,
    });
    return Response.json(result.data);
  } catch (error) {
    console.error('[resolveTenant] 500', {
      ts: startedAt,
      user_id: authUser?.id || null,
      email: authUser?.email || null,
      role: authUser?.role || null,
      origin,
      error_message: error?.message || String(error),
      error_stack: error?.stack || null,
      error_name: error?.name || null,
    });
    return Response.json({ error: error.message }, { status: 500 });
  }
});
/**
 * Shared Tenant Resolver — FONTE ÚNICA DE VERDADE para resolução de tenant.
 *
 * CONTRATO DE SINCRONIZAÇÃO (limitação da plataforma: functions não importam
 * arquivos locais — cada function é deployada isoladamente e chamadas HTTP
 * entre functions retornam 508):
 *   - functions/resolveTenant/entry.ts mantém uma CÓPIA FIEL de resolveTenantCore.
 *   - Qualquer alteração AQUI deve ser espelhada lá (e em futuros consumidores).
 *
 * Uso por outras functions: copiar resolveTenantCore inline e chamar:
 *   const result = await resolveTenantCore(base44.asServiceRole, authUser, params);
 *   if (result.status !== 200) return Response.json({ error: result.error }, { status: result.status });
 *   const tenant = result.data; // tenant.workshop.id é o workshop_id efetivo
 */

// Versão do resolver. REGRA: toda cópia deve declarar TENANT_RESOLVER_COPY_VERSION
// com o MESMO valor. Ao alterar a lógica aqui, incremente e atualize todas as cópias.
// Auditoria de drift: grep por TENANT_RESOLVER_COPY_VERSION e comparar valores.
// Cópias ADAPTADAS (subconjunto intencional do contrato) devem usar o sufixo '-adapted'.
export const TENANT_RESOLVER_VERSION = '1.1.0';

export const TENANT_FALLBACK_EVENT = 'TENANT_RESOLVE_FALLBACK';

/**
 * Resolve o tenant efetivo do usuário autenticado.
 *
 * @param sr        base44.asServiceRole
 * @param authUser  usuário autenticado (base44.auth.me())
 * @param params    { workshop_id?, admin_workshop_id?, impersonated_user_id? }
 * @returns { status, error? , data? }
 *
 * Regras:
 * 1. impersonated_user_id: só admin — resolve como o usuário alvo (isImpersonating=true).
 * 2. Carrega TODAS as TenantMemberships ativas do usuário efetivo.
 * 3. workshop_id solicitado sem membership ativa → 403.
 *    admin_workshop_id (só admin) → permite acesso mesmo sem membership (admin_support sintética).
 * 4. Sem solicitação → membership is_default, ou a única existente, ou a que
 *    casa com user.workshop_id, ou a primeira.
 * 5. FALLBACK TEMPORÁRIO: usuário sem nenhuma membership → cai para
 *    user.workshop_id/user.data.workshop_id com membership sintética e registra
 *    warning (console + SystemEventLog TENANT_RESOLVE_FALLBACK) para monitorar
 *    pendências de backfill.
 */
export async function resolveTenantCore(sr, authUser, params = {}) {
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
  // Só quando sync_user_field=true (endpoint resolveTenant); nunca em impersonação
  // nem em override sintético de admin.
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

// Stub HTTP — este arquivo é um módulo compartilhado (fonte canônica), não um endpoint.
Deno.serve(() => Response.json({ error: 'Módulo compartilhado — use a function resolveTenant' }, { status: 405 }));
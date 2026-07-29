import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * relatorioDiarioIntegridade — Relatório diário consolidado de integridade (03h BRT)
 *
 * Consolida 4 auditorias READ-ONLY num ÚNICO e-mail digest enviado aos admins:
 *   1. Integridade referencial (domínio follow-up) — invoca auditarIntegridadeReferencial
 *   2. Saúde RBAC (versão leve: contagens amostrais)
 *   3. Migração workshop_id raiz vs legado (distribuição de usuários)
 *   4. Guarda RLS (sentinel check em entidades críticas)
 *
 * Tudo read-only: nenhum registro é alterado/deletado. Apenas SystemEventLog + e-mail.
 * Versões leves (capped) para não estourar o teto de tráfego de leitura da plataforma.
 */

const CAP = 150;
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;
const REFERENCE_EMAIL = 'administrativo@molashoracerta.com.br';
// Canário de 2 entidades (2 reads × 2 = 4 reads) — versão leve do guard
// semanal. O guard completo (16 entidades) segue disponível para acionamento manual.
const CRITICAL_ENTITIES_SAMPLE = ['Employee', 'Goal'];

const SYSTEM_ROLES_HINT = ['dashboard.view', 'workshop.view', 'employees.view', 'financeiro.view', 'admin.users'];

async function safeFilter(sr, entity, query, sort, limit) {
  try {
    const r = await sr.entities[entity].filter(query, sort, limit);
    return Array.isArray(r) ? r : [];
  } catch { return []; }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    // ── 1. Integridade referencial (invoca função dedicada) ──
    let integridade = null;
    try {
      const inv = await sr.functions.invoke('auditarIntegridadeReferencial', {});
      integridade = inv?.data ?? inv;
    } catch (e) {
      integridade = { erro: e.message };
    }

    // ── 2. Saúde RBAC (versão leve) ──
    const [profiles, users, employees] = await Promise.all([
      safeFilter(sr, 'UserProfile', {}, null, CAP),
      safeFilter(sr, 'User', {}, null, CAP),
      safeFilter(sr, 'Employee', {}, null, CAP),
    ]);
    let invalid_roles = 0, missing_profiles = 0;
    const profileMap = new Map(profiles.map(p => [p.id, p]));
    for (const p of profiles) {
      const roles = p.roles || [];
      if (roles.length === 0) invalid_roles++;
    }
    for (const emp of employees) {
      if (emp.profile_id && !profileMap.has(emp.profile_id)) missing_profiles++;
    }
    const employeeUserIds = new Set(employees.map(e => e.user_id).filter(Boolean));
    // Apenas usuários de tenant (com workshop_id) devem ter Employee — externos
    // sem workshop_id legitimamente não têm Employee (evita falso-positivo).
    let users_without_employee = 0;
    for (const u of users) {
      if (u.role !== 'admin' && u.workshop_id && !employeeUserIds.has(u.id)) users_without_employee++;
    }
    const rbac_issues = invalid_roles + missing_profiles + users_without_employee;

    // ── 3. Migração workshop_id (distribuição raiz vs legado) ──
    const refUsers = await safeFilter(sr, 'User', { email: REFERENCE_EMAIL }, null, 5);
    const refUser = refUsers[0] ?? null;
    const workshopIdRoot = refUser?.workshop_id ?? null;
    const workshopIdLegacy = refUser?.data?.workshop_id ?? null;
    const dist = { root_only: 0, legacy_only: 0, both: 0, neither: 0 };
    for (const u of users) {
      const hasRoot = !!u.workshop_id;
      const hasLegacy = !!(u.data?.workshop_id);
      if (hasRoot && !hasLegacy) dist.root_only++;
      else if (!hasRoot && hasLegacy) dist.legacy_only++;
      else if (hasRoot && hasLegacy) dist.both++;
      else dist.neither++;
    }
    const legacyOnlyUsers = users.filter(u => !u.workshop_id && u.data?.workshop_id).map(u => u.email);

    // ── 4. Guarda RLS (sentinel check em amostra de entidades críticas) ──
    const rlsResults = [];
    let rlsLeaks = 0;
    if (workshopIdRoot) {
      for (const ent of CRITICAL_ENTITIES_SAMPLE) {
        let countReal = -1, countSentinel = -1, error = null;
        try {
          const real = await sr.entities[ent].filter({ workshop_id: workshopIdRoot }, '-created_date', 1);
          countReal = Array.isArray(real) ? real.length : 0;
          const sentinel = await sr.entities[ent].filter({ workshop_id: '__SENTINEL_INVALID_XYZ__' }, '-created_date', 1);
          countSentinel = Array.isArray(sentinel) ? sentinel.length : 0;
        } catch (e) { error = e.message; }
        const status = error ? 'ERROR' : countSentinel > 0 ? 'FAIL' : 'PASS';
        if (countSentinel > 0) rlsLeaks++;
        rlsResults.push({ entity: ent, count_real: countReal, count_sentinel: countSentinel, status, error });
      }
    }

    // ── Totais ──
    const totalIntegridade = integridade?.total_orfaos ?? 0;
    const totalRls = rlsLeaks;
    const totalLegacy = dist.legacy_only;
    const totalGeral = totalIntegridade + rbac_issues + totalLegacy + totalRls;

    const executado_em = new Date().toISOString();

    // ── SystemEventLog ──
    try {
      await sr.entities.SystemEventLog.create({
        event_type: 'DAILY_INTEGRITY_REPORT',
        entity_type: 'IntegrityReport',
        triggered_by: 'scheduled',
        status: totalGeral === 0 ? 'success' : 'warning',
        timestamp: executado_em,
        details: {
          integridade_orfaos: totalIntegridade,
          rbac_issues,
          legacy_only_users: totalLegacy,
          rls_leaks: totalRls,
          total_geral: totalGeral,
        },
      });
    } catch (_) {}

    // ── E-mail único consolidado ──
    let emails_enviados = 0;
    try {
      const admins = await safeFilter(sr, 'User', { role: 'admin' }, null, 100);

      // Seção 1 — Integridade Referencial
      const integLinhas = integridade?.resumo
        ? Object.entries(integridade.resumo).map(([ent, r]) => {
            let l = `  • ${ent}: ${r.total} registros | ${r.orfaos_workshop || 0} órfão(s) workshop`;
            if (r.ref_pedido_pendente) l += ` | ${r.ref_pedido_pendente} ref. pedido pend.`;
            if (r.ref_tarefa_pendente) l += ` | ${r.ref_tarefa_pendente} ref. tarefa pend.`;
            return l;
          }).join('\n')
        : '  (auditoria indisponível)';

      // Seção 2 — RBAC
      const rbacTxt =
        `  • Perfis com roles inválidas/vazias: ${invalid_roles}\n` +
        `  • Employees sem perfil (profile_id órfão): ${missing_profiles}\n` +
        `  • Usuários sem employee: ${users_without_employee}\n` +
        `  • Total de issues RBAC: ${rbac_issues}`;

      // Seção 3 — Migração workshop_id
      const migTxt =
        `  • Usuário de referência: ${REFERENCE_EMAIL}\n` +
        `  • workshop_id raiz: ${workshopIdRoot || 'N/A'}\n` +
        `  • workshop_id legado: ${workshopIdLegacy || 'N/A'}\n` +
        `  • Distribuição (amostra ${users.length} users):\n` +
        `      root_only: ${dist.root_only} | legacy_only: ${dist.legacy_only} | both: ${dist.both} | neither: ${dist.neither}\n` +
        `  • Usuários apenas em campo legado (risco): ${totalLegacy}` +
        (legacyOnlyUsers.length ? `\n      ${legacyOnlyUsers.slice(0, 10).join(', ')}` : '');

      // Seção 4 — Guarda RLS
      const rlsTxt = rlsResults.length
        ? rlsResults.map(r =>
            `  • ${r.entity}: ${r.status}${r.count_sentinel > 0 ? ` (LEAK ${r.count_sentinel})` : ''}${r.error ? ` ERROR: ${r.error}` : ''}`
          ).join('\n')
        : '  (workshop_id de referência indisponível)';

      const body =
        `RELATÓRIO DIÁRIO DE INTEGRIDADE — ${executado_em}\n` +
        `Total de inconsistências: ${totalGeral}\n` +
        `Política: READ-ONLY (nenhum registro foi alterado ou deletado).\n` +
        `================================================================\n\n` +
        `1) INTEGRIDADE REFERENCIAL (domínio follow-up) — ${totalIntegridade} órfão(s)\n` +
        `${integLinhas}\n\n` +
        `2) SAÚDE RBAC — ${rbac_issues} issue(s)\n` +
        `${rbacTxt}\n\n` +
        `3) MIGRAÇÃO workshop_id (raiz vs legado) — ${totalLegacy} usuário(s) em risco\n` +
        `${migTxt}\n\n` +
        `4) GUARDA RLS (sentinel em ${CRITICAL_ENTITIES_SAMPLE.length} entidades críticas) — ${totalRls} leak(s)\n` +
        `${rlsTxt}\n\n` +
        `================================================================\n` +
        `Detalhes completos registrados no SystemEventLog (event_type=DAILY_INTEGRITY_REPORT).\n` +
        `— Relatório automático diário 03h BRT`;

      const subject = `[Oficinas Master] Relatório Diário de Integridade — ${totalGeral} inconsistência(s)`;

      for (const a of admins) {
        if (!a.email) continue;
        try {
          await sr.integrations.Core.SendEmail({ to: a.email, subject, body });
          emails_enviados++;
        } catch (_) {}
      }
    } catch (_) {}

    return Response.json({
      executado_em,
      total_geral: totalGeral,
      secoes: {
        integridade_referencial: { orfaos: totalIntegridade, resumo: integridade?.resumo ?? null },
        rbac: { issues: rbac_issues, invalid_roles, missing_profiles, users_without_employee },
        migracao_workshop_id: { dist, legacy_only: totalLegacy, workshop_id_root: workshopIdRoot },
        guarda_rls: { leaks: totalRls, entidades: rlsResults },
      },
      emails_enviados,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
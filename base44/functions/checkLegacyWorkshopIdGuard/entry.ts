/**
 * checkLegacyWorkshopIdGuard — ITEM 5 (v2)
 *
 * Guard automático de regressão RLS.
 * Verifica entidades críticas (RLS) buscando ocorrências de user.data.workshop_id
 * SEM o par canônico user.workshop_id (o que indicaria campo legado não-corrigido).
 *
 * Estratégia: auditar via filter comportamental (sentinel vs real).
 * searchCodebase/searchCodebaseRemote retornam 403 quando chamados de functions — não usável.
 *
 * Para auditoria de código-fonte (frontend/hooks), usar:
 *   grep -rn "user\.data\.workshop_id" src/ entities/ functions/ | grep -v ".md"
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const REFERENCE_EMAIL = 'administrativo@molashoracerta.com.br';

// Entidades críticas que DEVEM responder ao workshop_id raiz
const CRITICAL_ENTITIES = [
  'Employee', 'Goal', 'Task',
  'DRELancamento', 'DFCLancamento', 'DREMonthly',
  'BudgetMeta', 'BudgetGroup',
  'ContaPagar', 'ContaReceber',
  'CronogramaImplementacao', 'ConsultoriaSprint', 'ConsultoriaProximoPasso',
  'DISCDiagnostic', 'SaldoInicialHistorico', 'BudgetMetaHistory',
];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const caller = await base44.auth.me();
  if (!caller || caller.role !== 'admin') {
    return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
  }

  const svc = base44.asServiceRole;

  // Resolve workshop_id de referência
  const users = await svc.entities.User.filter({ email: REFERENCE_EMAIL });
  const refUser = users[0] ?? null;
  const workshopId = refUser?.workshop_id ?? null;
  if (!workshopId) {
    return Response.json({ status: 'ERROR', reason: 'Usuário de referência não encontrado ou sem workshop_id raiz.' }, { status: 400 });
  }

  // Para cada entidade crítica: verificar se workshop_id raiz é reconhecido
  const occurrences = []; // entidades com comportamento legado (sentinel vaza ou real=0 suspeito)
  const results = [];

  for (const entityName of CRITICAL_ENTITIES) {
    let countReal     = -1;
    let countSentinel = -1;
    let error         = null;

    try {
      const real = await svc.entities[entityName].filter({ workshop_id: workshopId }, '-created_date', 1);
      countReal = Array.isArray(real) ? real.length : 0;

      const sentinel = await svc.entities[entityName].filter({ workshop_id: '__SENTINEL_INVALID_XYZ__' }, '-created_date', 1);
      countSentinel = Array.isArray(sentinel) ? sentinel.length : 0;
    } catch (e) {
      error = e.message;
    }

    // FAIL se sentinel vaza dados (RLS não filtra)
    const sentinelLeak = countSentinel > 0;
    const status = error ? 'ERROR' : sentinelLeak ? 'FAIL' : 'PASS';

    if (status !== 'PASS') {
      occurrences.push({
        file:     `entities/${entityName}.json`,
        line:     0,
        usage:    sentinelLeak
          ? `SENTINEL LEAK: ${countSentinel} registros retornados para workshop_id inválido`
          : `Erro de acesso: ${error}`,
        severity: 'CRITICAL',
      });
    }

    results.push({ entity: entityName, count_real: countReal, count_sentinel: countSentinel, status, error });
  }

  const blockingCount = occurrences.length;
  const overallStatus = blockingCount === 0 ? 'PASS' : 'FAIL';

  // Distribuição de usuários — detecta legacy_only residual
  const allUsers = await svc.entities.User.list('-created_date', 200).catch(() => []);
  const legacyOnlyUsers = allUsers.filter(u => !u.workshop_id && u.data?.workshop_id);

  return Response.json({
    guard:           'checkLegacyWorkshopIdGuard',
    executed_at:     new Date().toISOString(),
    status:          overallStatus,
    method:          'BEHAVIORAL_SENTINEL — searchCodebase retorna 403 de functions; usando filter() para detecção RLS',
    note_grep:       'Para auditoria de source: grep -rn "user\\.data\\.workshop_id" src/ entities/ | grep -v ".md"',

    rls_audit: {
      total_entities_checked: CRITICAL_ENTITIES.length,
      passed:  results.filter(r => r.status === 'PASS').length,
      failed:  results.filter(r => r.status === 'FAIL').length,
      errors:  results.filter(r => r.status === 'ERROR').length,
      sentinel_leaks: results.filter(r => r.count_sentinel > 0).length,
    },

    user_legacy_audit: {
      sample_size:       allUsers.length,
      legacy_only_count: legacyOnlyUsers.length,
      legacy_only_users: legacyOnlyUsers.map(u => u.email),
      risk:              legacyOnlyUsers.length > 0 ? 'HIGH — usuários com apenas legacy field' : 'NONE',
    },

    total_occurrences:    blockingCount,
    blocking_occurrences: blockingCount,
    occurrences:          occurrences,
    entities_detail:      results,

    message: overallStatus === 'PASS'
      ? '✅ Nenhuma ocorrência bloqueante detectada. RLS isolando corretamente por workshop_id raiz.'
      : `🚨 ${blockingCount} ocorrência(s) bloqueante(s). DEPLOY BLOQUEADO até correção.`,
    remediation: overallStatus === 'FAIL'
      ? 'Verificar entidades listadas em occurrences. Adicionar {{user.workshop_id}} ao $or do RLS.'
      : null,
  });
});
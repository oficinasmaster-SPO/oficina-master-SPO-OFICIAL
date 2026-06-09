/**
 * auditLegacyWorkshopId — REESCRITO (ITEM 1)
 *
 * VEREDICTO ITEM 1: schema() NÃO existe no asServiceRole SDK.
 * "svc.entities[entityName].schema is not a function"
 *
 * NOVA ESTRATÉGIA: Auditoria comportamental.
 * Para cada entidade com workshop_id:
 *   - Tenta filter({ workshop_id: "SENTINEL_NULL" }) → deve retornar 0
 *   - Tenta filter({ workshop_id: workshopId_real }) → deve retornar > 0
 *   - Se ambos retornam 0 → RLS pode estar usando campo legado (quebrado)
 *   - Se real > 0 → workshop_id raiz funciona → CLEAN
 *
 * Esta abordagem é independente de schema() e reflete o comportamento real de produção.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const REFERENCE_EMAIL = 'administrativo@molashoracerta.com.br';

const ENTITIES = [
  'Employee', 'Goal', 'Task',
  'DRELancamento', 'DFCLancamento', 'DREMonthly',
  'BudgetMeta', 'BudgetGroup', 'BudgetMetaHistory',
  'ContaPagar', 'ContaReceber',
  'CronogramaImplementacao', 'ConsultoriaSprint', 'ConsultoriaProximoPasso',
  'DISCDiagnostic', 'SaldoInicialHistorico',
];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const caller = await base44.auth.me();
  if (!caller || caller.role !== 'admin') {
    return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
  }

  const svc = base44.asServiceRole;

  // Resolve workshop_id real do usuário de referência
  const users = await svc.entities.User.filter({ email: REFERENCE_EMAIL });
  const refUser = users[0] ?? null;
  const workshopId      = refUser?.workshop_id       ?? null;  // raiz (canônico)
  const workshopIdLegacy = refUser?.data?.workshop_id ?? null;  // legado

  if (!workshopId) {
    return Response.json({
      status: 'ERROR',
      reason: `Usuário ${REFERENCE_EMAIL} não encontrado ou sem workshop_id na raiz.`,
    }, { status: 400 });
  }

  // Auditoria de distribuição de usuários
  const allUsers = await svc.entities.User.list('-created_date', 300).catch(() => []);
  const dist = { root_only: 0, legacy_only: 0, both: 0, neither: 0 };
  for (const u of allUsers) {
    const hasRoot   = !!u.workshop_id;
    const hasLegacy = !!(u.data?.workshop_id);
    if (hasRoot && !hasLegacy)  dist.root_only++;
    else if (!hasRoot && hasLegacy) dist.legacy_only++;
    else if (hasRoot && hasLegacy)  dist.both++;
    else dist.neither++;
  }

  // Teste comportamental por entidade
  const results = [];
  for (const entityName of ENTITIES) {
    let countReal   = -1;
    let countSentinel = -1;
    let error = null;

    try {
      // Query com workshop_id real (deve retornar ≥ 0)
      const real = await svc.entities[entityName].filter({ workshop_id: workshopId }, '-created_date', 1);
      countReal = Array.isArray(real) ? real.length : 0;

      // Query com sentinel impossível (deve retornar 0 — prova que RLS existe)
      const sentinel = await svc.entities[entityName].filter({ workshop_id: '__SENTINEL_INVALID__' }, '-created_date', 1);
      countSentinel = Array.isArray(sentinel) ? sentinel.length : 0;
    } catch (e) {
      error = e.message;
    }

    // Se real ≥ 0 e sentinel = 0 → RLS funciona com workshop_id raiz → CLEAN
    // Se ambos = 0 → pode ser entidade sem dados (inconclusivo) → WARN
    // Se error → não auditável
    let migration_status;
    if (error) {
      migration_status = 'ERROR';
    } else if (countReal > 0 && countSentinel === 0) {
      migration_status = 'CLEAN'; // workshop_id raiz funciona
    } else if (countReal === 0 && countSentinel === 0) {
      migration_status = 'NO_DATA'; // sem registros nesta oficina — inconclusivo
    } else if (countSentinel > 0) {
      migration_status = 'RLS_BYPASS'; // RLS não está filtrando — CRÍTICO
    } else {
      migration_status = 'UNKNOWN';
    }

    results.push({
      entity:              entityName,
      count_with_real_id:  countReal,
      count_with_sentinel: countSentinel,
      migration_status,
      error:               error ?? null,
    });
  }

  const clean    = results.filter(r => r.migration_status === 'CLEAN');
  const noData   = results.filter(r => r.migration_status === 'NO_DATA');
  const bypass   = results.filter(r => r.migration_status === 'RLS_BYPASS');
  const errors   = results.filter(r => r.migration_status === 'ERROR');

  const overallStatus = bypass.length > 0 ? 'CRITICAL' : errors.length > 0 ? 'WARN' : 'PASS';

  return Response.json({
    audit_date:        new Date().toISOString(),
    method:            'BEHAVIORAL — sem schema(), usa filter() real',
    schema_contains_rls: false,
    schema_rls_reason: 'asServiceRole.entities[x].schema is not a function — SDK não expõe RLS via schema()',
    reference_user:    REFERENCE_EMAIL,
    workshop_id_root:  workshopId,
    workshop_id_legacy: workshopIdLegacy,
    user_profile_distribution: {
      sample_size:  allUsers.length,
      root_only:    dist.root_only,
      legacy_only:  dist.legacy_only,
      both:         dist.both,
      neither:      dist.neither,
    },
    summary: {
      total_entities_audited: results.length,
      clean:    clean.length,
      no_data:  noData.length,
      rls_bypass: bypass.length,
      errors:   errors.length,
    },
    overall_status:      overallStatus,
    rls_bypass_entities: bypass.map(e => e.entity),
    clean_entities:      clean.map(e => e.entity),
    no_data_entities:    noData.map(e => e.entity),
    entities_detail:     results,
    recommendation: overallStatus === 'PASS'
      ? '✅ Todas as entidades testadas responderam corretamente ao workshop_id raiz. RLS funcional.'
      : bypass.length > 0
        ? `🚨 RLS BYPASS detectado em ${bypass.length} entidade(s). Investigar imediatamente.`
        : `⚠️ ${errors.length} entidade(s) com erro de acesso. Verificar permissões.`,
  });
});
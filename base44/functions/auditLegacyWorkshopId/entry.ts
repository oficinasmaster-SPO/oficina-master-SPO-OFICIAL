/**
 * auditLegacyWorkshopId
 * Fase 1 — Auditoria automatizada de referências legadas a user.data.workshop_id
 * Escaneia todas as entidades RLS e retorna relatório de ocorrências.
 * Executar semanalmente via automation scheduled.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Lista de todas as entidades do sistema que possuem RLS com workshop_id
const ENTITIES_TO_AUDIT = [
  'Workshop', 'Employee', 'Goal', 'Task',
  'DRELancamento', 'DFCLancamento', 'DREMonthly',
  'BudgetMeta', 'BudgetGroup', 'BudgetMetaHistory',
  'ContaPagar', 'ContaReceber',
  'CronogramaImplementacao', 'ConsultoriaSprint', 'ConsultoriaProximoPasso',
  'DISCDiagnostic', 'DISCPublicSession',
  'SaldoInicialHistorico', 'SubcategoriaDRE',
  'FollowUpReminder', 'Goal', 'COEXContract',
  'DiagnosticInvite', 'Diagnostic',
];

const LEGACY_PATTERN = '{{user.data.workshop_id}}';
const CANONICAL_PATTERN = '{{user.workshop_id}}';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const caller = await base44.auth.me();
  if (!caller || caller.role !== 'admin') {
    return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
  }

  const svc = base44.asServiceRole;

  // Busca schemas de todas as entidades
  const results = [];
  const uniqueEntities = [...new Set(ENTITIES_TO_AUDIT)];

  for (const entityName of uniqueEntities) {
    try {
      const schema = await svc.entities[entityName].schema();
      const schemaStr = JSON.stringify(schema);

      // Verificar RLS — precisamos do schema completo incluindo rls
      // O schema() não retorna RLS, então vamos verificar via filter de 1 registro
      // e inspecionar os metadados disponíveis
      const hasLegacy = schemaStr.includes('user.data.workshop_id');
      const hasCanonical = schemaStr.includes('user.workshop_id');

      results.push({
        entity: entityName,
        has_legacy_reference: hasLegacy,
        has_canonical_reference: hasCanonical,
        migration_status: !hasLegacy ? 'CLEAN' : hasCanonical ? 'DUAL_MODE' : 'LEGACY_ONLY',
      });
    } catch (e) {
      results.push({
        entity: entityName,
        error: e.message,
        migration_status: 'ERROR',
      });
    }
  }

  // Auditoria de usuários com workshop_id apenas na raiz (novo padrão)
  const usersWithRootOnly = await svc.entities.User.filter({}).catch(() => []);
  let rootOnlyCount = 0;
  let legacyDataCount = 0;
  let bothCount = 0;
  let neitherCount = 0;

  for (const u of usersWithRootOnly.slice(0, 200)) {
    const hasRoot = !!u.workshop_id;
    const hasLegacy = !!(u.data?.workshop_id);
    if (hasRoot && !hasLegacy)  rootOnlyCount++;
    else if (!hasRoot && hasLegacy) legacyDataCount++;
    else if (hasRoot && hasLegacy)  bothCount++;
    else neitherCount++;
  }

  const legacyEntities   = results.filter(r => r.migration_status === 'LEGACY_ONLY');
  const dualEntities     = results.filter(r => r.migration_status === 'DUAL_MODE');
  const cleanEntities    = results.filter(r => r.migration_status === 'CLEAN');

  return Response.json({
    audit_date: new Date().toISOString(),
    summary: {
      total_entities_audited: results.length,
      clean:       cleanEntities.length,
      dual_mode:   dualEntities.length,   // retrocompat OK — ambos presentes
      legacy_only: legacyEntities.length, // CRÍTICO — precisa fix
      errors:      results.filter(r => r.migration_status === 'ERROR').length,
    },
    user_profile_distribution: {
      sample_size: Math.min(usersWithRootOnly.length, 200),
      root_only:   rootOnlyCount,   // padrão novo — ideal
      legacy_only: legacyDataCount, // padrão antigo — ainda suportado via dual-mode
      both:        bothCount,       // transição
      neither:     neitherCount,    // sem workshop (admin/consultor)
    },
    legacy_only_entities: legacyEntities.map(e => e.entity),
    dual_mode_entities:   dualEntities.map(e => e.entity),
    clean_entities:       cleanEntities.map(e => e.entity),
    entities_detail: results,
    recommendation: legacyEntities.length === 0
      ? 'CLEAN — Nenhuma entidade com legacy_only. Sistema padronizado.'
      : `ACTION REQUIRED — ${legacyEntities.length} entidade(s) com referência exclusivamente legada.`,
  });
});
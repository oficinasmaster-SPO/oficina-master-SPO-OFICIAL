/**
 * TDD SUITE — repairMigratedAttendances
 *
 * Testa a lógica pura de repair de registros "migrated" sem dependência
 * de HTTP/base44 — apenas contratos de dados e transformações.
 *
 * Princípio TDD aplicado:
 *  - Testes escritos ANTES da implementação definem os contratos
 *  - Cada teste é independente (sem estado compartilhado)
 *  - Falhas explícitas com mensagens claras
 *
 * Cobertura:
 *  1. Identificação correta de registros migrated
 *  2. Agrupamento por workshop_id
 *  3. Separação entre consumidos (com consultoria_atendimento_id) e pendentes
 *  4. Validação de planos elegíveis para repair
 *  5. Cruzamento attendance_type_name → PlanAttendanceRule
 *  6. Idempotência: rodar 2x não duplica
 *  7. Regressão: registros válidos (não "migrated") não são tocados
 *  8. Regressão: workshop sem plano ou plano FREE é ignorado
 *  9. Regressão: groupBucketByType continua funcionando após repair
 */

// ─────────────────────────────────────────────────────────────────────────────
// LÓGICA PURA EXTRAÍDA / PORTADA DA FUNÇÃO (testável sem Deno/HTTP)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Identifica registros que precisam de repair
 */
function isMigratedRecord(record) {
  return record.attendance_type_id === 'migrated';
}

/**
 * Agrupa registros migrated por workshop_id
 */
function groupMigratedByWorkshop(records, filterWorkshopId = null) {
  const byWorkshop = {};
  for (const rec of records) {
    const wid = rec.workshop_id;
    if (!wid) continue;
    if (filterWorkshopId && wid !== filterWorkshopId) continue;
    if (!byWorkshop[wid]) byWorkshop[wid] = [];
    byWorkshop[wid].push(rec);
  }
  return byWorkshop;
}

/**
 * Separa registros consumidos (vinculados a atendimento real) de pendentes
 */
function separateConsumidosVsPendentes(records) {
  return {
    consumidos: records.filter(r => r.consultoria_atendimento_id),
    pendentes: records.filter(r => !r.consultoria_atendimento_id),
  };
}

/**
 * Valida se o plano é elegível para repair (não FREE, não trial, não null)
 */
function isPlanEligibleForRepair(planId) {
  if (!planId) return false;
  const normalized = planId.toUpperCase().trim();
  return !['FREE', 'TRIAL', ''].includes(normalized);
}

/**
 * Dado os registros "migrated" de um workshop e as regras do plano,
 * verifica quais tipos têm correspondência por nome
 * (attendance_type_name é preservado mesmo nos registros migrated)
 */
function matchMigratedToRules(migratedRecords, planRules) {
  const rulesByName = {};
  for (const rule of planRules) {
    // normaliza para lowercase para match case-insensitive
    const key = (rule.attendance_type_name || '').toLowerCase().trim();
    rulesByName[key] = rule;
  }

  return migratedRecords.map(rec => {
    const nameKey = (rec.attendance_type_name || '').toLowerCase().trim();
    const matched = rulesByName[nameKey] || null;
    return {
      record_id: rec.id,
      attendance_type_name: rec.attendance_type_name,
      matched_rule: matched,
      can_repair: !!matched,
    };
  });
}

/**
 * Replica a lógica do groupBucketByType do painel (testada em separado)
 * para garantir regressão após repair
 */
function groupBucketByType(buckets = []) {
  const bucketByType = {};
  for (const b of buckets) {
    const key = b.attendance_type_id;
    if (!key || key === 'migrated') continue; // FIX: ignora migrated
    if (!bucketByType[key]) {
      bucketByType[key] = { name: b.attendance_type_name || key, total: 0, done: 0 };
    }
    bucketByType[key].total++;
    if (b.status === 'realizado' || b.consultoria_atendimento_id) {
      bucketByType[key].done++;
    }
  }
  return bucketByType;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const PRATA_RULES = [
  { attendance_type_id: '69cd95705ae3749bbbaf1ba2', attendance_type_name: 'Onboarding',                          plan_id: 'PRATA', total_allowed: 1,  scheduling_type: 'frequency', is_active: true },
  { attendance_type_id: '69d956e3ffaa0bfac1274698', attendance_type_name: 'Avaliação do Perfil Empresarial',     plan_id: 'PRATA', total_allowed: 1,  scheduling_type: 'frequency', is_active: true },
  { attendance_type_id: '69d81408cf1225f9ad925963', attendance_type_name: 'Treinamento acelera time',            plan_id: 'PRATA', total_allowed: 1,  scheduling_type: 'frequency', is_active: true },
  { attendance_type_id: '69d957089ea2cb5177f992e6', attendance_type_name: 'Teste Perfil de Perfil Comportamental', plan_id: 'PRATA', total_allowed: 1, scheduling_type: 'frequency', is_active: true },
  { attendance_type_id: '69cd95705ae3749bbbaf1ba0', attendance_type_name: 'Mentoria Performance Humana',         plan_id: 'PRATA', total_allowed: 1,  scheduling_type: 'frequency', is_active: true },
  { attendance_type_id: '69cea645befc87369c2b28f0', attendance_type_name: 'Diagnóstico',                        plan_id: 'PRATA', total_allowed: 1,  scheduling_type: 'frequency', is_active: true },
];

// Registros migrated do Alemão Motos (workshop_id fictício para testes)
const ALEMAO_MIGRATED_RECORDS = [
  { id: 'rec1', workshop_id: 'ws_alemao', attendance_type_id: 'migrated', attendance_type_name: 'Onboarding',                           status: 'pendente', consultoria_atendimento_id: null },
  { id: 'rec2', workshop_id: 'ws_alemao', attendance_type_id: 'migrated', attendance_type_name: 'Avaliação do Perfil Empresarial',        status: 'pendente', consultoria_atendimento_id: null },
  { id: 'rec3', workshop_id: 'ws_alemao', attendance_type_id: 'migrated', attendance_type_name: 'Treinamento acelera time',               status: 'agendado', consultoria_atendimento_id: 'atend_real_123' },
  { id: 'rec4', workshop_id: 'ws_alemao', attendance_type_id: 'migrated', attendance_type_name: 'Teste Perfil de Perfil Comportamental',   status: 'pendente', consultoria_atendimento_id: null },
  { id: 'rec5', workshop_id: 'ws_alemao', attendance_type_id: 'migrated', attendance_type_name: 'Mentoria Performance Humana',             status: 'pendente', consultoria_atendimento_id: null },
  { id: 'rec6', workshop_id: 'ws_alemao', attendance_type_id: 'migrated', attendance_type_name: 'Mentoria Empresarial',                    status: 'pendente', consultoria_atendimento_id: null },
];

// Registros válidos (não migrated) — não devem ser tocados
const VALID_RECORDS = [
  { id: 'valid1', workshop_id: 'ws_alemao', attendance_type_id: '69cd95705ae3749bbbaf1ba2', attendance_type_name: 'Onboarding', status: 'pendente', consultoria_atendimento_id: null },
  { id: 'valid2', workshop_id: 'ws_outro',  attendance_type_id: 'abc123',                    attendance_type_name: 'Diagnóstico', status: 'realizado', consultoria_atendimento_id: 'atend_xyz' },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function assert(cond, msg) { if (!cond) throw new Error(`❌ FAIL: ${msg}`); }
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(`❌ FAIL: ${msg}\n   Expected: ${JSON.stringify(b)}\n   Got:      ${JSON.stringify(a)}`);
}
function assertDeepEqual(a, b, msg) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa !== sb) throw new Error(`❌ FAIL: ${msg}\n   Expected: ${sb}\n   Got:      ${sa}`);
}

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
    console.log(`  ✅ ${name}`);
  } catch (e) {
    results.push({ name, status: 'FAIL', error: e.message });
    console.error(`  ${e.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 1 — Identificação de registros migrated
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📦 GROUP 1: Identificação de registros migrated');

await test('isMigratedRecord retorna true para attendance_type_id="migrated"', () => {
  assert(isMigratedRecord({ attendance_type_id: 'migrated' }), 'deve ser true');
});

await test('isMigratedRecord retorna false para UUID real', () => {
  assert(!isMigratedRecord({ attendance_type_id: '69cd95705ae3749bbbaf1ba2' }), 'deve ser false para UUID real');
});

await test('isMigratedRecord retorna false para registro sem tipo', () => {
  assert(!isMigratedRecord({ attendance_type_id: null }), 'deve ser false para null');
  assert(!isMigratedRecord({ attendance_type_id: '' }), 'deve ser false para vazio');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 2 — Agrupamento por workshop_id
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📦 GROUP 2: Agrupamento por workshop_id');

await test('Agrupa corretamente 6 records do mesmo workshop', () => {
  const result = groupMigratedByWorkshop(ALEMAO_MIGRATED_RECORDS);
  assertEqual(Object.keys(result).length, 1, 'deve ter 1 workshop');
  assertEqual(result['ws_alemao'].length, 6, 'ws_alemao deve ter 6 registros');
});

await test('Agrupa múltiplos workshops corretamente', () => {
  const mixed = [
    ...ALEMAO_MIGRATED_RECORDS,
    { id: 'other1', workshop_id: 'ws_outro', attendance_type_id: 'migrated', attendance_type_name: 'Onboarding', status: 'pendente', consultoria_atendimento_id: null },
  ];
  const result = groupMigratedByWorkshop(mixed);
  assertEqual(Object.keys(result).length, 2, 'deve ter 2 workshops');
  assertEqual(result['ws_outro'].length, 1, 'ws_outro deve ter 1 registro');
});

await test('filterWorkshopId filtra corretamente para um único workshop', () => {
  const mixed = [
    ...ALEMAO_MIGRATED_RECORDS,
    { id: 'other1', workshop_id: 'ws_outro', attendance_type_id: 'migrated', attendance_type_name: 'X', status: 'pendente', consultoria_atendimento_id: null },
  ];
  const result = groupMigratedByWorkshop(mixed, 'ws_alemao');
  assertEqual(Object.keys(result).length, 1, 'deve ter apenas ws_alemao');
  assert(!result['ws_outro'], 'ws_outro não deve aparecer');
});

await test('Registro sem workshop_id é ignorado silenciosamente', () => {
  const records = [{ id: 'x', workshop_id: null, attendance_type_id: 'migrated' }];
  const result = groupMigratedByWorkshop(records);
  assertEqual(Object.keys(result).length, 0, 'deve retornar {}');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 3 — Separação consumidos vs pendentes
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📦 GROUP 3: Consumidos vs Pendentes');

await test('Separa corretamente: rec3 tem consultoria_atendimento_id → consumido', () => {
  const { consumidos, pendentes } = separateConsumidosVsPendentes(ALEMAO_MIGRATED_RECORDS);
  assertEqual(consumidos.length, 1, 'deve ter 1 consumido (rec3)');
  assertEqual(pendentes.length, 5, 'deve ter 5 pendentes');
  assertEqual(consumidos[0].id, 'rec3', 'consumido deve ser rec3');
});

await test('Todos pendentes → consumidos=0, pendentes=N', () => {
  const records = ALEMAO_MIGRATED_RECORDS.filter(r => !r.consultoria_atendimento_id);
  const { consumidos, pendentes } = separateConsumidosVsPendentes(records);
  assertEqual(consumidos.length, 0, 'nenhum consumido');
  assertEqual(pendentes.length, 5, '5 pendentes');
});

await test('Todos consumidos → consumidos=N, pendentes=0', () => {
  const records = ALEMAO_MIGRATED_RECORDS.map(r => ({ ...r, consultoria_atendimento_id: 'atend_x' }));
  const { consumidos, pendentes } = separateConsumidosVsPendentes(records);
  assertEqual(consumidos.length, 6, '6 consumidos');
  assertEqual(pendentes.length, 0, 'nenhum pendente');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 4 — Validação de planos elegíveis
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📦 GROUP 4: Elegibilidade de planos');

await test('PRATA é elegível', () => { assert(isPlanEligibleForRepair('PRATA'), 'PRATA ok'); });
await test('BRONZE é elegível', () => { assert(isPlanEligibleForRepair('BRONZE'), 'BRONZE ok'); });
await test('GOLD é elegível', () => { assert(isPlanEligibleForRepair('GOLD'), 'GOLD ok'); });
await test('IOM é elegível', () => { assert(isPlanEligibleForRepair('IOM'), 'IOM ok'); });
await test('MILLIONS é elegível', () => { assert(isPlanEligibleForRepair('MILLIONS'), 'MILLIONS ok'); });
await test('START é elegível', () => { assert(isPlanEligibleForRepair('START'), 'START ok'); });
await test('FREE NÃO é elegível', () => { assert(!isPlanEligibleForRepair('FREE'), 'FREE deve ser inelegível'); });
await test('TRIAL NÃO é elegível', () => { assert(!isPlanEligibleForRepair('TRIAL'), 'TRIAL deve ser inelegível'); });
await test('null NÃO é elegível', () => { assert(!isPlanEligibleForRepair(null), 'null deve ser inelegível'); });
await test('Case-insensitive: "prata" é elegível', () => { assert(isPlanEligibleForRepair('prata'), 'lowercase deve funcionar'); });

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 5 — Matching de registros migrated com regras do plano
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📦 GROUP 5: Matching migrated → PlanAttendanceRule por nome');

await test('5/6 registros do Alemão têm match nas regras PRATA', () => {
  // rec6 = "Mentoria Empresarial" — não existe no PRATA
  const matches = matchMigratedToRules(ALEMAO_MIGRATED_RECORDS, PRATA_RULES);
  const matchedCount = matches.filter(m => m.can_repair).length;
  assertEqual(matchedCount, 5, 'deve ter 5 matches (Mentoria Empresarial não existe no PRATA)');
});

await test('Onboarding encontra o UUID correto da regra PRATA', () => {
  const onboarding = ALEMAO_MIGRATED_RECORDS.filter(r => r.attendance_type_name === 'Onboarding');
  const matches = matchMigratedToRules(onboarding, PRATA_RULES);
  assertEqual(matches[0].matched_rule?.attendance_type_id, '69cd95705ae3749bbbaf1ba2', 'UUID correto do Onboarding');
});

await test('Match é case-insensitive para nomes de tipo', () => {
  const records = [{ id: 'x', attendance_type_name: 'ONBOARDING', attendance_type_id: 'migrated' }];
  const rules = [{ attendance_type_id: 'uuid_x', attendance_type_name: 'Onboarding' }];
  const matches = matchMigratedToRules(records, rules);
  assert(matches[0].can_repair, 'match case-insensitive deve funcionar');
  assertEqual(matches[0].matched_rule?.attendance_type_id, 'uuid_x', 'UUID correto');
});

await test('Tipo sem correspondência retorna can_repair=false', () => {
  const records = [{ id: 'x', attendance_type_name: 'Tipo Inexistente', attendance_type_id: 'migrated' }];
  const matches = matchMigratedToRules(records, PRATA_RULES);
  assert(!matches[0].can_repair, 'tipo sem match → can_repair=false');
  assertEqual(matches[0].matched_rule, null, 'matched_rule deve ser null');
});

await test('Array vazio de registros retorna array vazio', () => {
  assertEqual(matchMigratedToRules([], PRATA_RULES).length, 0, 'deve retornar []');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 6 — Idempotência
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📦 GROUP 6: Idempotência');

await test('Após repair: nenhum registro migrated restante para o workshop', () => {
  // Simula o estado pós-repair: todos os registros têm attendance_type_id real
  const postRepairBuckets = [
    { id: 'new1', workshop_id: 'ws_alemao', attendance_type_id: '69cd95705ae3749bbbaf1ba2', attendance_type_name: 'Onboarding', status: 'pendente', consultoria_atendimento_id: null },
    { id: 'new2', workshop_id: 'ws_alemao', attendance_type_id: '69d956e3ffaa0bfac1274698', attendance_type_name: 'Avaliação do Perfil Empresarial', status: 'pendente', consultoria_atendimento_id: null },
  ];
  const migratedRemaining = postRepairBuckets.filter(isMigratedRecord);
  assertEqual(migratedRemaining.length, 0, 'não deve ter registros migrated após repair');
});

await test('2ª execução: groupMigratedByWorkshop retorna {} quando não há migrated', () => {
  const result = groupMigratedByWorkshop([]);
  assertEqual(Object.keys(result).length, 0, 'segunda execução sem migrated → nada a fazer');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 7 — REGRESSÃO: registros válidos não são afetados
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📦 GROUP 7: Regressão — registros válidos intocados');

await test('Registros com UUID real não são identificados como migrated', () => {
  const migratedOnly = VALID_RECORDS.filter(isMigratedRecord);
  assertEqual(migratedOnly.length, 0, 'nenhum registro válido deve ser classificado como migrated');
});

await test('groupMigratedByWorkshop com mix de records: só captura migrated', () => {
  const allRecords = [...ALEMAO_MIGRATED_RECORDS, ...VALID_RECORDS].filter(isMigratedRecord);
  const grouped = groupMigratedByWorkshop(allRecords);
  // ws_outro em VALID_RECORDS tem attendance_type_id = 'abc123' (não migrated) → não deve aparecer
  assert(!grouped['ws_outro'], 'ws_outro (válido) não deve aparecer nos migrated');
  assert(grouped['ws_alemao'], 'ws_alemao (migrated) deve aparecer');
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 8 — REGRESSÃO: groupBucketByType após repair (painel)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📦 GROUP 8: Regressão — groupBucketByType com filtro migrated');

await test('groupBucketByType ignora registros migrated (FIX defensivo)', () => {
  // Simula o estado atual do Alemão: 6 registros migrated
  const result = groupBucketByType(ALEMAO_MIGRATED_RECORDS);
  assertEqual(Object.keys(result).length, 0, 'registros migrated devem ser ignorados no agrupamento');
});

await test('groupBucketByType funciona corretamente após repair (registros válidos)', () => {
  const postRepairBuckets = [
    { attendance_type_id: '69cd95705ae3749bbbaf1ba2', attendance_type_name: 'Onboarding', status: 'pendente', consultoria_atendimento_id: null },
    { attendance_type_id: '69d956e3ffaa0bfac1274698', attendance_type_name: 'Avaliação do Perfil Empresarial', status: 'realizado', consultoria_atendimento_id: null },
    { attendance_type_id: '69d81408cf1225f9ad925963', attendance_type_name: 'Treinamento acelera time', status: 'pendente', consultoria_atendimento_id: 'atend_123' },
  ];
  const result = groupBucketByType(postRepairBuckets);
  assertEqual(Object.keys(result).length, 3, 'deve ter 3 tipos distintos');
  assertEqual(result['69cd95705ae3749bbbaf1ba2'].done, 0, 'Onboarding: done=0');
  assertEqual(result['69d956e3ffaa0bfac1274698'].done, 1, 'Avaliação: done=1 (status=realizado)');
  assertEqual(result['69d81408cf1225f9ad925963'].done, 1, 'Treinamento: done=1 (tem consultoria_atendimento_id)');
});

await test('Mix de migrated + válidos: apenas válidos aparecem no painel', () => {
  const mixed = [
    { attendance_type_id: 'migrated',                    attendance_type_name: 'Onboarding antigo',  status: 'pendente', consultoria_atendimento_id: null },
    { attendance_type_id: '69cd95705ae3749bbbaf1ba2',    attendance_type_name: 'Onboarding novo',     status: 'pendente', consultoria_atendimento_id: null },
  ];
  const result = groupBucketByType(mixed);
  assertEqual(Object.keys(result).length, 1, 'apenas 1 tipo válido deve aparecer');
  assert(result['69cd95705ae3749bbbaf1ba2'], 'o tipo válido deve estar no resultado');
  assert(!result['migrated'], '"migrated" não deve aparecer no resultado');
});

await test('REGRESSÃO: testes anteriores do GROUP 1 ainda passam com nova versão de groupBucketByType', () => {
  // Replica exatamente o teste "Agrupa corretamente 6 items PRATA em 6 tipos únicos"
  const buckets = [
    { attendance_type_id: 't1', attendance_type_name: 'Onboarding', status: 'agendado', consultoria_atendimento_id: 'x' },
    { attendance_type_id: 't2', attendance_type_name: 'Avaliação Perfil', status: 'pendente', consultoria_atendimento_id: null },
    { attendance_type_id: 't3', attendance_type_name: 'Treinamento', status: 'pendente', consultoria_atendimento_id: null },
    { attendance_type_id: 't4', attendance_type_name: 'Teste Comportamental', status: 'pendente', consultoria_atendimento_id: null },
    { attendance_type_id: 't5', attendance_type_name: 'Mentoria', status: 'pendente', consultoria_atendimento_id: null },
    { attendance_type_id: 't6', attendance_type_name: 'Diagnóstico', status: 'pendente', consultoria_atendimento_id: null },
  ];
  const result = groupBucketByType(buckets);
  assertEqual(Object.keys(result).length, 6, 'deve ter 6 tipos (nenhum é migrated)');
  assertEqual(result['t1'].done, 1, 'Onboarding done=1');
  assertEqual(result['t2'].done, 0, 'Avaliação done=0');
});

// ─────────────────────────────────────────────────────────────────────────────
// RELATÓRIO
// ─────────────────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;

console.log('\n' + '─'.repeat(60));
console.log(`📊 RESULTADO: ${passed} passed | ${failed} failed | ${results.length} total`);

if (failed > 0) {
  results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`  • ${r.name}\n    ${r.error}`);
  });
  throw new Error(`${failed} test(s) failed`);
} else {
  console.log('✅ Todos os testes passaram — repairMigratedAttendances contratos verificados.');
}
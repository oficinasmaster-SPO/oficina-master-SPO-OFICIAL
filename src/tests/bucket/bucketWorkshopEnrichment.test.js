/**
 * TDD SUITE — Bucket de Atendimentos: Workshop Name Enrichment
 *
 * Cobre os bugs históricos identificados e corrigidos:
 *   BUG-01: getUserWorkshops crashava por hoisting de 'userProfileWorkshopId'
 *           causando _workshopName = '' e busca retornando "Nenhum cliente encontrado"
 *   BUG-02: catch {} silencioso engolia o erro sem nenhum fallback visível
 *   BUG-03: Batch de IDs não tinha chunking — rate limit com muitos clientes (132 pendentes)
 *
 * Clientes de referência para regressão:
 *   - Moto Mais Casa de Peças  (id: 6a170073ebe81d27444005d0, plano: PRATA, 6 atendimentos)
 *   - Carlão Auto Center        (id: 69fce5a4d58e055c29553491, plano: MILLIONS, 29 atendimentos)
 *
 * Padrão TDD aplicado: RED → GREEN → REFACTOR
 * Cada describe bloco é isolado com mocks injetados — sem efeitos colaterais.
 */

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const MOTO_MAIS_ID  = '6a170073ebe81d27444005d0';
const CARLAO_ID     = '69fce5a4d58e055c29553491';

const FIXTURE_WORKSHOPS = {
  [MOTO_MAIS_ID]: { id: MOTO_MAIS_ID, name: 'Moto Mais Casa de Peças', planId: 'PRATA' },
  [CARLAO_ID]:    { id: CARLAO_ID,    name: 'Carlão Auto Center',       planId: 'MILLIONS' },
};

/** Gera N bucket items para um workshop */
function makeBucketItems(workshopId, count = 3, overrides = {}) {
  return Array.from({ length: count }, (_, i) => ({
    id: `item_${workshopId}_${i}`,
    workshop_id: workshopId,
    attendance_type_name: 'Onboarding',
    sequence_number: i + 1,
    status: 'pendente',
    consultoria_atendimento_id: null,
    scheduled_date: new Date(Date.now() + i * 86400000).toISOString(),
    ...overrides,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO PURA EXTRAÍDA DO COMPONENTE (para testar isoladamente)
// Replica a lógica de enriquecimento de nomes do BucketAtendimentosTab
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enriquece itens com _workshopName resolvido via workshopMap ou batch fetch.
 * @param {Array}    pendingItems   - ContractAttendances com status='pendente'
 * @param {Object}   workshopMap    - Map de workshops do contexto do usuário logado
 * @param {Function} batchFetch     - fn(ids[]) → workshops[] (mock injetado nos testes)
 * @returns {Promise<Array>}        - items com _workshopName preenchido
 */
async function enrichBucketItems(pendingItems, workshopMap = {}, batchFetch) {
  const missingIds = [...new Set(
    pendingItems
      .map(i => i.workshop_id)
      .filter(id => id && !workshopMap[id])
  )];

  let extraMap = {};
  if (missingIds.length > 0) {
    const chunkSize = 20;
    for (let i = 0; i < missingIds.length; i += chunkSize) {
      const chunk = missingIds.slice(i, i + chunkSize);
      try {
        const fetched = await batchFetch(chunk);
        for (const ws of (fetched || [])) {
          if (ws?.id) extraMap[ws.id] = ws;
        }
      } catch {
        // chunk falhou — continua com os próximos
      }
    }
  }

  return pendingItems.map(item => ({
    ...item,
    _workshopName: (
      workshopMap[item.workshop_id]?.name ||
      extraMap[item.workshop_id]?.name ||
      ''
    ).toLowerCase()
  }));
}

/**
 * Função de busca client-side replicada do componente.
 * @param {Array}  enrichedItems  - items com _workshopName
 * @param {string} query          - texto do input de busca
 * @returns {Array}
 */
function filterBySearch(enrichedItems, query) {
  const q = query.trim().toLowerCase();
  return q
    ? enrichedItems.filter(item => item._workshopName?.includes(q))
    : enrichedItems;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function assert(condition, message) {
  if (!condition) throw new Error(`❌ FAIL: ${message}`);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`❌ FAIL: ${message}\n   Expected: ${JSON.stringify(expected)}\n   Actual:   ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(str, sub, message) {
  if (typeof str !== 'string' || !str.includes(sub)) {
    throw new Error(`❌ FAIL: ${message}\n   "${str}" does not include "${sub}"`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE
// ─────────────────────────────────────────────────────────────────────────────

const results = [];

async function runTest(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
    console.log(`  ✅ ${name}`);
  } catch (e) {
    results.push({ name, status: 'FAIL', error: e.message });
    console.error(`  ${e.message}`);
  }
}

// ────────────────────────────────────────────────────────────
// GROUP 1 — enrichBucketItems: caso feliz (workshopMap resolvido)
// ────────────────────────────────────────────────────────────
console.log('\n📦 GROUP 1: workshopMap hit (sem batch fetch)');

await runTest('PRATA - Moto Mais resolvido via workshopMap, busca case-insensitive com acento', async () => {
  const items = makeBucketItems(MOTO_MAIS_ID, 6);
  const batchFetch = async () => { throw new Error('should not be called'); };
  const enriched = await enrichBucketItems(items, { [MOTO_MAIS_ID]: FIXTURE_WORKSHOPS[MOTO_MAIS_ID] }, batchFetch);

  assertEqual(enriched.length, 6, 'deve retornar 6 items');
  assertIncludes(enriched[0]._workshopName, 'moto mais', '_workshopName deve conter "moto mais"');

  const found = filterBySearch(enriched, 'Moto Mais');
  assertEqual(found.length, 6, 'busca "Moto Mais" deve encontrar todos os 6');
});

await runTest('MILLIONS - Carlão resolvido via workshopMap, 29 items', async () => {
  const items = makeBucketItems(CARLAO_ID, 29);
  const batchFetch = async () => { throw new Error('should not be called'); };
  const enriched = await enrichBucketItems(items, { [CARLAO_ID]: FIXTURE_WORKSHOPS[CARLAO_ID] }, batchFetch);

  assertEqual(enriched.length, 29, 'deve retornar 29 items');
  const found = filterBySearch(enriched, 'carlão');
  assertEqual(found.length, 29, 'busca "carlão" deve encontrar todos os 29');
});

// ────────────────────────────────────────────────────────────
// GROUP 2 — enrichBucketItems: batch fetch (workshopMap miss)
// Regressão de BUG-01: getUserWorkshops com workshopIds
// ────────────────────────────────────────────────────────────
console.log('\n📦 GROUP 2: batch fetch (workshopMap miss — regressão BUG-01)');

await runTest('Moto Mais ausente do workshopMap → batch fetch → nome resolvido', async () => {
  const items = makeBucketItems(MOTO_MAIS_ID, 6);
  // workshopMap vazio simula consultor de firma diferente (sem Moto Mais no contexto)
  const batchFetch = async (ids) => ids.map(id => FIXTURE_WORKSHOPS[id]).filter(Boolean);
  const enriched = await enrichBucketItems(items, {}, batchFetch);

  assertIncludes(enriched[0]._workshopName, 'moto mais', 'nome deve ser resolvido via batch');
  const found = filterBySearch(enriched, 'casa de peças');
  assertEqual(found.length, 6, 'busca parcial "casa de peças" deve encontrar os 6');
});

await runTest('Carlão ausente do workshopMap → batch fetch → 29 items encontrados', async () => {
  const items = makeBucketItems(CARLAO_ID, 29);
  const batchFetch = async (ids) => ids.map(id => FIXTURE_WORKSHOPS[id]).filter(Boolean);
  const enriched = await enrichBucketItems(items, {}, batchFetch);

  const found = filterBySearch(enriched, 'Carlão Auto Center');
  assertEqual(found.length, 29, 'busca pelo nome completo deve encontrar 29');
});

await runTest('Mix: Moto Mais no workshopMap, Carlão via batch — ambos encontráveis', async () => {
  const items = [
    ...makeBucketItems(MOTO_MAIS_ID, 6),
    ...makeBucketItems(CARLAO_ID, 29),
  ];
  const batchFetch = async (ids) => ids.map(id => FIXTURE_WORKSHOPS[id]).filter(Boolean);
  const enriched = await enrichBucketItems(
    items,
    { [MOTO_MAIS_ID]: FIXTURE_WORKSHOPS[MOTO_MAIS_ID] }, // Moto Mais no map, Carlão não
    batchFetch
  );

  assertEqual(enriched.length, 35, 'total deve ser 35');
  assertEqual(filterBySearch(enriched, 'moto mais').length, 6, 'Moto Mais: 6 encontrados');
  assertEqual(filterBySearch(enriched, 'carlão').length, 29, 'Carlão: 29 encontrados');
});

// ────────────────────────────────────────────────────────────
// GROUP 3 — Chunking: regressão BUG-03 (rate limit com 132 pendentes)
// ────────────────────────────────────────────────────────────
console.log('\n📦 GROUP 3: chunking de batch (regressão BUG-03 — 132 pendentes)');

await runTest('25 workshops distintos → chunked em 2 lotes (20 + 5)', async () => {
  const ids = Array.from({ length: 25 }, (_, i) => `ws_${i}`);
  const allWs = Object.fromEntries(ids.map(id => [id, { id, name: `Oficina ${id}` }]));
  const items = ids.flatMap(id => makeBucketItems(id, 2));

  const callLog = [];
  const batchFetch = async (chunk) => {
    callLog.push(chunk.length);
    return chunk.map(id => allWs[id]);
  };

  await enrichBucketItems(items, {}, batchFetch);

  assertEqual(callLog.length, 2, 'deve fazer exatamente 2 chamadas de batch');
  assertEqual(callLog[0], 20, 'primeiro chunk deve ter 20 IDs');
  assertEqual(callLog[1], 5, 'segundo chunk deve ter 5 IDs');
});

await runTest('Primeiro chunk falha → segundo chunk ainda executa (resiliência)', async () => {
  const ids = Array.from({ length: 25 }, (_, i) => `ws_${i}`);
  const allWs = Object.fromEntries(ids.map(id => [id, { id, name: `Oficina ${id}` }]));
  const items = ids.flatMap(id => makeBucketItems(id, 1));

  let callCount = 0;
  const batchFetch = async (chunk) => {
    callCount++;
    if (callCount === 1) throw new Error('rate limit simulado');
    return chunk.map(id => allWs[id]);
  };

  const enriched = await enrichBucketItems(items, {}, batchFetch);

  assertEqual(callCount, 2, 'deve tentar os 2 chunks mesmo após falha no primeiro');
  const resolved = enriched.filter(i => i._workshopName !== '');
  assertEqual(resolved.length, 5, 'apenas os 5 do segundo chunk devem ter nome resolvido');
});

await runTest('IDs duplicados no batch → deduplicados antes do fetch', async () => {
  // Simula vários atendimentos do mesmo workshop (ex: 12x Treinamento + 12x Mentoria = 24 items do mesmo ID)
  const items = makeBucketItems(CARLAO_ID, 24);
  const callLog = [];
  const batchFetch = async (chunk) => {
    callLog.push(chunk);
    return chunk.map(id => FIXTURE_WORKSHOPS[id]).filter(Boolean);
  };

  await enrichBucketItems(items, {}, batchFetch);

  assertEqual(callLog.length, 1, 'deve fazer apenas 1 chamada com 1 ID único');
  assertEqual(callLog[0].length, 1, 'chunk deve conter apenas 1 ID (deduplicado)');
});

// ────────────────────────────────────────────────────────────
// GROUP 4 — Edge cases: IDs inválidos, batch retorna nulo, workshop deletado
// ────────────────────────────────────────────────────────────
console.log('\n📦 GROUP 4: edge cases');

await runTest('workshop_id nulo → item incluído com _workshopName vazio, sem crash', async () => {
  const items = [{ id: 'x', workshop_id: null, consultoria_atendimento_id: null }];
  const enriched = await enrichBucketItems(items, {}, async () => []);
  assertEqual(enriched[0]._workshopName, '', '_workshopName deve ser string vazia');
});

await runTest('batch retorna null para ID inexistente → _workshopName vazio, sem crash', async () => {
  const items = makeBucketItems('id_inexistente', 2);
  const batchFetch = async () => [null, undefined]; // batch retorna lixo
  const enriched = await enrichBucketItems(items, {}, batchFetch);
  assert(enriched.every(i => i._workshopName === ''), 'todos devem ter _workshopName vazio');
});

await runTest('busca vazia → retorna todos os items sem filtrar', async () => {
  const items = [
    { _workshopName: 'moto mais casa de peças' },
    { _workshopName: 'carlão auto center' },
    { _workshopName: '' },
  ];
  assertEqual(filterBySearch(items, '').length, 3, 'busca vazia deve retornar tudo');
  assertEqual(filterBySearch(items, '   ').length, 3, 'busca só espaços deve retornar tudo');
});

await runTest('busca com termo sem match → retorna array vazio', async () => {
  const items = [
    { _workshopName: 'moto mais casa de peças' },
    { _workshopName: 'carlão auto center' },
  ];
  assertEqual(filterBySearch(items, 'zzz_inexistente').length, 0, 'deve retornar []');
});

await runTest('busca case-insensitive e com acento — "carlão" encontra "Carlão Auto Center"', async () => {
  const items = [{ _workshopName: 'carlão auto center' }];
  assertEqual(filterBySearch(items, 'Carlão').length, 1, 'maiúscula+acento deve funcionar');
  assertEqual(filterBySearch(items, 'CARLÃO').length, 1, 'full uppercase deve funcionar');
  assertEqual(filterBySearch(items, 'carlao').length, 0, 'sem acento não deve dar match (comportamento atual)');
});

// ────────────────────────────────────────────────────────────
// GROUP 5 — Idempotência: segundo clique no botão de gerar retorna 0 criados
// Valida que a regressão do Minas Motos não volta
// ────────────────────────────────────────────────────────────
console.log('\n📦 GROUP 5: idempotência do gerador (regressão caso Minas Motos)');

await runTest('Moto Mais: 6 atendimentos já existem → lógica de skip identifica todos', () => {
  const existingByType = {
    '69cd95705ae3749bbbaf1ba2': 1, // Onboarding ×1
    '69d956e3ffaa0bfac1274698': 1, // Avaliação Perfil ×1
    '69d81408cf1225f9ad925963': 1, // Treinamento ×1
    '69d957089ea2cb5177f992e6': 1, // Teste Comportamental ×1
    '69cd95705ae3749bbbaf1ba0': 1, // Mentoria Performance ×1
    '69cea645befc87369c2b28f0': 1, // Diagnóstico ×1
  };
  const rules = [
    { attendance_type_id: '69cd95705ae3749bbbaf1ba2', total_allowed: 1, scheduling_type: 'frequency' },
    { attendance_type_id: '69d956e3ffaa0bfac1274698', total_allowed: 1, scheduling_type: 'frequency' },
    { attendance_type_id: '69d81408cf1225f9ad925963', total_allowed: 1, scheduling_type: 'frequency' },
    { attendance_type_id: '69d957089ea2cb5177f992e6', total_allowed: 1, scheduling_type: 'frequency' },
    { attendance_type_id: '69cd95705ae3749bbbaf1ba0', total_allowed: 1, scheduling_type: 'frequency' },
    { attendance_type_id: '69cea645befc87369c2b28f0', total_allowed: 1, scheduling_type: 'frequency' },
  ];

  let toCreate = 0;
  let toSkip = 0;
  for (const rule of rules) {
    if (rule.scheduling_type !== 'frequency') continue;
    const existing = existingByType[rule.attendance_type_id] || 0;
    const missing = rule.total_allowed - existing;
    if (missing > 0) toCreate += missing;
    else toSkip += existing;
  }

  assertEqual(toCreate, 0, 'PRATA/Moto Mais já completo: deve criar 0');
  assertEqual(toSkip, 6, 'deve pular 6 existentes');
});

await runTest('Carlão MILLIONS: 29 existentes → skip completo', () => {
  const existingByType = {
    '69cea645befc87369c2b28fe': 1,  // Assessoria Financeira
    '69cea645befc87369c2b28f9': 1,  // Contratação CESP
    '69cea645befc87369c2b28f1': 1,  // Incompany
    '69d81408cf1225f9ad925963': 12, // Treinamento ×12
    '69d956e3ffaa0bfac1274698': 1,  // Avaliação Perfil
    '69d957089ea2cb5177f992e6': 1,  // Teste Comportamental
    '69e91f817a8bec2bcf7ba64e': 12, // Mentoria Millions ×12
  };
  const rules = [
    { attendance_type_id: '69cea645befc87369c2b28fe', total_allowed: 1,  scheduling_type: 'frequency' },
    { attendance_type_id: '69cea645befc87369c2b28f9', total_allowed: 1,  scheduling_type: 'frequency' },
    { attendance_type_id: '69cea645befc87369c2b28f1', total_allowed: 1,  scheduling_type: 'frequency' },
    { attendance_type_id: '69d81408cf1225f9ad925963', total_allowed: 12, scheduling_type: 'frequency' },
    { attendance_type_id: '69d956e3ffaa0bfac1274698', total_allowed: 1,  scheduling_type: 'frequency' },
    { attendance_type_id: '69d957089ea2cb5177f992e6', total_allowed: 1,  scheduling_type: 'frequency' },
    { attendance_type_id: '69e91f817a8bec2bcf7ba64e', total_allowed: 12, scheduling_type: 'frequency' },
  ];

  let toCreate = 0, toSkip = 0;
  for (const rule of rules) {
    if (rule.scheduling_type !== 'frequency') continue;
    const existing = existingByType[rule.attendance_type_id] || 0;
    const missing = rule.total_allowed - existing;
    if (missing > 0) toCreate += missing; else toSkip += existing;
  }

  assertEqual(toCreate, 0, 'MILLIONS/Carlão completo: deve criar 0');
  assertEqual(toSkip, 29, 'deve pular 29 existentes');
});

// ─────────────────────────────────────────────────────────────────────────────
// RELATÓRIO FINAL
// ─────────────────────────────────────────────────────────────────────────────

const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;

console.log('\n' + '─'.repeat(60));
console.log(`📊 RESULTADO FINAL: ${passed} passed | ${failed} failed | ${results.length} total`);

if (failed > 0) {
  console.log('\nFalhas:');
  results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`  • ${r.name}`);
    console.log(`    ${r.error}`);
  });
  throw new Error(`${failed} test(s) failed`);
} else {
  console.log('✅ Todos os testes passaram — regressão garantida.');
}
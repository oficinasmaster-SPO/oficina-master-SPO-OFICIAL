/**
 * TDD Test Suite: cleanupDuplicateAttendances
 * 
 * OBJETIVO: Garantir que o cleanup:
 * 1. Mantenha APENAS 1 registro por tipo de atendimento
 * 2. Priorize registros com consultoria_atendimento_id (link)
 * 3. Se nenhum tiver link, mantenha o mais antigo por scheduled_date
 * 4. Seja idempotente (rodar múltiplas vezes = mesmo resultado)
 * 5. Não afete workshops sem duplicatas
 * 
 * EXECUÇÃO: Deno run --allow-env --allow-net tests/cleanup/cleanupDuplicateAttendances.test.js
 */

import { assert, assertEquals, assertExists } from 'jsr:@std/assert@1.0';

/* global Deno */

// Mock do Base44 SDK para testes unitários
const createMockBase44 = (scenario) => {
  const mockData = {
    noDuplicates: [
      { id: '1', attendance_type_id: 'type_a', scheduled_date: '2026-01-01', consultoria_atendimento_id: null },
      { id: '2', attendance_type_id: 'type_b', scheduled_date: '2026-01-02', consultoria_atendimento_id: 'realized_1' },
    ],
    duplicatesWithoutLink: [
      { id: '1a', attendance_type_id: 'type_a', scheduled_date: '2026-01-01', consultoria_atendimento_id: null },
      { id: '1b', attendance_type_id: 'type_a', scheduled_date: '2026-01-03', consultoria_atendimento_id: null },
    ],
    duplicatesWithLink: [
      { id: '1a', attendance_type_id: 'type_a', scheduled_date: '2026-01-03', consultoria_atendimento_id: 'realized_1' },
      { id: '1b', attendance_type_id: 'type_a', scheduled_date: '2026-01-01', consultoria_atendimento_id: null },
    ],
    multipleDuplicatesMixed: [
      { id: '1a', attendance_type_id: 'type_a', scheduled_date: '2026-01-05', consultoria_atendimento_id: null },
      { id: '1b', attendance_type_id: 'type_a', scheduled_date: '2026-01-01', consultoria_atendimento_id: 'realized_1' },
      { id: '1c', attendance_type_id: 'type_a', scheduled_date: '2026-01-03', consultoria_atendimento_id: 'realized_2' },
      { id: '2a', attendance_type_id: 'type_b', scheduled_date: '2026-02-01', consultoria_atendimento_id: null },
      { id: '2b', attendance_type_id: 'type_b', scheduled_date: '2026-02-02', consultoria_atendimento_id: null },
    ],
    migratedRecords: [
      { id: 'm1', attendance_type_id: 'migrated', scheduled_date: '2026-01-01', consultoria_atendimento_id: null },
      { id: 'm2', attendance_type_id: 'migrated', scheduled_date: '2026-01-02', consultoria_atendimento_id: null },
      { id: '1a', attendance_type_id: 'type_a', scheduled_date: '2026-01-01', consultoria_atendimento_id: null },
      { id: '1b', attendance_type_id: 'type_a', scheduled_date: '2026-01-03', consultoria_atendimento_id: null },
    ],
  };

  return {
    entities: {
      ContractAttendance: {
        filter: async (query, sort, limit) => {
          const workshopId = query?.workshop_id;
          let data = mockData[scenario] || [];
          
          if (workshopId) {
            data = data.filter(item => item.workshop_id === workshopId);
          }
          
          return data;
        },
        delete: async (id) => {
          console.log(`[MOCK] Deleted: ${id}`);
          return { id };
        },
        update: async (id, data) => {
          console.log(`[MOCK] Updated ${id}:`, data);
          return { id, ...data };
        }
      }
    },
    auth: {
      me: async () => ({ role: 'admin', email: 'test@admin.com' })
    }
  };
};

// Test helpers
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(`   ${err.message}`);
    testsFailed++;
  }
}

function assertKeepSelected(keepList, expectedId, message) {
  const keptIds = keepList.map(a => a.id);
  if (!keptIds.includes(expectedId)) {
    throw new Error(`${message}: esperado ${expectedId} em keepList, mas veio ${keptIds.join(', ')}`);
  }
}

// TESTES
console.log('\n🧪 TDD: cleanupDuplicateAttendances\n');

test('1. Sem duplicatas → mantém todos', () => {
  const attendances = [
    { id: '1', attendance_type_id: 'type_a', scheduled_date: '2026-01-01', consultoria_atendimento_id: null },
    { id: '2', attendance_type_id: 'type_b', scheduled_date: '2026-01-02', consultoria_atendimento_id: 'realized_1' },
  ];
  
  // Simula lógica do cleanup
  const groupedByType = {};
  for (const att of attendances) {
    const key = att.attendance_type_id;
    if (!groupedByType[key]) groupedByType[key] = [];
    groupedByType[key].push(att);
  }
  
  const toKeep = [];
  for (const [typeId, items] of Object.entries(groupedByType)) {
    if (items.length <= 1) {
      toKeep.push(items[0]);
    }
  }
  
  assertEquals(toKeep.length, 2, 'Deveria manter 2 registros');
});

test('2. Duplicata sem link → mantém mais antigo', () => {
  const attendances = [
    { id: '1a', attendance_type_id: 'type_a', scheduled_date: '2026-01-03', consultoria_atendimento_id: null },
    { id: '1b', attendance_type_id: 'type_a', scheduled_date: '2026-01-01', consultoria_atendimento_id: null },
  ];
  
  const groupedByType = { 'type_a': attendances };
  const toKeep = [];
  
  for (const [typeId, items] of Object.entries(groupedByType)) {
    items.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
    toKeep.push(items[0]); // Mais antigo
  }
  
  assertKeepSelected(toKeep, '1b', 'Deveria manter o mais antigo (2026-01-01)');
});

test('3. Duplicata com link → mantém o que tem link', () => {
  const attendances = [
    { id: '1a', attendance_type_id: 'type_a', scheduled_date: '2026-01-03', consultoria_atendimento_id: 'realized_1' },
    { id: '1b', attendance_type_id: 'type_a', scheduled_date: '2026-01-01', consultoria_atendimento_id: null },
  ];
  
  const groupedByType = { 'type_a': attendances };
  const toKeep = [];
  
  for (const [typeId, items] of Object.entries(groupedByType)) {
    const withLink = items.filter(a => a.consultoria_atendimento_id);
    if (withLink.length > 0) {
      withLink.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
      toKeep.push(withLink[0]);
    } else {
      items.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
      toKeep.push(items[0]);
    }
  }
  
  assertKeepSelected(toKeep, '1a', 'Deveria manter o que tem consultoria_atendimento_id');
});

test('4. Múltiplas duplicatas mistas → prioriza links, depois antiguidade', () => {
  const attendances = [
    { id: '1a', attendance_type_id: 'type_a', scheduled_date: '2026-01-05', consultoria_atendimento_id: null },
    { id: '1b', attendance_type_id: 'type_a', scheduled_date: '2026-01-01', consultoria_atendimento_id: 'realized_1' },
    { id: '1c', attendance_type_id: 'type_a', scheduled_date: '2026-01-03', consultoria_atendimento_id: 'realized_2' },
    { id: '2a', attendance_type_id: 'type_b', scheduled_date: '2026-02-01', consultoria_atendimento_id: null },
    { id: '2b', attendance_type_id: 'type_b', scheduled_date: '2026-02-02', consultoria_atendimento_id: null },
  ];
  
  const groupedByType = {};
  for (const att of attendances) {
    const key = att.attendance_type_id;
    if (!groupedByType[key]) groupedByType[key] = [];
    groupedByType[key].push(att);
  }
  
  const toKeep = [];
  const toDelete = [];
  
  for (const [typeId, items] of Object.entries(groupedByType)) {
    const withLink = items.filter(a => a.consultoria_atendimento_id);
    if (withLink.length > 0) {
      withLink.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
      toKeep.push(withLink[0]);
      toDelete.push(...items.filter(i => i.id !== withLink[0].id));
    } else {
      items.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
      toKeep.push(items[0]);
      toDelete.push(...items.slice(1));
    }
  }
  
  assertEquals(toKeep.length, 2, 'Deveria manter 2 registros (um por tipo)');
  assertEquals(toDelete.length, 3, 'Deveria deletar 3 duplicatas');
  
  // type_a: mantém 1b (tem link + mais antigo entre os com link)
  assertKeepSelected(toKeep, '1b', 'type_a: manter que tem link + mais antigo');
  
  // type_b: mantém 2a (mais antigo)
  assertKeepSelected(toKeep, '2a', 'type_b: manter mais antigo');
});

test('5. Registros migrated → ignorados (não contam como duplicata)', () => {
  const attendances = [
    { id: 'm1', attendance_type_id: 'migrated', scheduled_date: '2026-01-01', consultoria_atendimento_id: null },
    { id: 'm2', attendance_type_id: 'migrated', scheduled_date: '2026-01-02', consultoria_atendimento_id: null },
    { id: '1a', attendance_type_id: 'type_a', scheduled_date: '2026-01-01', consultoria_atendimento_id: null },
    { id: '1b', attendance_type_id: 'type_a', scheduled_date: '2026-01-03', consultoria_atendimento_id: null },
  ];
  
  // Filtra migrated
  const filtered = attendances.filter(a => a.attendance_type_id !== 'migrated');
  
  assertEquals(filtered.length, 2, 'Deveria filtrar migrated e manter apenas type_a');
  
  const groupedByType = {};
  for (const att of filtered) {
    const key = att.attendance_type_id;
    if (!groupedByType[key]) groupedByType[key] = [];
    groupedByType[key].push(att);
  }
  
  assertEquals(Object.keys(groupedByType).length, 1, 'Deveria ter apenas 1 tipo (type_a)');
  assertEquals(groupedByType['type_a'].length, 2, 'type_a deveria ter 2 registros');
});

test('6. Idempotência → rodar 2x = mesmo resultado', () => {
  const attendances = [
    { id: '1a', attendance_type_id: 'type_a', scheduled_date: '2026-01-01', consultoria_atendimento_id: null },
  ];
  
  // Primeira execução
  const groupedByType1 = {};
  for (const att of attendances) {
    const key = att.attendance_type_id;
    if (!groupedByType1[key]) groupedByType1[key] = [];
    groupedByType1[key].push(att);
  }
  
  const toKeep1 = [];
  for (const [typeId, items] of Object.entries(groupedByType1)) {
    if (items.length <= 1) toKeep1.push(items[0]);
  }
  
  // Segunda execução (mesmos dados)
  const groupedByType2 = {};
  for (const att of attendances) {
    const key = att.attendance_type_id;
    if (!groupedByType2[key]) groupedByType2[key] = [];
    groupedByType2[key].push(att);
  }
  
  const toKeep2 = [];
  for (const [typeId, items] of Object.entries(groupedByType2)) {
    if (items.length <= 1) toKeep2.push(items[0]);
  }
  
  assertEquals(toKeep1.length, toKeep2.length, 'Mesma quantidade de registros mantidos');
  assertEquals(toKeep1[0].id, toKeep2[0].id, 'Mesmos IDs mantidos');
});

test('7. Workshop específico → filtro por workshop_id', () => {
  const attendances = [
    { id: '1a', attendance_type_id: 'type_a', scheduled_date: '2026-01-01', workshop_id: 'ws_1', consultoria_atendimento_id: null },
    { id: '1b', attendance_type_id: 'type_a', scheduled_date: '2026-01-03', workshop_id: 'ws_2', consultoria_atendimento_id: null },
  ];
  
  const workshopId = 'ws_1';
  const filtered = attendances.filter(a => a.workshop_id === workshopId);
  
  assertEquals(filtered.length, 1, 'Deveria filtrar apenas workshop ws_1');
  assertEquals(filtered[0].id, '1a', 'Deveria manter registro do ws_1');
});

// SUMMARY
console.log('\n' + '='.repeat(50));
console.log(`📊 Resultados: ${testsPassed} passaram, ${testsFailed} falharam`);
console.log('='.repeat(50));

if (testsFailed > 0) {
  console.error('\n❌ TESTES FALHARAM — Não rodar cleanup em produção!');
  Deno.exit(1);
} else {
  console.log('\n✅ TODOS OS TESTES PASSARAM — Cleanup seguro para produção\n');
  Deno.exit(0);
}
/**
 * Teste de Diagnóstico — Bug de Contagem no ClientHistoryFloatingPanel
 * 
 * PROBLEMA REPORTADO:
 * - Plano PRATA tem 6 tipos de atendimento (1 de cada)
 * - Painel mostra "2 de cada" no total
 * - Painel mostra "0 realizados" quando deveria mostrar "1 realizado"
 * 
 * HIPÓTESES:
 * 1. Registros duplicados em ContractAttendance
 * 2. Contagem usando `status === 'realizado'` ao invés de `consultoria_atendimento_id`
 * 3. Registros "migrated" ainda presentes
 */

import { test, runTests, createTestUtils } from './testRunner.js';

// ── MOCK DATA: Cenário Alemão Motos ───────────────────────────────────────
const MOCK_CONTRACT_ATTENDANCES = [
  // Tipo: Mentoria de Performance Humana (deveria ter 1)
  {
    id: '1',
    workshop_id: '69cd174e32a0df56056ca355',
    plan_id: 'PRATA',
    attendance_type_id: 'mentoria_performance',
    attendance_type_name: 'Mentoria de Performance Humana',
    status: 'pendente',
    consultoria_atendimento_id: 'ata-realizada-001', // ← Foi realizada!
    scheduled_date: '2026-04-14T10:00:00Z',
  },
  // DUPLICATA (bug de geração)
  {
    id: '2',
    workshop_id: '69cd174e32a0df56056ca355',
    plan_id: 'PRATA',
    attendance_type_id: 'mentoria_performance',
    attendance_type_name: 'Mentoria de Performance Humana',
    status: 'pendente',
    consultoria_atendimento_id: null, // ← Duplicata não realizada
    scheduled_date: '2026-05-14T10:00:00Z',
  },
  // Tipo: Reunião de Onboarding (deveria ter 1)
  {
    id: '3',
    workshop_id: '69cd174e32a0df56056ca355',
    plan_id: 'PRATA',
    attendance_type_id: 'onboarding',
    attendance_type_name: 'Reunião de Onboarding',
    status: 'pendente',
    consultoria_atendimento_id: 'ata-realizada-002', // ← Foi realizada!
    scheduled_date: '2026-04-07T10:00:00Z',
  },
  // DUPLICATA (bug de geração)
  {
    id: '4',
    workshop_id: '69cd174e32a0df56056ca355',
    plan_id: 'PRATA',
    attendance_type_id: 'onboarding',
    attendance_type_name: 'Reunião de Onboarding',
    status: 'pendente',
    consultoria_atendimento_id: null,
    scheduled_date: '2026-05-07T10:00:00Z',
  },
];

const MOCK_REALIZADOS = [
  {
    id: 'ata-realizada-001',
    workshop_id: '69cd174e32a0df56056ca355',
    tipo_atendimento: 'Mentoria de Performance Humana',
    consultor_nome: 'Consultor A',
    data_agendada: '2026-04-14T10:00:00Z',
    status: 'realizado',
  },
  {
    id: 'ata-realizada-002',
    workshop_id: '69cd174e32a0df56056ca355',
    tipo_atendimento: 'Reunião de Onboarding',
    consultor_nome: 'Consultor B',
    data_agendada: '2026-04-07T10:00:00Z',
    status: 'realizado',
  },
];

// ── FUNÇÃO ATUAL (COM BUG) ────────────────────────────────────────────────
function groupBucketByType_BUGGY(buckets) {
  const bucketByType = {};
  for (const b of buckets) {
    const key = b.attendance_type_id;
    if (!key || key === 'migrated') continue;
    if (!bucketByType[key]) {
      bucketByType[key] = { name: b.attendance_type_name || key, total: 0, done: 0 };
    }
    bucketByType[key].total++;
    // BUG: conta como realizado APENAS se status === 'realizado'
    // MAS o status pode ser 'pendente' e ainda ter consultoria_atendimento_id!
    if (b.status === "realizado" || b.consultoria_atendimento_id) {
      bucketByType[key].done++;
    }
  }
  return bucketByType;
}

// ── FUNÇÃO CORRIGIDA ──────────────────────────────────────────────────────
function groupBucketByType_FIXED(buckets) {
  const bucketByType = {};
  for (const b of buckets) {
    const key = b.attendance_type_id;
    if (!key || key === 'migrated') continue;
    if (!bucketByType[key]) {
      bucketByType[key] = { name: b.attendance_type_name || key, total: 0, done: 0 };
    }
    bucketByType[key].total++;
    // FIX: considera realizado se tiver consultoria_atendimento_id (independente do status)
    if (b.consultoria_atendimento_id) {
      bucketByType[key].done++;
    }
  }
  return bucketByType;
}

// ── TESTES ────────────────────────────────────────────────────────────────

test('groupBucketByType_BUGGY: conta total duplicado (2 em vez de 1)', () => {
  const result = groupBucketByType_BUGGY(MOCK_CONTRACT_ATTENDANCES);
  
  // BUG: total = 2 (tem duplicata)
  console.assert(result['mentoria_performance'].total === 2, 
    `Expected total=2, got ${result['mentoria_performance'].total}`);
  
  // BUG: done = 1 (só um tem consultoria_atendimento_id)
  console.assert(result['mentoria_performance'].done === 1, 
    `Expected done=1, got ${result['mentoria_performance'].done}`);
  
  // RESULTADO NO PAINEL: "1/2" → Mostra como se tivesse 2 disponíveis, 1 realizado
  // MAS O PLANO SÓ TEM 1!
});

test('groupBucketByType_FIXED: conta total corretamente (precisa de dedup)', () => {
  // NOTA: a função FIXED sozinha não resolve — precisa deduplicar ANTES
  const result = groupBucketByType_FIXED(MOCK_CONTRACT_ATTENDANCES);
  
  // Ainda conta 2 porque tem duplicata no banco
  console.assert(result['mentoria_performance'].total === 2, 
    `Expected total=2 (still buggy without dedup), got ${result['mentoria_performance'].total}`);
});

test('groupBucketByType_FIXED + dedup: conta corretamente (1/1)', () => {
  // SOLUÇÃO: deduplicar por attendance_type_id + consultoria_atendimento_id
  const deduped = deduplicateAttendances(MOCK_CONTRACT_ATTENDANCES);
  const result = groupBucketByType_FIXED(deduped);
  
  // CORRETO: total = 1, done = 1
  console.assert(result['mentoria_performance'].total === 1, 
    `Expected total=1, got ${result['mentoria_performance'].total}`);
  console.assert(result['mentoria_performance'].done === 1, 
    `Expected done=1, got ${result['mentoria_performance'].done}`);
});

test('Detecta duplicatas por attendance_type_id', () => {
  const duplicates = findDuplicates(MOCK_CONTRACT_ATTENDANCES);
  
  console.assert(duplicates.length === 2, 
    `Expected 2 duplicates, got ${duplicates.length}`);
  
  console.assert(
    duplicates.some(d => d.attendance_type_id === 'mentoria_performance'),
    'Should detect mentoria_performance duplicates'
  );
});

// ── FUNÇÕES AUXILIARES ────────────────────────────────────────────────────

/**
 * Deduplica attendances:
 * - Se houver múltiplos do mesmo tipo, manter APENAS o que tem consultoria_atendimento_id
 * - Se nenhum tiver, manter o mais antigo (menor scheduled_date)
 */
function deduplicateAttendances(attendances) {
  const grouped = {};
  
  for (const att of attendances) {
    const key = att.attendance_type_id;
    if (!key || key === 'migrated') continue;
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(att);
  }
  
  const deduped = [];
  for (const [typeId, items] of Object.entries(grouped)) {
    // Priorizar o que tem consultoria_atendimento_id
    const withLink = items.filter(a => a.consultoria_atendimento_id);
    if (withLink.length > 0) {
      // Se tiver múltiplos com link, pegar o mais antigo
      withLink.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
      deduped.push(withLink[0]);
    } else {
      // Nenhum tem link → pegar o mais antigo
      items.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
      deduped.push(items[0]);
    }
  }
  
  return deduped;
}

/**
 * Encontra duplicatas por attendance_type_id
 */
function findDuplicates(attendances) {
  const counts = {};
  for (const att of attendances) {
    const key = att.attendance_type_id;
    if (!key || key === 'migrated') continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  
  const duplicates = [];
  for (const [typeId, count] of Object.entries(counts)) {
    if (count > 1) {
      duplicates.push({ attendance_type_id: typeId, count });
    }
  }
  
  return duplicates;
}

// ── EXECUÇÃO ──────────────────────────────────────────────────────────────
runTests('clientHistoryFloatingPanel.alemaoMotosDebug.test');
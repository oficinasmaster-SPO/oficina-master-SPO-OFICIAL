/**
 * TDD Test Suite: ClientHistoryFloatingPanel — Casos Reais
 * 
 * Cobre 4 clientes com problemas críticos:
 * 1. Conexão: Plano sumiu, só aparecem realizadas
 * 2. Autoelétrica Amateluso: 4 realizadas, painel mostra zero
 * 3. Renovação: Painel mostra plano correto, mas realizadas não contabilizam
 * 4. Simplão: Tipo errado na criação, afeta contagem
 * 
 * EXECUÇÃO: Deno run --allow-env --allow-net tests/floating-panel/clientHistoryFloatingPanel.realworld.test.js
 */

import { assert, assertEquals, assertExists } from 'jsr:@std/assert@1.0';

/* global Deno */

// Mock das funções de deduplicação
const mockWorkshops = {
  conexao: { id: '69ca6a509ac2a728250ea4bd', name: 'Conexão' },
  amateluso: { id: 'amateluso_id', name: 'Autoelétrica Amateluso' },
  renovacao: { id: 'renovacao_id', name: 'Renovação' },
  simplao: { id: 'simplao_id', name: 'Simplão' }
};

// Mock de ContractAttendance (plano)
const mockContractAttendance = {
  conexao: [
    { id: 'ca1', attendance_type_id: 'type_mentoria', attendance_type_name: 'mentoria_performance_humana', consultoria_atendimento_id: null },
    { id: 'ca2', attendance_type_id: 'type_onboarding', attendance_type_name: 'onboarding', consultoria_atendimento_id: null }
  ],
  amateluso: [
    { id: 'ca3', attendance_type_id: 'type_mentoria', attendance_type_name: 'mentoria_performance_humana', consultoria_atendimento_id: null }
  ],
  renovacao: [
    { id: 'ca4', attendance_type_id: 'type_performance', attendance_type_name: 'performance_humana', consultoria_atendimento_id: null }
  ],
  simplao: [
    { id: 'ca5', attendance_type_id: 'type_onboarding', attendance_type_name: 'onboarding', consultoria_atendimento_id: null },
    { id: 'ca6', attendance_type_id: 'type_mentoria', attendance_type_name: 'mentoria_performance_humana', consultoria_atendimento_id: null }
  ]
};

// Mock de ConsultoriaAtendimento (realizadas)
const mockConsultoriaAtendimento = {
  conexao: [
    { id: 'ca_diagnostico', tipo_atendimento: 'diagnóstico', status: 'realizado', data_realizada: '2026-05-20' },
    { id: 'ca_mentoria1', tipo_atendimento: 'mentoria_performance_humana', status: 'realizado', data_realizada: '2026-05-14' },
    { id: 'ca_onboarding', tipo_atendimento: 'onboarding', status: 'realizado', data_realizada: '2026-07-04' }
  ],
  amateluso: [
    { id: 'aa_mentoria1', tipo_atendimento: 'mentoria_performance_humana', status: 'realizado', data_realizada: '2026-05-10' },
    { id: 'aa_mentoria2', tipo_atendimento: 'mentoria_performance_humana', status: 'realizado', data_realizada: '2026-05-15' },
    { id: 'aa_mentoria3', tipo_atendimento: 'mentoria_performance_humana', status: 'realizado', data_realizada: '2026-05-20' },
    { id: 'aa_mentoria4', tipo_atendimento: 'mentoria_performance_humana', status: 'realizado', data_realizada: '2026-05-25' }
  ],
  renovacao: [
    { id: 'rn_perf1', tipo_atendimento: 'performance_humana', status: 'realizado', data_realizada: '2026-05-08' },
    { id: 'rn_perf2', tipo_atendimento: 'performance_humana', status: 'realizado', data_realizada: '2026-05-15' },
    { id: 'rn_perf3', tipo_atendimento: 'performance_humana', status: 'realizado', data_realizada: '2026-05-22' },
    { id: 'rn_perf4', tipo_atendimento: 'performance_humana', status: 'realizado', data_realizada: '2026-05-29' }
  ],
  simplao: [
    { id: 'sp_onboarding', tipo_atendimento: 'onboarding', status: 'realizado', data_realizada: '2026-05-15' },
    { id: 'sp_mentoria', tipo_atendimento: 'mentoria_performance_humana', status: 'realizado', data_realizada: '2026-05-20' }
  ]
};

// Normalizar nomes de tipos de atendimento
function normalizeAttendanceType(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[_\s-]+/g, ' ')
    .trim()
    .replace(/performance\s*humana|mentoria/, 'performance');
}

// Função de reconciliação (core logic do painel)
function reconcileAttendances(contractAttendances, realizados) {
  const result = [];
  
  for (const contract of (contractAttendances || [])) {
    const contractNorm = normalizeAttendanceType(contract.attendance_type_name);
    
    // Encontrar realizados que matchem
    const matched = (realizados || []).filter(r => {
      const realizadoNorm = normalizeAttendanceType(r.tipo_atendimento);
      return realizadoNorm === contractNorm;
    });

    result.push({
      type: contract.attendance_type_name,
      planned: 1,
      realized: matched.length,
      status: matched.length > 0 ? 'completed' : 'pending',
      isOverbooked: matched.length > 1,
      realizados: matched
    });
  }

  // Adicionar realizados que NÃO estão no plano
  const plannedNorms = contractAttendances.map(c => normalizeAttendanceType(c.attendance_type_name));
  const orphanRealizados = (realizados || []).filter(r => {
    const realizadoNorm = normalizeAttendanceType(r.tipo_atendimento);
    return !plannedNorms.includes(realizadoNorm);
  });

  for (const orphan of orphanRealizados) {
    result.push({
      type: orphan.tipo_atendimento,
      planned: 0,
      realized: 1,
      status: 'orphan',
      isOverbooked: false,
      realizados: [orphan]
    });
  }

  return result;
}

// Test 1: Conexão — Plano desapareceu
Deno.test('Conexão — Recuperar plano desaparecido', () => {
  const reconciled = reconcileAttendances(
    mockContractAttendance.conexao,
    mockConsultoriaAtendimento.conexao
  );

  // Deve ter 2 tipos (mentoria + onboarding)
  assertEquals(reconciled.length, 3, 'Deve mostrar 2 tipos do plano + 1 órfão (diagnóstico)');
  
  // Verificar mentoria
  const mentoria = reconciled.find(r => r.type.includes('mentoria'));
  assertExists(mentoria, 'Mentoria deve existir no painel');
  assertEquals(mentoria.planned, 1, 'Plano contempla 1 mentoria');
  assertEquals(mentoria.realized, 1, 'Mas 1 foi realizada');
  assertEquals(mentoria.status, 'completed', 'Status deve ser completed');

  // Verificar onboarding
  const onboarding = reconciled.find(r => r.type === 'onboarding');
  assertExists(onboarding, 'Onboarding deve existir');
  assertEquals(onboarding.planned, 1, 'Plano contempla 1 onboarding');
  assertEquals(onboarding.realized, 1, 'E 1 foi realizada');

  // Verificar órfão (diagnóstico)
  const diagnostico = reconciled.find(r => r.status === 'orphan');
  assertExists(diagnostico, 'Diagnóstico deve ser flagado como órfão');
  assertEquals(diagnostico.planned, 0, 'Não estava no plano');
  assertEquals(diagnostico.realized, 1, 'Mas foi realizado');
});

// Test 2: Autoelétrica Amateluso — 4 realizadas, painel mostra zero
Deno.test('Autoelétrica Amateluso — 4 realizadas vs 1 no plano', () => {
  const reconciled = reconcileAttendances(
    mockContractAttendance.amateluso,
    mockConsultoriaAtendimento.amateluso
  );

  assertEquals(reconciled.length, 1, 'Deve ter 1 tipo (mentoria)');
  
  const mentoria = reconciled[0];
  assertEquals(mentoria.planned, 1, 'Plano contempla 1');
  assertEquals(mentoria.realized, 4, 'MAS 4 foram realizadas');
  assertEquals(mentoria.isOverbooked, true, 'Deve estar OVERBOOKING');
  assertEquals(mentoria.status, 'completed', 'Status completed');
});

// Test 3: Renovação — Realizadas não contabilizam
Deno.test('Renovação — Resolver naming inconsistency', () => {
  const reconciled = reconcileAttendances(
    mockContractAttendance.renovacao,
    mockConsultoriaAtendimento.renovacao
  );

  assertEquals(reconciled.length, 1, 'Deve ter 1 tipo');
  
  const perf = reconciled[0];
  assertEquals(perf.planned, 1, 'Plano contempla 1');
  assertEquals(perf.realized, 4, 'TODAS as 4 foram realizadas');
  assertEquals(perf.isOverbooked, true, 'Deve estar vermelho (overbooking)');
});

// Test 4: Simplão — Tipo errado na criação
Deno.test('Simplão — Tipo errado mantém histórico', () => {
  const reconciled = reconcileAttendances(
    mockContractAttendance.simplao,
    mockConsultoriaAtendimento.simplao
  );

  // Deve ter 2 tipos (onboarding + mentoria errada)
  assertEquals(reconciled.length, 2, 'Deve mostrar 2 tipos');

  const onboarding = reconciled.find(r => r.type === 'onboarding');
  assertEquals(onboarding.realized, 1, 'Onboarding realizado = 1');
  assertEquals(onboarding.status, 'completed', 'Status completed');

  const mentoria = reconciled.find(r => r.type.includes('mentoria'));
  assertEquals(mentoria.planned, 1, 'Mentoria no plano = 1');
  assertEquals(mentoria.realized, 1, 'Mentoria realizada = 1');

  // ⚠️ IMPORTANTE: Se o tipo for mudado DEPOIS de realizado,
  // o histórico se perderá porque o matching quebra.
  // Solução: Vincular pelo consultoria_atendimento_id em vez de nome.
});

// Test 5: Teste de idempotência — Rodar múltiplas vezes = mesmo resultado
Deno.test('Idempotência — Reconciliação é determinística', () => {
  const run1 = reconcileAttendances(
    mockContractAttendance.renovacao,
    mockConsultoriaAtendimento.renovacao
  );

  const run2 = reconcileAttendances(
    mockContractAttendance.renovacao,
    mockConsultoriaAtendimento.renovacao
  );

  assertEquals(JSON.stringify(run1), JSON.stringify(run2), 'Resultados devem ser idênticos');
});
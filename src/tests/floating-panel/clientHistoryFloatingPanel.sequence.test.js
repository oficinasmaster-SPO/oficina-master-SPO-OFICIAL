/**
 * TDD Test Suite: ClientHistoryFloatingPanel — Sequência de Entrega
 * 
 * Validar que o painel exibe corretamente a ordem de prioridade dos atendimentos
 * conforme configurado em "Sequência de Entrega" do plano.
 * 
 * EXECUÇÃO: Deno run --allow-env --allow-net tests/floating-panel/clientHistoryFloatingPanel.sequence.test.js
 */

import { assert, assertEquals, assertExists } from 'jsr:@std/assert@1.0';

/* global Deno */

// Mock de PlanAttendanceRule com sequence_number
const mockPlanRules = {
  prata_plan: [
    {
      id: 'rule1',
      plan_id: 'PRATA',
      attendance_type_id: 'type_primeiro_acesso',
      attendance_type_name: 'Primeiro Acesso',
      total_allowed: 1,
      sequence_number: 1
    },
    {
      id: 'rule2',
      plan_id: 'PRATA',
      attendance_type_id: 'type_onboarding',
      attendance_type_name: 'Onboarding',
      total_allowed: 1,
      sequence_number: 2
    },
    {
      id: 'rule3',
      plan_id: 'PRATA',
      attendance_type_id: 'type_diagnostico',
      attendance_type_name: 'Diagnóstico',
      total_allowed: 1,
      sequence_number: 3
    },
    {
      id: 'rule4',
      plan_id: 'PRATA',
      attendance_type_id: 'type_mentoria',
      attendance_type_name: 'Mentoria Performance Humana',
      total_allowed: 1,
      sequence_number: 4
    }
  ]
};

// Mock de ContractAttendance (o que cliente contratou)
const mockClientContracts = {
  conexao: [
    {
      id: 'ca1',
      attendance_type_id: 'type_primeiro_acesso',
      attendance_type_name: 'Primeiro Acesso',
      sequence_number: 1,
      consultoria_atendimento_id: 'ata_first'
    },
    {
      id: 'ca2',
      attendance_type_id: 'type_onboarding',
      attendance_type_name: 'Onboarding',
      sequence_number: 2,
      consultoria_atendimento_id: null
    },
    {
      id: 'ca3',
      attendance_type_id: 'type_diagnostico',
      attendance_type_name: 'Diagnóstico',
      sequence_number: 3,
      consultoria_atendimento_id: 'ata_diag'
    },
    {
      id: 'ca4',
      attendance_type_id: 'type_mentoria',
      attendance_type_name: 'Mentoria Performance Humana',
      sequence_number: 4,
      consultoria_atendimento_id: null
    }
  ]
};

// Mock de ConsultoriaAtendimento (realizadas)
const mockRealizados = {
  conexao: [
    { id: 'ata_first', tipo_atendimento: 'Primeiro Acesso', status: 'realizado', data_realizada: '2026-05-10' },
    { id: 'ata_diag', tipo_atendimento: 'Diagnóstico', status: 'realizado', data_realizada: '2026-05-20' }
  ]
};

// Função: Enriquecer atendimentos com sequência
function enrichWithSequence(contracts, realizados) {
  const normalized = (str) => (str || '').toLowerCase().replace(/[_\s-]+/g, ' ').trim();

  return contracts.map((contract) => {
    const normalized_type = normalized(contract.attendance_type_name);
    const matched_realizados = (realizados || []).filter(r =>
      normalized(r.tipo_atendimento) === normalized_type
    );

    return {
      ...contract,
      sequence_number: contract.sequence_number || 0,
      realized: matched_realizados.length,
      is_completed: matched_realizados.length > 0,
      realizados: matched_realizados,
      // Visual status
      status: matched_realizados.length > 0 ? 'completed' : 'pending',
      sequence_display: contract.sequence_number > 0 ? `${contract.sequence_number}º` : 'sem ordem'
    };
  });
}

// Test 1: Sequência é recuperada corretamente
Deno.test('Sequência de Entrega — Ordem preservada', () => {
  const enriched = enrichWithSequence(
    mockClientContracts.conexao,
    mockRealizados.conexao
  );

  assertEquals(enriched.length, 4, 'Deve ter 4 atendimentos');
  assertEquals(enriched[0].sequence_number, 1, '1º é Primeiro Acesso');
  assertEquals(enriched[1].sequence_number, 2, '2º é Onboarding');
  assertEquals(enriched[2].sequence_number, 3, '3º é Diagnóstico');
  assertEquals(enriched[3].sequence_number, 4, '4º é Mentoria');
});

// Test 2: Display visual da sequência
Deno.test('Sequência de Entrega — Display visual', () => {
  const enriched = enrichWithSequence(
    mockClientContracts.conexao,
    mockRealizados.conexao
  );

  assertEquals(enriched[0].sequence_display, '1º', '1º display correto');
  assertEquals(enriched[1].sequence_display, '2º', '2º display correto');
  assertEquals(enriched[2].sequence_display, '3º', '3º display correto');
  assertEquals(enriched[3].sequence_display, '4º', '4º display correto');
});

// Test 3: Completadas vs Pendentes respeitando sequência
Deno.test('Sequência de Entrega — Status completadas/pendentes', () => {
  const enriched = enrichWithSequence(
    mockClientContracts.conexao,
    mockRealizados.conexao
  );

  // Esperado: 1º ✅, 2º ❌, 3º ✅, 4º ❌
  assertEquals(enriched[0].status, 'completed', '1º foi realizado');
  assertEquals(enriched[1].status, 'pending', '2º NÃO foi realizado');
  assertEquals(enriched[2].status, 'completed', '3º foi realizado');
  assertEquals(enriched[3].status, 'pending', '4º NÃO foi realizado');
});

// Test 4: Ordem de prioridade ajuda a identificar sequência esperada
Deno.test('Sequência de Entrega — Identificar próximo esperado', () => {
  const enriched = enrichWithSequence(
    mockClientContracts.conexao,
    mockRealizados.conexao
  );

  // Qual deveria ser o próximo? 2º (Onboarding)
  const pending = enriched.filter(e => e.status === 'pending');
  const nextExpected = pending.reduce((min, e) => 
    e.sequence_number < min.sequence_number ? e : min
  );

  assertEquals(nextExpected.attendance_type_name, 'Onboarding', 'Próximo deveria ser Onboarding (2º)');
  assertEquals(nextExpected.sequence_number, 2, 'Com sequence_number = 2');
});

// Test 5: Idempotência — múltiplas execuções = mesmo resultado
Deno.test('Sequência de Entrega — Idempotência', () => {
  const run1 = enrichWithSequence(
    mockClientContracts.conexao,
    mockRealizados.conexao
  );

  const run2 = enrichWithSequence(
    mockClientContracts.conexao,
    mockRealizados.conexao
  );

  assertEquals(
    JSON.stringify(run1.map(r => ({ seq: r.sequence_number, status: r.status }))),
    JSON.stringify(run2.map(r => ({ seq: r.sequence_number, status: r.status }))),
    'Resultados devem ser idênticos'
  );
});

// Test 6: Sem sequence_number = sem quebra (backward compatibility)
Deno.test('Sequência de Entrega — Backward compatibility (sem sequence_number)', () => {
  const contractsNoSeq = [
    { id: 'ca1', attendance_type_id: 'type_test', attendance_type_name: 'Teste', consultoria_atendimento_id: null }
  ];

  const enriched = enrichWithSequence(contractsNoSeq, []);

  assertEquals(enriched[0].sequence_number, 0, 'Sem sequence_number = 0');
  assertEquals(enriched[0].sequence_display, 'sem ordem', 'Display: sem ordem');
  assertEquals(enriched[0].status, 'pending', 'Status normal funciona');
});
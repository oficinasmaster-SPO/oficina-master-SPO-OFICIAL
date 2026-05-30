/**
 * TDD: ClientHistoryFloatingPanel — JOIN com PlanAttendanceRule
 * 
 * Validar que sequence_number vem de PlanAttendanceRule, não de ContractAttendance
 */

import { assert, assertEquals } from 'jsr:@std/assert@1.0';

/* global Deno */

// Mock: PlanAttendanceRule com sequências
const mockPlanRules = [
  { id: 'rule1', plan_id: 'PRATA', attendance_type_id: 'primeiro_acesso', attendance_type_name: 'Primeiro Acesso', sequence_number: 1 },
  { id: 'rule2', plan_id: 'PRATA', attendance_type_id: 'onboarding', attendance_type_name: 'Onboarding', sequence_number: 2 },
  { id: 'rule3', plan_id: 'PRATA', attendance_type_id: 'diagnostico', attendance_type_name: 'Diagnóstico', sequence_number: 3 },
  { id: 'rule4', plan_id: 'PRATA', attendance_type_id: 'mentoria_perf', attendance_type_name: 'Mentoria Performance Humana', sequence_number: 4 },
  { id: 'rule5', plan_id: 'PRATA', attendance_type_id: 'teste_perfil', attendance_type_name: 'Teste Perfil de Perfil Comportamental', sequence_number: 5 },
];

// Mock: ContractAttendance (sem sequence_number propriamente, vem do plano!)
const mockContracts = [
  { id: 'ca1', workshop_id: 'ws1', plan_id: 'PRATA', attendance_type_id: 'primeiro_acesso', attendance_type_name: 'Primeiro Acesso', consultoria_atendimento_id: 'ata1' },
  { id: 'ca2', workshop_id: 'ws1', plan_id: 'PRATA', attendance_type_id: 'onboarding', attendance_type_name: 'Onboarding', consultoria_atendimento_id: null },
  { id: 'ca3', workshop_id: 'ws1', plan_id: 'PRATA', attendance_type_id: 'diagnostico', attendance_type_name: 'Diagnóstico', consultoria_atendimento_id: 'ata3' },
  { id: 'ca4', workshop_id: 'ws1', plan_id: 'PRATA', attendance_type_id: 'mentoria_perf', attendance_type_name: 'Mentoria Performance Humana', consultoria_atendimento_id: null },
];

// Função: Enriquecer ContractAttendance com sequence_number de PlanAttendanceRule
function enrichWithPlanSequence(contracts, planRules, planId) {
  // Filtrar regras do plano
  const rulesForPlan = (planRules || []).filter(r => r.plan_id === planId);
  
  // Criar map: attendance_type_id → sequence_number
  const sequenceMap = {};
  for (const rule of rulesForPlan) {
    sequenceMap[rule.attendance_type_id] = rule.sequence_number;
  }

  // Enriquecer contracts
  return (contracts || []).map(contract => ({
    ...contract,
    sequence_number: sequenceMap[contract.attendance_type_id] || 0,
    sequence_display: sequenceMap[contract.attendance_type_id] 
      ? `${sequenceMap[contract.attendance_type_id]}º`
      : null
  }));
}

// Test 1: Recuperar sequence_number do plano
Deno.test('PlanSequenceJoin — Recuperar sequências do plano', () => {
  const enriched = enrichWithPlanSequence(mockContracts, mockPlanRules, 'PRATA');
  
  assertEquals(enriched[0].sequence_number, 1, 'Primeiro Acesso = 1º');
  assertEquals(enriched[1].sequence_number, 2, 'Onboarding = 2º');
  assertEquals(enriched[2].sequence_number, 3, 'Diagnóstico = 3º');
  assertEquals(enriched[3].sequence_number, 4, 'Mentoria Performance = 4º');
});

// Test 2: Display visual correto
Deno.test('PlanSequenceJoin — Display visual por sequence_number', () => {
  const enriched = enrichWithPlanSequence(mockContracts, mockPlanRules, 'PRATA');
  
  assertEquals(enriched[0].sequence_display, '1º');
  assertEquals(enriched[1].sequence_display, '2º');
  assertEquals(enriched[2].sequence_display, '3º');
  assertEquals(enriched[3].sequence_display, '4º');
});

// Test 3: Tipos sem regra → sem sequência
Deno.test('PlanSequenceJoin — Tipos sem regra não têm sequência', () => {
  const contractNoRule = [
    { id: 'ca99', workshop_id: 'ws1', plan_id: 'PRATA', attendance_type_id: 'tipo_inexistente', attendance_type_name: 'Tipo Inexistente', consultoria_atendimento_id: null }
  ];
  
  const enriched = enrichWithPlanSequence(contractNoRule, mockPlanRules, 'PRATA');
  
  assertEquals(enriched[0].sequence_number, 0, 'Sem regra = sequence_number 0');
  assertEquals(enriched[0].sequence_display, null, 'Sem regra = sem display');
});

// Test 4: Plano diferente → regras diferentes
Deno.test('PlanSequenceJoin — Planos diferentes têm sequências diferentes', () => {
  const bronzeRules = [
    { id: 'b1', plan_id: 'BRONZE', attendance_type_id: 'primeiro_acesso', attendance_type_name: 'Primeiro Acesso', sequence_number: 1 },
    { id: 'b2', plan_id: 'BRONZE', attendance_type_id: 'diagnostico', attendance_type_name: 'Diagnóstico', sequence_number: 2 },
  ];
  
  const allRules = [...mockPlanRules, ...bronzeRules];
  
  const prataEnriched = enrichWithPlanSequence(
    mockContracts.filter(c => c.attendance_type_id !== 'onboarding'),
    allRules,
    'PRATA'
  );
  
  const bronzeContract = [
    { id: 'ca1', workshop_id: 'ws1', plan_id: 'BRONZE', attendance_type_id: 'primeiro_acesso', attendance_type_name: 'Primeiro Acesso', consultoria_atendimento_id: null }
  ];
  
  const bronzeEnriched = enrichWithPlanSequence(bronzeContract, allRules, 'BRONZE');
  
  assertEquals(prataEnriched[0].sequence_number, 1, 'PRATA Primeiro Acesso = 1º');
  assertEquals(bronzeEnriched[0].sequence_number, 1, 'BRONZE Primeiro Acesso = 1º (mesma posição em planos diferentes)');
});

// Test 5: Ordenação após enriquecimento
Deno.test('PlanSequenceJoin — Ordenar por sequence_number após enriquecimento', () => {
  const enriched = enrichWithPlanSequence(mockContracts, mockPlanRules, 'PRATA');
  
  // Ordenar como no painel
  const sorted = enriched.sort((a, b) => {
    const aSeq = a.sequence_number || Infinity;
    const bSeq = b.sequence_number || Infinity;
    return aSeq - bSeq;
  });
  
  assertEquals(sorted[0].attendance_type_name, 'Primeiro Acesso', '1º deve ser Primeiro Acesso');
  assertEquals(sorted[1].attendance_type_name, 'Onboarding', '2º deve ser Onboarding');
  assertEquals(sorted[2].attendance_type_name, 'Diagnóstico', '3º deve ser Diagnóstico');
  assertEquals(sorted[3].attendance_type_name, 'Mentoria Performance Humana', '4º deve ser Mentoria');
});
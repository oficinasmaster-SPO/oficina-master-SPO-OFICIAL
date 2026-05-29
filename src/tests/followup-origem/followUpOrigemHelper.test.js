/**
 * TDD — Contrato do followUpOrigemHelper.js
 *
 * Rodar: node --experimental-vm-modules tests/followup-origem/followUpOrigemHelper.test.js
 * Ou com jest: jest tests/followup-origem/
 */

import {
  isTarefaBacklogFlow,
  isPedidoInternoFlow,
  isOrigemDerivadaFlow,
  getOrigemLabel,
  getOrigemBadgeStyle,
  buildFollowUpDeTarefa,
  buildFollowUpDePedido,
} from '../../utils/followUpOrigemHelper.js';

// ────────────────────────────────────────────────────────────────
// Helpers de teste minimalistas (sem dependência de framework)
// ────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FAILED: ${description}`);
    failed++;
  }
}

function describe(suite, fn) {
  console.log(`\n📋 ${suite}`);
  fn();
}

// ────────────────────────────────────────────────────────────────
// SUITE 1 — Predicados de tipo
// ────────────────────────────────────────────────────────────────
describe('isTarefaBacklogFlow', () => {
  assert('retorna true para origin_type=tarefa_backlog', isTarefaBacklogFlow({ origin_type: 'tarefa_backlog' }));
  assert('retorna false para origin_type=pedido_interno', !isTarefaBacklogFlow({ origin_type: 'pedido_interno' }));
  assert('retorna false para origin_type=suporte', !isTarefaBacklogFlow({ origin_type: 'suporte' }));
  assert('retorna false para null', !isTarefaBacklogFlow(null));
  assert('retorna false para undefined', !isTarefaBacklogFlow(undefined));
  assert('retorna false para objeto vazio', !isTarefaBacklogFlow({}));
});

describe('isPedidoInternoFlow', () => {
  assert('retorna true para origin_type=pedido_interno', isPedidoInternoFlow({ origin_type: 'pedido_interno' }));
  assert('retorna false para origin_type=tarefa_backlog', !isPedidoInternoFlow({ origin_type: 'tarefa_backlog' }));
  assert('retorna false para null', !isPedidoInternoFlow(null));
});

describe('isOrigemDerivadaFlow', () => {
  assert('true para tarefa_backlog', isOrigemDerivadaFlow({ origin_type: 'tarefa_backlog' }));
  assert('true para pedido_interno', isOrigemDerivadaFlow({ origin_type: 'pedido_interno' }));
  assert('false para suporte', !isOrigemDerivadaFlow({ origin_type: 'suporte' }));
  assert('false para ata', !isOrigemDerivadaFlow({ origin_type: 'ata' }));
  assert('false para null', !isOrigemDerivadaFlow(null));
});

// ────────────────────────────────────────────────────────────────
// SUITE 2 — Labels e estilos
// ────────────────────────────────────────────────────────────────
describe('getOrigemLabel', () => {
  assert('tarefa_backlog → "🔧 Tarefa de Backlog"', getOrigemLabel({ origin_type: 'tarefa_backlog' }) === '🔧 Tarefa de Backlog');
  assert('pedido_interno → "📩 Pedido Interno"', getOrigemLabel({ origin_type: 'pedido_interno' }) === '📩 Pedido Interno');
  assert('suporte → "🛟 Suporte"', getOrigemLabel({ origin_type: 'suporte' }) === '🛟 Suporte');
  assert('null → fallback genérico', getOrigemLabel(null) === '📋 Follow-up');
  assert('unknown → fallback genérico', getOrigemLabel({ origin_type: 'unknown_xyz' }) === '📋 Follow-up');
});

describe('getOrigemBadgeStyle', () => {
  const tarefaStyle = getOrigemBadgeStyle('tarefa_backlog');
  assert('tarefa_backlog tem bg azul', tarefaStyle.bg === 'bg-blue-100');
  assert('tarefa_backlog tem text azul', tarefaStyle.text === 'text-blue-800');

  const pedidoStyle = getOrigemBadgeStyle('pedido_interno');
  assert('pedido_interno tem bg roxo', pedidoStyle.bg === 'bg-purple-100');
  assert('pedido_interno tem text roxo', pedidoStyle.text === 'text-purple-800');

  const suporteStyle = getOrigemBadgeStyle('suporte');
  assert('suporte tem bg âmbar', suporteStyle.bg === 'bg-amber-100');

  const unknownStyle = getOrigemBadgeStyle('xyz');
  assert('desconhecido retorna fallback com bg', !!unknownStyle.bg);
});

// ────────────────────────────────────────────────────────────────
// SUITE 3 — buildFollowUpDeTarefa
// ────────────────────────────────────────────────────────────────
describe('buildFollowUpDeTarefa', () => {
  const tarefa = {
    id: 'tarefa-001',
    titulo: 'Implementar relatório DRE',
    cliente_id: 'ws-001',
    cliente_nome: 'Oficina XYZ',
    consultor_id: 'consultor-001',
    status: 'aberta',
    origem_id: 'ata-001',
    origem_titulo: 'Reunião Mensal Maio',
    atribuido_para_id: 'fulano-001',
  };

  const opts = {
    consultor_id: 'cs-001',
    consultor_nome: 'Maria CS',
    consulting_firm_id: 'firm-001',
    diasPrazo: 3,
  };

  const fu = buildFollowUpDeTarefa(tarefa, opts);

  assert('origin_type = tarefa_backlog', fu.origin_type === 'tarefa_backlog');
  assert('workshop_id vem do cliente_id', fu.workshop_id === 'ws-001');
  assert('workshop_name vem do cliente_nome', fu.workshop_name === 'Oficina XYZ');
  assert('consultor_id vem dos opts', fu.consultor_id === 'cs-001');
  assert('origem_tarefa_id = tarefa.id', fu.origem_tarefa_id === 'tarefa-001');
  assert('origem_ata_id vem do origem_id da tarefa', fu.origem_ata_id === 'ata-001');
  assert('origem_ata_titulo vem do origem_titulo da tarefa', fu.origem_ata_titulo === 'Reunião Mensal Maio');
  assert('origem_descricao = tarefa.titulo', fu.origem_descricao === 'Implementar relatório DRE');
  assert('origem_status = tarefa.status', fu.origem_status === 'aberta');
  assert('origem_responsavel_id = atribuido_para_id', fu.origem_responsavel_id === 'fulano-001');
  assert('is_completed = false', fu.is_completed === false);
  assert('sequence_number = 1', fu.sequence_number === 1);
  assert('notes contém o título da tarefa', fu.notes.includes('Implementar relatório DRE'));
  assert('consulting_firm_id propagado', fu.consulting_firm_id === 'firm-001');

  // Prazo: 3 dias à frente (string YYYY-MM-DD)
  const esperado = new Date();
  esperado.setDate(esperado.getDate() + 3);
  const esperadoStr = esperado.toISOString().split('T')[0];
  assert('reminder_date = hoje + diasPrazo', fu.reminder_date === esperadoStr);

  // Sem opts.consultor_id → usa tarefa.consultor_id como fallback
  const fu2 = buildFollowUpDeTarefa(tarefa, {});
  assert('fallback consultor_id vem da tarefa', fu2.consultor_id === 'consultor-001');
});

// ────────────────────────────────────────────────────────────────
// SUITE 4 — buildFollowUpDePedido
// ────────────────────────────────────────────────────────────────
describe('buildFollowUpDePedido', () => {
  const pedido = {
    id: 'pedido-001',
    titulo: 'Liberar acesso ao módulo financeiro',
    cliente_id: 'ws-002',
    cliente_nome: 'Oficina ABC',
    responsavel_id: 'consultor-002',
    responsavel_nome: 'João Consultor',
    solicitante_nome: 'Maria CS',
    status: 'pendente',
  };

  const opts = {
    consultor_id: 'cs-002',
    consultor_nome: 'Maria CS',
    consulting_firm_id: 'firm-001',
    diasPrazo: 5,
  };

  const fu = buildFollowUpDePedido(pedido, opts);

  assert('origin_type = pedido_interno', fu.origin_type === 'pedido_interno');
  assert('workshop_id vem do cliente_id', fu.workshop_id === 'ws-002');
  assert('workshop_name vem do cliente_nome', fu.workshop_name === 'Oficina ABC');
  assert('consultor_id vem dos opts', fu.consultor_id === 'cs-002');
  assert('origem_pedido_id = pedido.id', fu.origem_pedido_id === 'pedido-001');
  assert('origem_descricao = pedido.titulo', fu.origem_descricao === 'Liberar acesso ao módulo financeiro');
  assert('origem_status = pedido.status', fu.origem_status === 'pendente');
  assert('origem_responsavel_id = responsavel_id', fu.origem_responsavel_id === 'consultor-002');
  assert('origem_responsavel_nome = responsavel_nome', fu.origem_responsavel_nome === 'João Consultor');
  assert('origem_solicitante_nome = solicitante_nome', fu.origem_solicitante_nome === 'Maria CS');
  assert('is_completed = false', fu.is_completed === false);
  assert('notes contém título do pedido', fu.notes.includes('Liberar acesso'));
  assert('origem_ata_id = null (pedidos não têm ata direta)', fu.origem_ata_id === null);

  const prazoEsperado = new Date();
  prazoEsperado.setDate(prazoEsperado.getDate() + 5);
  const prazoStr = prazoEsperado.toISOString().split('T')[0];
  assert('reminder_date = hoje + diasPrazo (5)', fu.reminder_date === prazoStr);

  // Fallback: sem opts.consultor_id → usa pedido.responsavel_id
  const fu2 = buildFollowUpDePedido(pedido, {});
  assert('fallback consultor_id vem do responsavel_id', fu2.consultor_id === 'consultor-002');
});

// ────────────────────────────────────────────────────────────────
// SUITE 5 — Regressão: não quebra funções de suporte existentes
// ────────────────────────────────────────────────────────────────
describe('Regressão: suporteHelper não foi afetado', async () => {
  try {
    const { isSuporteFlow, gerarSuporteId, buildSuporteFULocal } = await import('../../utils/suporteHelper.js');

    assert('isSuporteFlow ainda funciona para suporte', isSuporteFlow({ origin_type: 'suporte' }));
    assert('isSuporteFlow retorna false para tarefa_backlog', !isSuporteFlow({ origin_type: 'tarefa_backlog' }));
    assert('isSuporteFlow retorna false para pedido_interno', !isSuporteFlow({ origin_type: 'pedido_interno' }));

    const id = gerarSuporteId();
    assert('gerarSuporteId retorna string com prefixo SUP-', id.startsWith('SUP-'));

    const fu = buildSuporteFULocal({ id: 'u1', full_name: 'Test' }, { id: 'ws1', name: 'WS' });
    assert('buildSuporteFULocal origin_type = suporte', fu.origin_type === 'suporte');
    assert('buildSuporteFULocal tem _isSuporteLocal = true', fu._isSuporteLocal === true);
  } catch (e) {
    assert(`suporteHelper importado sem erro: ${e.message}`, false);
  }
});

// ────────────────────────────────────────────────────────────────
// SUITE 6 — Regressão: bugs corrigidos (não devem regredir)
// ────────────────────────────────────────────────────────────────
describe('Regressão bugs corrigidos', () => {
  // BUG-1: criarFollowUpDeOrigem retornava 500 em vez de 404 para IDs inválidos
  // Garantido no helper: buildFollowUpDeTarefa/buildFollowUpDePedido nunca lançam
  // exceção para inputs válidos; o handler fica responsável pela busca.
  // Aqui validamos que os builders retornam objeto com origin_type correto mesmo
  // com campos mínimos obrigatórios.
  const tarefaMinima = { id: 't1', titulo: 'T', cliente_id: 'ws1', consultor_id: 'c1', status: 'aberta' };
  const pedidoMinimo = { id: 'p1', titulo: 'P', cliente_id: 'ws1', responsavel_id: 'r1', status: 'pendente' };

  const fuT = buildFollowUpDeTarefa(tarefaMinima, {});
  assert('buildFollowUpDeTarefa não lança para tarefa mínima', fuT !== null && fuT !== undefined);
  assert('tarefa mínima: origin_type correto', fuT.origin_type === 'tarefa_backlog');
  assert('tarefa mínima: workshop_id mapeado', fuT.workshop_id === 'ws1');

  const fuP = buildFollowUpDePedido(pedidoMinimo, {});
  assert('buildFollowUpDePedido não lança para pedido mínimo', fuP !== null && fuP !== undefined);
  assert('pedido mínimo: origin_type correto', fuP.origin_type === 'pedido_interno');

  // BUG-2: OrigemDerivadaBanner — statusAtual não resetava ao mudar de followUp
  // O reset agora depende de followUp.origem_status (prop), então o estado inicial
  // deve refletir o valor da prop, não um estado stale anterior.
  // Garantimos que os helpers retornam origem_status correto para ambos builders:
  assert('tarefa: origem_status = "aberta"', fuT.origem_status === 'aberta');
  assert('pedido: origem_status = "pendente"', fuP.origem_status === 'pendente');

  // Tarefa sem status explícito → fallback 'aberta'
  const tarefaSemStatus = { id: 't2', titulo: 'T2', cliente_id: 'ws2', consultor_id: 'c2' };
  const fuSemStatus = buildFollowUpDeTarefa(tarefaSemStatus, {});
  assert('tarefa sem status → fallback "aberta"', fuSemStatus.origem_status === 'aberta');

  // BUG-3: consulting_firm_id ausente — os builders já aceitam consulting_firm_id nos opts
  const fuComFirm = buildFollowUpDeTarefa(tarefaMinima, { consulting_firm_id: 'firm-xyz' });
  assert('consulting_firm_id propagado pelo builder', fuComFirm.consulting_firm_id === 'firm-xyz');

  const fuSemFirm = buildFollowUpDeTarefa(tarefaMinima, {});
  assert('consulting_firm_id é null quando não fornecido', fuSemFirm.consulting_firm_id === null);
});

// ────────────────────────────────────────────────────────────────
// RESULTADO FINAL
// ────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Resultado: ${passed} passaram, ${failed} falharam`);
if (failed > 0) {
  console.error('❌ Testes com falha — revisar antes de prosseguir.');
} else {
  console.log('✅ Todos os testes passaram!');
}
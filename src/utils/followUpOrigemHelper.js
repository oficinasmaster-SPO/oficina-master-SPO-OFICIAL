/**
 * followUpOrigemHelper.js — Funções puras para follow-ups de origem Tarefa/Pedido.
 *
 * 100% testável sem React, sem banco de dados.
 * Usado por IniciarAtendimentoModal, FollowUpsTab e automations.
 */

/**
 * Retorna true se o followUp é de origem tarefa_backlog.
 * @param {Object|null} followUp
 */
export function isTarefaBacklogFlow(followUp) {
  return followUp?.origin_type === 'tarefa_backlog';
}

/**
 * Retorna true se o followUp é de origem pedido_interno.
 * @param {Object|null} followUp
 */
export function isPedidoInternoFlow(followUp) {
  return followUp?.origin_type === 'pedido_interno';
}

/**
 * Retorna true se o followUp é de qualquer origem derivada (tarefa ou pedido).
 * @param {Object|null} followUp
 */
export function isOrigemDerivadaFlow(followUp) {
  return isTarefaBacklogFlow(followUp) || isPedidoInternoFlow(followUp);
}

/**
 * Retorna o label legível da origem do follow-up.
 * @param {Object|null} followUp
 * @returns {string}
 */
export function getOrigemLabel(followUp) {
  const map = {
    tarefa_backlog: '🔧 Tarefa de Backlog',
    pedido_interno: '📩 Pedido Interno',
    suporte: '🛟 Suporte',
    suporte_checkin: '🔔 Check-in de Suporte',
    sprint: '⚡ Sprint',
    ata: '📄 ATA',
    manual: '✏️ Manual',
    guarda_chuva: '☂️ Preventivo',
  };
  return map[followUp?.origin_type] || '📋 Follow-up';
}

/**
 * Retorna a cor de badge para o origin_type.
 * @param {string} originType
 * @returns {{ bg: string, text: string, border: string }}
 */
export function getOrigemBadgeStyle(originType) {
  const styles = {
    tarefa_backlog: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    pedido_interno: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    suporte: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-400' },
    suporte_checkin: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
    sprint: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
    ata: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  };
  return styles[originType] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
}

/**
 * Monta o objeto base de FollowUpReminder a partir de uma TarefaBacklog.
 * Não salva no BD — apenas estrutura os dados.
 *
 * @param {Object} tarefa - TarefaBacklog
 * @param {Object} opts
 * @param {string} opts.consultor_id
 * @param {string} opts.consultor_nome
 * @param {string} opts.consulting_firm_id
 * @param {number} [opts.diasPrazo=3] - dias até o lembrete
 * @returns {Object}
 */
export function buildFollowUpDeTarefa(tarefa, opts = {}) {
  const { consultor_id, consultor_nome, consulting_firm_id, diasPrazo = 3 } = opts;
  const prazo = new Date();
  prazo.setDate(prazo.getDate() + diasPrazo);
  const prazoStr = prazo.toISOString().split('T')[0];

  return {
    workshop_id: tarefa.cliente_id,
    workshop_name: tarefa.cliente_nome || null,
    consultor_id: consultor_id || tarefa.consultor_id,
    consultor_nome: consultor_nome || tarefa.consultor_nome || null,
    reminder_date: prazoStr,
    sequence_number: 1,
    origin_type: 'tarefa_backlog',
    origem_tarefa_id: tarefa.id,
    origem_ata_id: tarefa.origem_id || null,
    origem_ata_titulo: tarefa.origem_titulo || null,
    origem_descricao: tarefa.titulo || null,
    origem_status: tarefa.status || 'aberta',
    origem_responsavel_id: tarefa.atribuido_para_id || tarefa.consultor_id || null,
    origem_responsavel_nome: null,
    origem_solicitante_nome: null,
    is_completed: false,
    notes: `Follow-up de tarefa: ${tarefa.titulo || ''}`,
    consulting_firm_id: consulting_firm_id || null,
  };
}

/**
 * Monta o objeto base de FollowUpReminder a partir de um PedidoInterno.
 * Não salva no BD — apenas estrutura os dados.
 *
 * @param {Object} pedido - PedidoInterno
 * @param {Object} opts
 * @param {string} opts.consultor_id
 * @param {string} opts.consultor_nome
 * @param {string} opts.consulting_firm_id
 * @param {number} [opts.diasPrazo=3]
 * @returns {Object}
 */
export function buildFollowUpDePedido(pedido, opts = {}) {
  const { consultor_id, consultor_nome, consulting_firm_id, diasPrazo = 3 } = opts;
  const prazo = new Date();
  prazo.setDate(prazo.getDate() + diasPrazo);
  const prazoStr = prazo.toISOString().split('T')[0];

  return {
    workshop_id: pedido.cliente_id,
    workshop_name: pedido.cliente_nome || null,
    consultor_id: consultor_id || pedido.responsavel_id,
    consultor_nome: consultor_nome || pedido.responsavel_nome || null,
    reminder_date: prazoStr,
    sequence_number: 1,
    origin_type: 'pedido_interno',
    origem_pedido_id: pedido.id,
    origem_ata_id: null,
    origem_ata_titulo: null,
    origem_descricao: pedido.titulo || null,
    origem_status: pedido.status || 'pendente',
    origem_responsavel_id: pedido.responsavel_id || null,
    origem_responsavel_nome: pedido.responsavel_nome || null,
    origem_solicitante_nome: pedido.solicitante_nome || null,
    is_completed: false,
    notes: `Follow-up de pedido interno: ${pedido.titulo || ''}`,
    consulting_firm_id: consulting_firm_id || null,
  };
}
/**
 * suporteHelper.js — Funções puras para o fluxo de Suporte Rápido.
 *
 * 100% testável sem React, sem banco de dados.
 * Usado por IniciarAtendimentoModal, ControleAceleracaoView e FollowUpsTab.
 */

/**
 * Retorna true se o followUp é um fluxo de suporte (suporte ou suporte_checkin).
 * @param {Object|null} followUp
 */
export function isSuporteFlow(followUp) {
  return (
    followUp?.origin_type === 'suporte' ||
    followUp?.origin_type === 'suporte_checkin'
  );
}

/**
 * Gera um ID de suporte rastreável.
 * @returns {string} e.g. "SUP-1748546123456-AB3XY"
 */
export function gerarSuporteId() {
  const ts = Date.now();
  const rand = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `SUP-${ts}-${rand}`;
}

/**
 * Constrói o objeto de FollowUp local de suporte (não salvo no BD ainda).
 * Recebe user e dados opcionais do workshop.
 *
 * @param {{ id: string, full_name?: string, data?: { consulting_firm_id?: string } }} user
 * @param {{ id?: string, name?: string }} [workshop]
 * @returns {Object} followUp sintético com _isSuporteLocal = true
 */
export function buildSuporteFULocal(user, workshop = {}) {
  const suporteId = gerarSuporteId();
  const hoje = new Date().toISOString().split('T')[0];

  return {
    id: `suporte_${workshop.id || 'novo'}_${Date.now()}`,
    workshop_id: workshop.id || null,
    workshop_name: workshop.name || null,
    consultor_id: user?.id || null,
    consultor_nome: user?.full_name || 'Consultor',
    sequence_number: 0,
    reminder_date: hoje,
    origin_type: 'suporte',
    suporte_id: suporteId,
    suporte_descricao: '',
    is_completed: false,
    atendimento_id: null,
    ata_id: null,
    notes: `Suporte ao Cliente · ${suporteId}`,
    consulting_firm_id: user?.data?.consulting_firm_id || null,
    _isSuporteLocal: true,
  };
}
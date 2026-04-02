/**
 * Utilitários de fuso horário para o sistema Oficinas Master
 * Fuso padrão: America/Sao_Paulo (GMT-3)
 */

const TIMEZONE = 'America/Sao_Paulo';

/**
 * Formata uma data para exibição no fuso horário de Brasília
 * @param {string|Date} date - Data a ser formatada
 * @param {object} options - Opções de formatação do Intl.DateTimeFormat
 * @returns {string} Data formatada
 */
export function formatDateBR(date, options = {}) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const defaultOptions = {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  };
  
  return d.toLocaleDateString('pt-BR', defaultOptions);
}

/**
 * Formata data e hora no fuso de Brasília
 * @param {string|Date} date 
 * @param {boolean} showSeconds
 * @returns {string}
 */
export function formatDateTimeBR(date, showSeconds = false) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const options = {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds ? { second: '2-digit' } : {}),
    hour12: false,
  };
  
  return d.toLocaleString('pt-BR', options);
}

/**
 * Formata apenas a hora no fuso de Brasília
 * @param {string|Date} date 
 * @returns {string} ex: "14:30"
 */
export function formatTimeBR(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleTimeString('pt-BR', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Retorna um objeto Date ajustado para o fuso de Brasília
 * Útil para comparações e cálculos
 * @param {string|Date} date 
 * @returns {Date}
 */
export function toBrazilDate(date) {
  if (!date) return new Date();
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  // Cria uma string no fuso de Brasília e re-parseia
  const brString = d.toLocaleString('en-US', { timeZone: TIMEZONE });
  return new Date(brString);
}

/**
 * Retorna a data/hora atual no fuso de Brasília como string ISO
 * @returns {string} ex: "2026-04-02T09:30:00"
 */
export function nowBrazilISO() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  
  const get = (type) => parts.find(p => p.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}

/**
 * Retorna a data atual no fuso de Brasília (YYYY-MM-DD)
 * @returns {string}
 */
export function todayBrazil() {
  return nowBrazilISO().split('T')[0];
}

/**
 * Retorna o mês atual no fuso de Brasília (YYYY-MM)
 * @returns {string}
 */
export function currentMonthBrazil() {
  return todayBrazil().substring(0, 7);
}

export { TIMEZONE };
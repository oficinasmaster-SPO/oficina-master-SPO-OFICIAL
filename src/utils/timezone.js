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
 * Retorna um objeto Date ajustado para o fuso de Brasília.
 * IMPORTANTE: O Date retornado tem os campos getHours/getDate/etc. correspondendo
 * ao horário de Brasília (útil para extrair hora/data local sem perda de fuso).
 * @param {string|Date} date 
 * @returns {Date}
 */
export function toBrazilDate(date) {
  if (!date) return new Date();
  // Se a string não tem offset explícito (ex: "2026-05-22T11:00:00" sem Z ou +/-),
  // trata como horário de Brasília (UTC-3) para compatibilidade com registros antigos.
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(date) && !date.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(date)) {
    // Registro legado sem timezone — assume BRT (UTC-3)
    return new Date(date + '-03:00');
  }
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  // Cria uma string no fuso de Brasília e re-parseia para ter getHours() correto
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

/**
 * Converte input do usuário (data local BRT) para ISO UTC antes de salvar.
 * Ex: parseBrazilDate("2026-05-22", "11:00") → "2026-05-22T14:00:00.000Z"
 * @param {string} dateStr  "YYYY-MM-DD"
 * @param {string} timeStr  "HH:MM" (opcional, default "00:00")
 * @returns {string} ISO UTC
 */
export function parseBrazilDate(dateStr, timeStr = '00:00') {
  if (!dateStr) return '';
  const localStr = `${dateStr}T${timeStr}:00`;
  return new Date(localStr + '-03:00').toISOString();
}

/**
 * Parse seguro de qualquer string de data.
 * - Com Z/offset → UTC direto
 * - Legado sem TZ → assume BRT (UTC-3)
 * - Date-only → ancora ao meio-dia BRT (evita -1 dia)
 * @param {string|Date|null} raw
 * @returns {Date|null}
 */
export function safeParseDate(raw) {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T15:00:00.000Z');
  if (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s + '-03:00');
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Parse seguro de valores date-only ("YYYY-MM-DD").
 * Ancora ao meio-dia BRT (15:00 UTC) para evitar o bug de -1 dia.
 * @param {string|null} dateOnly
 * @returns {Date|null}
 */
export function safeDateOnlyParse(dateOnly) {
  if (!dateOnly) return null;
  const s = String(dateOnly).trim();
  if (s.includes('T')) return safeParseDate(s);
  return new Date(s + 'T15:00:00.000Z');
}

/**
 * Parse de data UTC — alias explícito para clareza semântica.
 * @param {string|null} isoUtc
 * @returns {Date|null}
 */
export function parseUTCDate(isoUtc) {
  if (!isoUtc) return null;
  const d = new Date(isoUtc);
  return isNaN(d.getTime()) ? null : d;
}

export { TIMEZONE };
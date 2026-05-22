/**
 * tzUtils.js — Shared timezone utilities for ALL Deno backend functions.
 * Standard: UTC storage, America/Sao_Paulo display (UTC-3).
 *
 * RULES:
 *  - All dates stored in DB must be ISO8601 UTC: "2026-05-22T14:00:00.000Z"
 *  - Legacy dates without offset ("2026-05-22T11:00:00") are assumed BRT (UTC-3)
 *  - Date-only values ("2026-05-30") are anchored at noon BRT → 15:00 UTC to avoid day-shift
 */

const BRT_OFFSET_MS = -3 * 60 * 60 * 1000; // UTC-3

/**
 * Normalizes any date string to a proper UTC Date object.
 * - With 'Z' or explicit offset → parse directly (correct UTC)
 * - Legacy without timezone ("2026-05-22T11:00:00") → treat as BRT (UTC-3) → convert to UTC
 * - Date-only ("2026-05-30") → noon BRT = 15:00 UTC to avoid day-shift bugs
 * @param {string|Date|null} raw
 * @returns {Date|null}
 */
export function normalizeLegacyDate(raw) {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;

  const s = String(raw).trim();

  // Date-only: "2026-05-30" — anchor at noon BRT (15:00 UTC) to avoid -1 day bug
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(s + 'T15:00:00.000Z');
  }

  // Has explicit Z or offset → parse directly as UTC
  if (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  // Legacy without timezone ("2026-05-22T11:00:00") → assume BRT (UTC-3)
  const d = new Date(s + '-03:00');
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Alias for normalizeLegacyDate — semantically clear for date-only inputs.
 * Always anchors at noon BRT (15:00 UTC) to prevent day-shift.
 * @param {string|null} dateOnly  e.g. "2026-05-30"
 * @returns {Date|null}
 */
export function safeDateOnlyParse(dateOnly) {
  if (!dateOnly) return null;
  const s = String(dateOnly).trim();
  // If already has time component, normalize normally
  if (s.includes('T')) return normalizeLegacyDate(s);
  return new Date(s + 'T15:00:00.000Z');
}

/**
 * Formats a UTC Date to a human-readable string in America/Sao_Paulo.
 * @param {Date|string|null} date
 * @param {boolean} includeTime
 * @returns {string}  e.g. "22/05/2026 11:00" or "22/05/2026"
 */
export function formatBRT(date, includeTime = true) {
  const d = normalizeLegacyDate(date);
  if (!d) return '';
  const opts = {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {})
  };
  return d.toLocaleString('pt-BR', opts);
}

/**
 * Extracts "HH:MM" in BRT from any date value.
 * Replaces the broken: date.split('T')[1].slice(0, 5)
 * @param {string|Date|null} date
 * @returns {string}  e.g. "11:00"
 */
export function extractTimeBRT(date) {
  const d = normalizeLegacyDate(date);
  if (!d) return '';
  return d.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
}

/**
 * Extracts "YYYY-MM-DD" in BRT from any date value.
 * Replaces the broken: date.split('T')[0]
 * @param {string|Date|null} date
 * @returns {string}  e.g. "2026-05-22"
 */
export function extractDateBRT(date) {
  const d = normalizeLegacyDate(date);
  if (!d) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d);
  const get = (t) => parts.find(p => p.type === t)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Adds N calendar days to a date, keeping correct UTC value.
 * Safe replacement for setDate() arithmetic on legacy dates.
 * @param {string|Date|null} date
 * @param {number} days
 * @returns {Date|null}
 */
export function addDays(date, days) {
  const d = normalizeLegacyDate(date);
  if (!d) return null;
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}
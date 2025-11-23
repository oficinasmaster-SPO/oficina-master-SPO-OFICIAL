// Formatadores de números para padrão brasileiro

/**
 * Formata número como moeda brasileira
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado como R$ 1.234,56
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/**
 * Formata número com separadores brasileiros
 * @param {number} value - Valor a ser formatado
 * @param {number} decimals - Número de casas decimais (padrão: 2)
 * @returns {string} Valor formatado como 1.234,56
 */
export const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

/**
 * Formata percentual
 * @param {number} value - Valor a ser formatado
 * @param {number} decimals - Número de casas decimais (padrão: 1)
 * @returns {string} Valor formatado como 12,5%
 */
export const formatPercent = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return "0%";
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value) + '%';
};

/**
 * Formata número inteiro (sem decimais)
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado como 1.234
 */
export const formatInteger = (value) => {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Remove formatação e converte para número
 * @param {string} value - Valor formatado
 * @returns {number} Número sem formatação
 */
export const parseFormattedNumber = (value) => {
  if (!value) return 0;
  const cleaned = String(value)
    .replace(/\./g, '') // Remove pontos de milhar
    .replace(',', '.'); // Troca vírgula por ponto
  return parseFloat(cleaned) || 0;
};
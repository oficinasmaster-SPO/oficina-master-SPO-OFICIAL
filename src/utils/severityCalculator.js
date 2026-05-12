/**
 * Calcula o nível de severidade de uma demanda
 * @param {string} type - 'sprint' | 'pedido' | 'tarefa' | 'cronograma'
 * @param {string} dateStr - Data de prazo/vencimento
 * @param {number} daysOverdue - (opcional) Dias vencidos
 * @param {number} progressPercentage - (opcional) Porcentagem de progresso
 * @returns {{ level: 'RED' | 'YELLOW' | 'GRAY', reason: string }}
 */
export function calculateSeverity(type, dateStr, daysOverdue = 0, progressPercentage = 0) {
  if (!dateStr) {
    return { level: 'GRAY', reason: 'Sem data definida' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

  // RED: Vencido OU vence hoje OU > 3 dias atrasado
  if (daysDiff < 0 || daysDiff === 0) {
    const absdays = Math.abs(daysDiff);
    return {
      level: 'RED',
      reason: daysDiff < 0 ? `${absdays} dias atrasado` : 'Vence hoje'
    };
  }

  if (daysOverdue > 3) {
    return {
      level: 'RED',
      reason: `${daysOverdue} dias atrasado`
    };
  }

  // YELLOW: Vence em 1-2 dias
  if (daysDiff >= 1 && daysDiff <= 2) {
    return {
      level: 'YELLOW',
      reason: `Vence em ${daysDiff} dia${daysDiff > 1 ? 's' : ''}`
    };
  }

  // GRAY: Normal
  return {
    level: 'GRAY',
    reason: `Vence em ${daysDiff} dias`
  };
}

/**
 * Converte severidade para cor CSS
 */
export function getSeverityColor(level) {
  const colors = {
    RED: '#ef4444',
    YELLOW: '#eab308',
    GRAY: '#9ca3af'
  };
  return colors[level] || colors.GRAY;
}

/**
 * Converte severidade para badge classe Tailwind
 */
export function getSeverityBadgeClass(level) {
  const classes = {
    RED: 'bg-red-100 text-red-800 border-red-300',
    YELLOW: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    GRAY: 'bg-gray-100 text-gray-800 border-gray-300'
  };
  return classes[level] || classes.GRAY;
}

/**
 * Converte severidade para ícone emoji
 */
export function getSeverityIcon(level) {
  const icons = {
    RED: '🔴',
    YELLOW: '🟡',
    GRAY: '⚪'
  };
  return icons[level] || icons.GRAY;
}

/**
 * Ordena demands por severidade (RED primeiro, depois YELLOW, depois GRAY)
 */
export function sortByServerity(demands) {
  const severityOrder = { RED: 0, YELLOW: 1, GRAY: 2 };
  return [...demands].sort((a, b) => {
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
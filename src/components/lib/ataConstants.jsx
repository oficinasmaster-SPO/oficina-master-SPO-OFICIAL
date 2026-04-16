// Status de ATA (MeetingMinutes)
export const ATA_STATUS = {
  RASCUNHO: 'rascunho',
  EM_ANDAMENTO: 'em_andamento',
  FINALIZADA: 'finalizada'
};

export const ATA_STATUS_LABELS = {
  [ATA_STATUS.RASCUNHO]: 'Rascunho',
  [ATA_STATUS.EM_ANDAMENTO]: 'Em Andamento',
  [ATA_STATUS.FINALIZADA]: 'Finalizada'
};

export const ATA_STATUS_COLORS = {
  [ATA_STATUS.RASCUNHO]: 'bg-gray-100 text-gray-800 border-gray-300',
  [ATA_STATUS.EM_ANDAMENTO]: 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse',
  [ATA_STATUS.FINALIZADA]: 'bg-green-100 text-green-800 border-green-300'
};

// Status de Atendimento (ConsultoriaAtendimento)
export const ATENDIMENTO_STATUS = {
  AGENDADO: 'agendado',
  CONFIRMADO: 'confirmado',
  PARTICIPANDO: 'participando',
  REALIZADO: 'realizado',
  CONCLUIDO: 'concluido',
  CANCELADO: 'cancelado',
  FALTOU: 'faltou',
  ATRASADO: 'atrasado',
  REAGENDADO: 'reagendado',
  A_REALIZAR: 'a_realizar'
};

export const ATENDIMENTO_STATUS_LABELS = {
  [ATENDIMENTO_STATUS.AGENDADO]: 'Agendado',
  [ATENDIMENTO_STATUS.CONFIRMADO]: 'Confirmado',
  [ATENDIMENTO_STATUS.PARTICIPANDO]: 'Participando',
  [ATENDIMENTO_STATUS.REALIZADO]: '! Realizado',
  [ATENDIMENTO_STATUS.CONCLUIDO]: 'Concluído',
  [ATENDIMENTO_STATUS.CANCELADO]: 'Cancelado',
  [ATENDIMENTO_STATUS.FALTOU]: 'Faltou',
  [ATENDIMENTO_STATUS.ATRASADO]: 'Atrasado',
  [ATENDIMENTO_STATUS.REAGENDADO]: 'Reagendado',
  [ATENDIMENTO_STATUS.A_REALIZAR]: 'A Realizar'
};

export const ATENDIMENTO_STATUS_COLORS = {
  [ATENDIMENTO_STATUS.AGENDADO]: 'bg-red-100 text-red-800 border-red-300',
  [ATENDIMENTO_STATUS.CONFIRMADO]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  [ATENDIMENTO_STATUS.PARTICIPANDO]: 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse',
  [ATENDIMENTO_STATUS.REALIZADO]: 'bg-amber-100 text-amber-700 border-amber-300 animate-pulse',
  [ATENDIMENTO_STATUS.CONCLUIDO]: 'bg-green-100 text-green-800 border-green-300',
  [ATENDIMENTO_STATUS.CANCELADO]: 'bg-gray-200 text-gray-700 border-gray-400',
  [ATENDIMENTO_STATUS.FALTOU]: 'bg-orange-100 text-orange-800 border-orange-300',
  [ATENDIMENTO_STATUS.ATRASADO]: 'bg-red-500 text-white border-red-700 animate-pulse',
  [ATENDIMENTO_STATUS.REAGENDADO]: 'bg-purple-100 text-purple-800 border-purple-300',
  [ATENDIMENTO_STATUS.A_REALIZAR]: 'bg-indigo-100 text-indigo-800 border-indigo-300'
};

// Cores hex para gráficos (consistente com os badges)
export const ATENDIMENTO_STATUS_CHART_COLORS = {
  [ATENDIMENTO_STATUS.AGENDADO]: '#dc2626',
  [ATENDIMENTO_STATUS.CONFIRMADO]: '#ca8a04',
  [ATENDIMENTO_STATUS.PARTICIPANDO]: '#2563eb',
  [ATENDIMENTO_STATUS.REALIZADO]: '#b45309',
  [ATENDIMENTO_STATUS.CONCLUIDO]: '#16a34a',
  [ATENDIMENTO_STATUS.CANCELADO]: '#6b7280',
  [ATENDIMENTO_STATUS.FALTOU]: '#ea580c',
  [ATENDIMENTO_STATUS.ATRASADO]: '#ef4444',
  [ATENDIMENTO_STATUS.REAGENDADO]: '#9333ea',
  [ATENDIMENTO_STATUS.A_REALIZAR]: '#4f46e5'
};

// Tipos de aceleração
export const TIPO_ACELERACAO = {
  MENSAL: 'mensal',
  QUINZENAL: 'quinzenal',
  SEMANAL: 'semanal',
  PONTUAL: 'pontual',
  EMERGENCIAL: 'emergencial'
};

export const TIPO_ACELERACAO_LABELS = {
  [TIPO_ACELERACAO.MENSAL]: 'Mensal',
  [TIPO_ACELERACAO.QUINZENAL]: 'Quinzenal',
  [TIPO_ACELERACAO.SEMANAL]: 'Semanal',
  [TIPO_ACELERACAO.PONTUAL]: 'Pontual',
  [TIPO_ACELERACAO.EMERGENCIAL]: 'Emergencial'
};
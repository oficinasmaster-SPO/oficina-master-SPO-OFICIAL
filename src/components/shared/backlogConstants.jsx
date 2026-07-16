/**
 * backlogConstants.jsx
 * Centraliza todas as configurações de labels, cores e ícones
 * para o domínio Service Desk (PedidoInterno + TarefaBacklog).
 */

// ── TarefaBacklog Status ──
export const TAREFA_STATUS_CONFIG = {
  aberta:             { label: "Aberta",              className: "bg-gray-100 text-gray-800" },
  em_execucao:        { label: "Em Execução",          className: "bg-blue-100 text-blue-800" },
  aguardando_cliente: { label: "Aguardando Cliente",  className: "bg-amber-100 text-amber-800" },
  bloqueada:          { label: "Bloqueada",           className: "bg-red-100 text-red-800" },
  concluida:          { label: "Concluída",           className: "bg-green-100 text-green-800" },
};

// ── PedidoInterno Status ──
export const PEDIDO_STATUS_CONFIG = {
  pendente:   { label: "Pendente",    className: "bg-gray-100 text-gray-800" },
  em_analise: { label: "Em Análise",  className: "bg-blue-100 text-blue-800" },
  aprovado:   { label: "Aprovado",   className: "bg-green-100 text-green-800" },
  recusado:   { label: "Recusado",   className: "bg-red-100 text-red-800" },
  concluido:  { label: "Concluído",  className: "bg-purple-100 text-purple-800" },
};

// ── Prioridade (comum a Pedido e Tarefa) ──
export const PRIORIDADE_CONFIG = {
  baixa:   { label: "Baixa",   className: "bg-blue-100 text-blue-800" },
  media:   { label: "Média",   className: "bg-yellow-100 text-yellow-800" },
  alta:    { label: "Alta",    className: "bg-orange-100 text-orange-800" },
  critica: { label: "Crítica", className: "bg-red-100 text-red-800" },
};

// ── Origin Type (TarefaBacklog) ──
export const ORIGIN_LABELS = {
  reuniao:     'Reunião',
  contrato:    'Contrato',
  pedido:      'Pedido',
  diagnostico: 'Diagnóstico',
  manual:      'Manual',
  followup:    'Follow-up',
  cronograma:  'Cronograma',
  consultoria: 'Consultoria',
  automacao:   'Automação',
  projeto:     'Projeto',
};

// ── Tipo de Pedido Interno ──
export const TIPO_PEDIDO_LABELS = {
  apoio_tecnico:       "Apoio Técnico",
  decisao_estrategica: "Decisão Estratégica",
  liberacao_material:  "Liberação de Material",
  excecao_escopo:      "Exceção de Escopo",
  outros:              "Outros",
};

// ── Impacto (TarefaBacklog) ──
export const IMPACTO_CONFIG = {
  financeiro:  "Financeiro",
  entrega:     "Entrega",
  satisfacao:  "Satisfação",
  multiplo:    "Múltiplo",
};

// ── Impacto Cliente (PedidoInterno) ──
export const IMPACTO_CLIENTE_LABELS = {
  nenhum:  "Nenhum",
  baixo:   "Baixo",
  medio:   "Médio",
  alto:    "Alto",
  critico: "Crítico",
};

// ── Opções para Selects ──
export const ORIGIN_OPTIONS = Object.entries(ORIGIN_LABELS).map(([value, label]) => ({ value, label }));
export const PRIORIDADE_OPTIONS = Object.entries(PRIORIDADE_CONFIG).map(([value, { label }]) => ({ value, label }));
export const TAREFA_STATUS_OPTIONS = Object.entries(TAREFA_STATUS_CONFIG).map(([value, { label }]) => ({ value, label }));
export const PEDIDO_STATUS_OPTIONS = Object.entries(PEDIDO_STATUS_CONFIG).map(([value, { label }]) => ({ value, label }));
export const TIPO_PEDIDO_OPTIONS = Object.entries(TIPO_PEDIDO_LABELS).map(([value, label]) => ({ value, label }));
export const IMPACTO_OPTIONS = Object.entries(IMPACTO_CONFIG).map(([value, label]) => ({ value, label }));
export const IMPACTO_CLIENTE_OPTIONS = Object.entries(IMPACTO_CLIENTE_LABELS).map(([value, label]) => ({ value, label }));
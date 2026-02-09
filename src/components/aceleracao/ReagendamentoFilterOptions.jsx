
// Constantes para filtros de reagendamento
export const STATUS_POS_VENDA = {
  cancelada_cliente_reagendada: "Cancelada pelo cliente (reagendada)",
  cancelada_cliente_sem_reagendar: "Cancelada pelo cliente (sem reagendar)",
  cancelada_empresa_reagendada: "Cancelada por nós (reagendada)",
  cancelada_empresa_sem_reagendar: "Cancelada por nós (sem reagendar)",
  no_show_cliente: "No-show do cliente",
  no_show_empresa: "No-show nosso",
  suspensa_impedimento_cliente: "Suspensa por impedimento do cliente",
  pausada_risco_conflito: "Pausada por risco / conflito"
};

export const MOTIVOS_CLIENTE = {
  impedimento_decisor: "Impedimento do decisor",
  time_nao_disponivel: "Time não disponível / operação em incêndio",
  sem_preparo_entregaveis: "Sem preparo / sem entregáveis",
  perda_senso_urgencia: "Perda de senso de urgência",
  ficcao_com_entrega: "Fricção com a entrega",
  problema_financeiro_administrativo: "Problema financeiro/administrativo",
  mudanca_estrategia: "Mudança de estratégia"
};

export const MOTIVOS_EMPRESA = {
  falha_confirmacao_cs: "Falha de confirmação/CS",
  falha_agenda_conflito: "Falha de agenda / conflito interno",
  entrega_nao_pronta: "Entrega não pronta",
  problema_tecnico: "Problema técnico",
  mudanca_escopo_roteiro: "Mudança de escopo/roteiro"
};

export const RESPONSABILIDADE_OPTIONS = {
  cliente: "Cliente",
  empresa: "Empresa",
  compartilhada: "Compartilhada"
};

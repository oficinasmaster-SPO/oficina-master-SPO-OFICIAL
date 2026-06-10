// Catálogo canônico de perfis externos do SPO.
// Atualizar aqui quando um novo perfil canônico for aprovado e criado no Base44.
// Nunca adicionar perfis de uso interno (equipe Oficinas Master) nesta lista.

export const CANONICAL_PROFILE_JOB_ROLES = [
  // Gestão
  'socio',
  'diretor',
  'gerente',
  'supervisor_loja',
  // Especialistas
  'rh',
  'financeiro',
  'administrativo',
  'lider_tecnico',
  // Vendas e Atendimento
  'comercial',
  'consultor_vendas',
  'marketing',
  // Operacional
  'tecnico',
  'eletricista',
  'funilaria_pintura',
  'estoque',
  'motoboy',
  'lavador',
  'outros',
  // Internos Oficinas Master
  'consultor',
];

// IDs fixos dos perfis canônicos em produção.
// Usados nos testes de prevenção para validar o catálogo.
// ATENÇÃO: estes IDs são verificados contra o banco — não inventar IDs.
// Fonte de verdade: auditoria de 2026-06-09 via Base44 MCP.
export const CANONICAL_PROFILE_IDS = [
  '6a285fc9f76402dd73736656', // Financeiro - Controle Financeiro
  '6a272f99aaeffc72c503fa5e', // Marketing - Comunicação e Marketing
  '6a272f96bc6eedd434194fcf', // Comercial - Vendas e Atendimento
  '6a272f91b92f3d2dfe6344be', // Supervisor - Operação e Equipe  ← corrigido (era 634421)
  '6a272f8ea3fa8dd02ca7350e', // Sócio - Acesso Total
  '6a272f8a983951dfc5cf3493', // Diretor - Gestão Estratégica
  '6a272f8976cba10c3232779a', // Gerente - Gestão Operacional    ← adicionado (estava ausente)
  '6a272f883b2162c800073ace', // RH - Gestão de Pessoas
  '6a272f876b16129b2f5f31be', // Técnico - Acesso Operacional
  '6a272f85fc4b85767f964421', // Líder Técnico - Coordenação Técnica
];

// TABELA CANÔNICA OFICIAL
// Mapeamento job_role → profile_name para pré-seleção automática no cadastro.
// Todos os perfis referenciados aqui DEVEM existir no banco (validados em 2026-06-09).
// Cargos operacionais (tecnico, eletricista, funilaria, lavador, motoboy, estoque)
// mapeiam para "Técnico - Acesso Operacional" — o perfil com acesso operacional mínimo.
// Isso é intencional: cargo RH ≠ perfil RBAC. Um mecânico não precisa de um perfil "Mecânico".
export const CANONICAL_PROFILE_MAPPING = {
  // Gestão
  "socio":           "Sócio - Acesso Total",
  "diretor":         "Diretor - Gestão Estratégica",
  "gerente":         "Gerente - Gestão Operacional",
  "supervisor_loja": "Supervisor - Operação e Equipe",
  // Especialistas
  "rh":              "RH - Gestão de Pessoas",
  "financeiro":      "Financeiro - Controle Financeiro",
  "administrativo":  "Financeiro - Controle Financeiro",
  "lider_tecnico":   "Líder Técnico - Coordenação Técnica",
  // Vendas e Atendimento
  "comercial":       "Comercial - Vendas e Atendimento",
  "consultor_vendas":"Técnico - Acesso Operacional",
  "marketing":       "Marketing - Comunicação e Marketing",
  // Operacional (todos com acesso mínimo operacional)
  "tecnico":         "Técnico - Acesso Operacional",
  "eletricista":     "Técnico - Acesso Operacional",
  "funilaria_pintura":"Técnico - Acesso Operacional",
  "estoque":         "Técnico - Acesso Operacional",
  "motoboy":         "Técnico - Acesso Operacional",
  "lavador":         "Técnico - Acesso Operacional",
  "outros":          "Técnico - Acesso Operacional",
  // Internos (equipe Oficinas Master)
  "consultor":       "Consultor",
};

// Helper function para buscar o perfil canônico por job_role
export const getCanonicalProfileByJobRole = (jobRole) => {
  return CANONICAL_PROFILE_MAPPING[jobRole] || null;
};

// Helper function para verificar se job_role é canônico
export const isCanonicalJobRole = (jobRole) => {
  return Object.keys(CANONICAL_PROFILE_MAPPING).includes(jobRole);
};
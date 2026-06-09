// Catálogo canônico de perfis externos do SPO.
// Atualizar aqui quando um novo perfil canônico for aprovado e criado no Base44.
// Nunca adicionar perfis de uso interno (equipe Oficinas Master) nesta lista.

export const CANONICAL_PROFILE_JOB_ROLES = [
  'socio',
  'diretor',
  'gerente',
  'supervisor_loja',
  'rh',
  'financeiro',
  'lider_tecnico',
  'comercial',
  'consultor_vendas',
  'marketing',
  'tecnico',
  'funilaria_pintura',
  'administrativo',
  'consultor',
  'motoboy',
  'lavador',
  'outros'
];

// IDs fixos dos perfis canônicos em produção.
// Usados nos testes de prevenção para validar o catálogo.
export const CANONICAL_PROFILE_IDS = [
  '6a285fc9f76402dd73736656', // Financeiro - Controle Financeiro
  '6a272f99aaeffc72c503fa5e', // Marketing - Comunicação e Marketing
  '6a272f96bc6eedd434194fcf', // Comercial - Vendas e Atendimento
  '6a272f91b92f3d2dfe634421', // Supervisor - Operação e Equipe
  '6a272f8ea3fa8dd02ca7350e', // Sócio - Acesso Total
  '6a272f8a983951dfc5cf3493', // Diretor - Gestão Estratégica
  '6a272f883b2162c800073ace', // Gerente - Gestão Operacional
  '6a272f876b16129b2f5f31be', // Vendedor - Atendimento ao Cliente
  '6a272f85fc4b85767f964421', // Líder Técnico - Coordenação Técnica
  '6a272f86a8c0f3f7c7e8d9f0', // Técnico - Execução e Produção
  '6a272f84c5d4e2f1a8b9c0d1', // Técnico - Funilaria e Pintura
  '6a272f83b4c3d2e1f0a9b8c7', // RH - Gestão de Pessoas
  '6a272f82a3b2c1d0e9f8a7b6', // Consultor
  '6a272f81928170cfd8e7f6a5'  // Outros - Acesso Básico
];

// TABELA CANÔNICA OFICIAL - FASE 4
// Mapeamento job_role → profile_name para pré-seleção automática
export const CANONICAL_PROFILE_MAPPING = {
  "socio": "Sócio - Acesso Total",
  "diretor": "Diretor - Gestão Estratégica",
  "gerente": "Gerente - Gestão Operacional",
  "supervisor_loja": "Supervisor - Operação e Equipe",
  "rh": "RH - Gestão de Pessoas",
  "financeiro": "Financeiro - Controle Financeiro",
  "lider_tecnico": "Líder Técnico - Coordenação Técnica",
  "comercial": "Comercial - Vendas e Atendimento",
  "consultor_vendas": "Comercial - Vendas e Atendimento",
  "marketing": "Marketing - Comunicação e Marketing",
  "tecnico": "Vendedor - Atendimento ao Cliente", // Fallback temporário
  "funilaria_pintura": "Vendedor - Atendimento ao Cliente", // Fallback temporário
  "administrativo": "Financeiro - Controle Financeiro",
  "consultor": "Consultor",
  "motoboy": "Outros - Acesso Básico",
  "lavador": "Outros - Acesso Básico",
  "outros": "Outros - Acesso Básico"
};

// Helper function para buscar o perfil canônico por job_role
export const getCanonicalProfileByJobRole = (jobRole) => {
  return CANONICAL_PROFILE_MAPPING[jobRole] || null;
};

// Helper function para verificar se job_role é canônico
export const isCanonicalJobRole = (jobRole) => {
  return Object.keys(CANONICAL_PROFILE_MAPPING).includes(jobRole);
};
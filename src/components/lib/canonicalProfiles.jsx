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
  'marketing'
];

// IDs fixos dos perfis canônicos em produção.
// Usados nos testes de prevenção para validar o catálogo.
export const CANONICAL_PROFILE_IDS = [
  '6a285fc9f76402dd73736656', // Financeiro - Controle Financeiro
  '6a272f99aaeffc72c503fa5e', // Marketing - Comunicação e Marketing
  '6a272f96bc6eedd434194fcf', // Comercial - Vendas e Atendimento
  '6a272f91b92f3d2dfe6344be', // Supervisor - Operação e Equipe
  '6a272f8ea3fa8dd02ca7350e', // Sócio - Acesso Total
  '6a272f8a983951dfc5cf3493', // Diretor - Gestão Estratégica
  '6a272f8976cba10c3232779a', // Gerente - Gestão Operacional
  '6a272f883b2162c800073ace', // RH - Gestão de Pessoas
  '6a272f876b16129b2f5f31be', // Vendedor - Atendimento ao Cliente
  '6a272f85fc4b85767f964421'  // Líder Técnico - Coordenação Técnica
];
// Admin System (6a22c57de89710633100737d) excluído intencionalmente — uso interno.
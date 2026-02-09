// Funções específicas do sistema - sincronizado com Employee entity
// IMPORTANTE: Manter sincronizado com o enum job_role da entidade Employee
export const jobRoles = [
  // Gestão
  { value: "socio", label: "Sócio", category: "gestao" },
  { value: "diretor", label: "Diretor", category: "gestao" },
  { value: "supervisor_loja", label: "Supervisor de Loja", category: "gestao" },
  { value: "gerente", label: "Gerente", category: "gestao" },

  // Operacional
  { value: "lider_tecnico", label: "Líder Técnico", category: "operacional" },
  { value: "tecnico", label: "Técnico", category: "operacional" },
  { value: "funilaria_pintura", label: "Funilaria/Pintura", category: "operacional" },
  { value: "estoque", label: "Estoque", category: "operacional" },
  { value: "motoboy", label: "Motoboy", category: "operacional" },
  { value: "lavador", label: "Lavador", category: "operacional" },

  // Vendas
  { value: "comercial", label: "Comercial", category: "vendas" },
  { value: "consultor_vendas", label: "Consultor de Vendas", category: "vendas" },
  { value: "closer", label: "Closer", category: "vendas" },
  { value: "marketing", label: "Marketing", category: "vendas" },

  // Administrativo
  { value: "financeiro", label: "Financeiro", category: "administrativo" },
  { value: "rh", label: "RH", category: "administrativo" },
  { value: "administrativo", label: "Administrativo", category: "administrativo" },

  // Consultoria (Funções Internas)
  { value: "acelerador", label: "Acelerador", category: "consultoria" },
  { value: "consultor", label: "Consultor", category: "consultoria" },

  // Outros
  { value: "outros", label: "Outros", category: "outros" }
];

export const jobRoleCategories = {
  gestao: { label: "Gestão", color: "bg-purple-100 text-purple-700" },
  operacional: { label: "Operacional", color: "bg-blue-100 text-blue-700" },
  vendas: { label: "Vendas", color: "bg-green-100 text-green-700" },
  administrativo: { label: "Administrativo", color: "bg-yellow-100 text-yellow-700" },
  consultoria: { label: "Consultoria", color: "bg-orange-100 text-orange-700" },
  outros: { label: "Outros", color: "bg-gray-100 text-gray-700" }
};
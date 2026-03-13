// Funções específicas do sistema - sincronizado com Employee entity
// IMPORTANTE: Manter sincronizado com o enum job_role da entidade Employee
export const jobRoles = [
  // Gestão
  { value: "socio", label: "Sócio", category: "gestao", level: "executive" },
  { value: "diretor", label: "Diretor", category: "gestao", level: "executive" },
  { value: "supervisor_loja", label: "Supervisor de Loja", category: "gestao", level: "management" },
  { value: "gerente", label: "Gerente", category: "gestao", level: "management" },
  
  // Operacional
  { value: "lider_tecnico", label: "Líder Técnico", category: "operacional", level: "coordination" },
  { value: "tecnico", label: "Técnico", category: "operacional", level: "operational" },
  { value: "funilaria_pintura", label: "Funilaria e Pintura", category: "operacional", level: "operational" },
  { value: "estoque", label: "Estoque", category: "operacional", level: "operational" },
  { value: "motoboy", label: "Motoboy", category: "operacional", level: "support" },
  { value: "lavador", label: "Lavador", category: "operacional", level: "support" },
  
  // Vendas
  { value: "comercial", label: "Comercial", category: "vendas", level: "specialist" },
  { value: "consultor_vendas", label: "Consultor de Vendas", category: "vendas", level: "specialist" },
  { value: "marketing", label: "Marketing", category: "vendas", level: "specialist" },
  
  // Administrativo
  { value: "financeiro", label: "Financeiro", category: "administrativo", level: "specialist" },
  { value: "rh", label: "Recursos Humanos", category: "administrativo", level: "specialist" },
  { value: "administrativo", label: "Administrativo", category: "administrativo", level: "support" },
  
  // Funções Internas (Platform Owner Only)
  { value: "acelerador", label: "Acelerador", category: "interna", level: "consultoria" },
  { value: "consultor", label: "Consultor", category: "interna", level: "consultoria" },
  { value: "mentor", label: "Mentor", category: "interna", level: "consultoria" },
  
  // Outros
  { value: "outros", label: "Outros", category: "outros", level: "support" }
];

export const jobRoleCategories = {
  gestao: { label: "Gestão", color: "bg-purple-100 text-purple-700" },
  operacional: { label: "Operacional", color: "bg-blue-100 text-blue-700" },
  vendas: { label: "Vendas", color: "bg-green-100 text-green-700" },
  administrativo: { label: "Administrativo", color: "bg-yellow-100 text-yellow-700" },
  interna: { label: "Funções Internas", color: "bg-orange-100 text-orange-700" },
  outros: { label: "Outros", color: "bg-gray-100 text-gray-700" }
};
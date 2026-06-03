// Funções específicas do sistema - sincronizado com Employee entity
// IMPORTANTE: Manter sincronizado com o enum job_role da entidade Employee
export const jobRoles = [
  // Gestão
  { id: "socio", value: "socio", label: "Sócio / Proprietário", category: "gestao", level: "executive", description: "Dono ou co-proprietário da oficina. Acesso total ao sistema e às métricas estratégicas." },
  { id: "socio_interno", value: "socio_interno", label: "Sócio Interno", category: "gestao", level: "executive", description: "Sócio com atuação interna na operação." },
  { id: "diretor", value: "diretor", label: "Diretor", category: "gestao", level: "executive", description: "Responsável pelas decisões estratégicas, expansão do negócio e representação institucional." },
  { id: "supervisor_loja", value: "supervisor_loja", label: "Supervisor de Loja", category: "gestao", level: "management", description: "Supervisiona as operações diárias da loja e atendimento." },
  { id: "gerente", value: "gerente", label: "Gerente", category: "gestao", level: "management", description: "Lidera a equipe operacional, monitora KPIs, define metas e garante a qualidade dos processos." },
  
  // Operacional
  { id: "lider_tecnico", value: "lider_tecnico", label: "Líder Técnico", category: "operacional", level: "coordination", description: "Coordena a equipe técnica, valida diagnósticos complexos e treina novos mecânicos." },
  { id: "mecanico", value: "tecnico", label: "Mecânico / Técnico", category: "operacional", level: "operational", description: "Responsável pela manutenção e reparo de veículos. Executa diagnósticos mecânicos, troca de peças e revisões preventivas." },
  { id: "funileiro", value: "funilaria_pintura", label: "Funileiro / Pintor", category: "operacional", level: "operational", description: "Especialista em reparos de carroceria. Realiza amassados, soldas e restauração estrutural de veículos." },
  { id: "eletricista", value: "eletricista", label: "Eletricista Automotivo", category: "operacional", level: "operational", description: "Atua no diagnóstico e reparo de sistemas elétricos e eletrônicos dos veículos." },
  { id: "estoque", value: "estoque", label: "Estoque", category: "operacional", level: "operational", description: "Gestão de peças, inventário e suprimentos da oficina." },
  { id: "motoboy", value: "motoboy", label: "Motoboy", category: "operacional", level: "support", description: "Serviços de entrega e busca de peças ou documentos." },
  { id: "lavador", value: "lavador", label: "Lavador", category: "operacional", level: "support", description: "Limpeza e estética dos veículos após os serviços." },
  
  // Vendas
  { id: "telemarketing", value: "comercial", label: "Comercial / Telemarketing", category: "vendas", level: "specialist", description: "Responsável por prospecção ativa, contato com clientes e recuperação de veículos." },
  { id: "consultor_vendas", value: "consultor_vendas", label: "Consultor de Vendas", category: "vendas", level: "specialist", description: "Responsável pelo atendimento ao cliente, abertura de ordens de serviço e negociação de serviços." },
  { id: "marketing", value: "marketing", label: "Marketing", category: "vendas", level: "specialist", description: "Criação de campanhas, gestão de redes sociais e atração de clientes." },
  
  // Administrativo
  { id: "financeiro", value: "financeiro", label: "Financeiro", category: "administrativo", level: "specialist", description: "Responsável pelo controle financeiro, contas a pagar/receber, fluxo de caixa e relatórios." },
  { id: "rh", value: "rh", label: "Recursos Humanos", category: "administrativo", level: "specialist", description: "Gestão de pessoas, recrutamento, folha de pagamento e clima organizacional." },
  { id: "administrativo", value: "administrativo", label: "Administrativo", category: "administrativo", level: "support", description: "Suporte à gestão operacional, atendimento, documentação e processos internos." },
  
  // Funções Internas (Platform Owner Only)
  { id: "acelerador", value: "acelerador", label: "Acelerador", category: "interna", level: "consultoria", description: "Aceleração de resultados e mentoria." },
  { id: "consultor", value: "consultor", label: "Consultor", category: "interna", level: "consultoria", description: "Consultoria especializada para a oficina." },
  { id: "mentor", value: "mentor", label: "Mentor", category: "interna", level: "consultoria", description: "Mentoria estratégica." },
  
  // Outros
  { id: "outros", value: "outros", label: "Outros", category: "outros", level: "support", description: "Cargo não listado. Definir manualmente." }
];

export const jobRoleCategories = {
  gestao:        { label: "Gestão",           color: "bg-purple-100 text-purple-700" },
  operacional:   { label: "Operacional",      color: "bg-blue-100 text-blue-700" },
  vendas:        { label: "Vendas",           color: "bg-green-100 text-green-700" },
  administrativo:{ label: "Administrativo",   color: "bg-yellow-100 text-yellow-700" },
  interna:       { label: "Funções Internas", color: "bg-orange-100 text-orange-700" },
  outros:        { label: "Outros",           color: "bg-gray-100 text-gray-700" }
};

// ─── LISTAS DERIVADAS — fonte única de verdade para guards de acesso ──────────
// Importar estas constantes em vez de definir arrays hardcoded em cada componente.
// Exemplo: import { LEADER_JOB_ROLES } from '@/components/lib/jobRoles';

/** Roles com poder de liderança/gestão dentro de uma oficina cliente.
 *  Podem ver resultados de outros colaboradores, aprovar avaliações, etc. */
export const LEADER_JOB_ROLES = jobRoles
  .filter(r => ["executive", "management", "coordination"].includes(r.level))
  .map(r => r.value);
// → ["socio", "socio_interno", "diretor", "supervisor_loja", "gerente", "lider_tecnico"]

/** Roles com acesso a dados financeiros (DRE, DFC, salários). */
export const FINANCIAL_JOB_ROLES = jobRoles
  .filter(r => ["executive", "management"].includes(r.level) || r.value === "financeiro")
  .map(r => r.value);
// → ["socio", "socio_interno", "diretor", "supervisor_loja", "gerente", "financeiro"]

/** Roles que podem gerenciar documentos e advertências. */
export const MANAGER_JOB_ROLES = jobRoles
  .filter(r => ["executive", "management"].includes(r.level))
  .map(r => r.value);
// → ["socio", "socio_interno", "diretor", "supervisor_loja", "gerente"]

/** Roles que podem gerenciar RH (documentos, contratações, demissões). */
export const HR_MANAGER_JOB_ROLES = [
  ...jobRoles.filter(r => ["executive", "management"].includes(r.level)).map(r => r.value),
  "rh"
];
// → ["socio", "socio_interno", "diretor", "supervisor_loja", "gerente", "rh"]

/** Roles exclusivamente internas da Oficinas Master (não são clientes). */
export const INTERNAL_JOB_ROLES = jobRoles
  .filter(r => r.category === "interna")
  .map(r => r.value);
// → ["acelerador", "consultor", "mentor"]

/** Roles de módulo RH com acesso ao Portal do Colaborador — aba Equipe. */
export const TEAM_PORTAL_JOB_ROLES = jobRoles
  .filter(r => ["executive", "management", "coordination"].includes(r.level) || r.value === "rh")
  .map(r => r.value);
// → ["socio", "socio_interno", "diretor", "supervisor_loja", "gerente", "lider_tecnico", "rh"]

/** Helper: retorna o label de um job_role pelo value. */
export function getJobRoleLabel(value) {
  return jobRoles.find(r => r.value === value)?.label ?? value;
}

/** Helper: retorna a categoria de um job_role pelo value. */
export function getJobRoleCategory(value) {
  return jobRoles.find(r => r.value === value)?.category ?? "outros";
}
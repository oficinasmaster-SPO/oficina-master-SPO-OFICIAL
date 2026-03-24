// Funções específicas do sistema - sincronizado com Employee entity
// IMPORTANTE: Manter sincronizado com o enum job_role da entidade Employee
export const jobRoles = [
  // Gestão
  { value: "socio", label: "Sócio / Proprietário", category: "gestao", level: "executive", description: "Dono ou co-proprietário da oficina. Acesso total ao sistema e às métricas estratégicas." },
  { value: "socio_interno", label: "Sócio Interno", category: "gestao", level: "executive", description: "Sócio com atuação interna na operação." },
  { value: "diretor", label: "Diretor", category: "gestao", level: "executive", description: "Responsável pelas decisões estratégicas, expansão do negócio e representação institucional." },
  { value: "supervisor_loja", label: "Supervisor de Loja", category: "gestao", level: "management", description: "Supervisiona as operações diárias da loja e atendimento." },
  { value: "gerente", label: "Gerente", category: "gestao", level: "management", description: "Lidera a equipe operacional, monitora KPIs, define metas e garante a qualidade dos processos." },
  
  // Operacional
  { value: "lider_tecnico", label: "Líder Técnico", category: "operacional", level: "coordination", description: "Coordena a equipe técnica, valida diagnósticos complexos e treina novos mecânicos." },
  { value: "tecnico", label: "Mecânico / Técnico", category: "operacional", level: "operational", description: "Responsável pela manutenção e reparo de veículos. Executa diagnósticos mecânicos, troca de peças e revisões preventivas." },
  { value: "funilaria_pintura", label: "Funileiro / Pintor", category: "operacional", level: "operational", description: "Especialista em reparos de carroceria. Realiza amassados, soldas e restauração estrutural de veículos." },
  { value: "eletricista", label: "Eletricista Automotivo", category: "operacional", level: "operational", description: "Atua no diagnóstico e reparo de sistemas elétricos e eletrônicos dos veículos." },
  { value: "estoque", label: "Estoque", category: "operacional", level: "operational", description: "Gestão de peças, inventário e suprimentos da oficina." },
  { value: "motoboy", label: "Motoboy", category: "operacional", level: "support", description: "Serviços de entrega e busca de peças ou documentos." },
  { value: "lavador", label: "Lavador", category: "operacional", level: "support", description: "Limpeza e estética dos veículos após os serviços." },
  
  // Vendas
  { value: "comercial", label: "Comercial / Telemarketing", category: "vendas", level: "specialist", description: "Responsável por prospecção ativa, contato com clientes e recuperação de veículos." },
  { value: "consultor_vendas", label: "Consultor de Vendas", category: "vendas", level: "specialist", description: "Responsável pelo atendimento ao cliente, abertura de ordens de serviço e negociação de serviços." },
  { value: "marketing", label: "Marketing", category: "vendas", level: "specialist", description: "Criação de campanhas, gestão de redes sociais e atração de clientes." },
  
  // Administrativo
  { value: "financeiro", label: "Financeiro", category: "administrativo", level: "specialist", description: "Responsável pelo controle financeiro, contas a pagar/receber, fluxo de caixa e relatórios." },
  { value: "rh", label: "Recursos Humanos", category: "administrativo", level: "specialist", description: "Gestão de pessoas, recrutamento, folha de pagamento e clima organizacional." },
  { value: "administrativo", label: "Administrativo", category: "administrativo", level: "support", description: "Suporte à gestão operacional, atendimento, documentação e processos internos." },
  
  // Funções Internas (Platform Owner Only)
  { value: "acelerador", label: "Acelerador", category: "interna", level: "consultoria", description: "Aceleração de resultados e mentoria." },
  { value: "consultor", label: "Consultor", category: "interna", level: "consultoria", description: "Consultoria especializada para a oficina." },
  { value: "mentor", label: "Mentor", category: "interna", level: "consultoria", description: "Mentoria estratégica." },
  
  // Outros
  { value: "outros", label: "Outros", category: "outros", level: "support", description: "Cargo não listado. Definir manualmente." }
];

export const jobRoleCategories = {
  gestao: { label: "Gestão", color: "bg-purple-100 text-purple-700" },
  operacional: { label: "Operacional", color: "bg-blue-100 text-blue-700" },
  vendas: { label: "Vendas", color: "bg-green-100 text-green-700" },
  administrativo: { label: "Administrativo", color: "bg-yellow-100 text-yellow-700" },
  interna: { label: "Funções Internas", color: "bg-orange-100 text-orange-700" },
  outros: { label: "Outros", color: "bg-gray-100 text-gray-700" }
};
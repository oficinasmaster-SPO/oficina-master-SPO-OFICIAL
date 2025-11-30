import { 
  Home, 
  TrendingUp, 
  Users, 
  FileText, 
  Target, 
  Settings, 
  BarChart2, 
  Calculator, 
  Trophy, 
  ListTodo, 
  Bell, 
  Package, 
  ClipboardList, 
  Calendar, 
  MessageSquare,
  Video,
  Shield,
  Wrench, 
  Filter, 
  UserPlus,
  Building2,
  BrainCircuit,
  Sparkles,
  BookOpen
} from "lucide-react";
import { createPageUrl } from "@/utils";

// Definição dos grupos de navegação
export const MENU_GROUPS = {
  DASHBOARD: 'Dashboard & KPIs',
  OPERATIONAL: 'Operacional',
  COMMERCIAL: 'Comercial',
  FINANCIAL: 'Financeiro',
  PEOPLE: 'Pessoas & RH',
  CULTURE: 'Cultura',
  CONFIG: 'Configurações'
};

// Definição de todos os itens de menu disponíveis
const ALL_MENUS = {
  // Globais / Comuns
  HOME: { name: 'Início', href: createPageUrl('Home'), icon: Home, description: 'Visão Geral' },
  IA_ANALYTICS_GESTAO: { name: 'IA Analytics', href: createPageUrl('IAAnalyticsGestao'), icon: BrainCircuit, description: 'Insights Táticos' },
  IA_ANALYTICS_OPERACIONAL: { name: 'IA Analytics', href: createPageUrl('IAAnalyticsOperacional'), icon: Sparkles, description: 'Assistente Operacional' },
  CULTURE: { name: 'Manual da Cultura', href: createPageUrl('ManualCultura'), icon: BookOpen, description: 'Identidade e Normas' },
  NOTIFICATIONS: { name: 'Notificações', href: createPageUrl('Notificacoes'), icon: Bell, description: 'Alertas' },
  TASKS: { name: 'Minhas Tarefas', href: createPageUrl('Tarefas'), icon: ListTodo, description: 'Gestão de atividades' },
  MY_OS: { name: 'Minhas OS/Checklists', href: createPageUrl('HomeOperacional'), icon: ClipboardList, description: 'Ordens de Serviço' },
  
  // Diretor / Gerente
  DRE: { name: 'DRE & TCMP²', href: createPageUrl('DRETCMP2'), icon: Calculator, description: 'Financeiro Estratégico' },
  GENERAL_DASHBOARD: { name: 'Dashboard Nacional', href: createPageUrl('Dashboard'), icon: TrendingUp, description: 'Visão Macro' },
  WORKSHOP_MANAGEMENT: { name: 'Gestão da Oficina', href: createPageUrl('GestaoOficina'), icon: Settings, description: 'Configuração Geral' },
  TEAM_MANAGEMENT: { name: 'Colaboradores', href: createPageUrl('Colaboradores'), icon: Users, description: 'Gestão de Equipe' },
  GOALS: { name: 'Metas', href: createPageUrl('HistoricoMetas'), icon: Target, description: 'Metas da Empresa' },
  
  // Operacional Técnico
  TECHNICAL_HOME: { name: 'Painel Técnico', href: createPageUrl('HomeOperacional'), icon: Wrench, description: 'Visão Técnica' },
  GAMIFICATION: { name: 'Meus Desafios & XP', href: createPageUrl('Gamificacao'), icon: Trophy, description: 'Minhas Conquistas' },
  FEEDBACKS: { name: 'Meus Feedbacks', href: createPageUrl('ResultadoDesempenho'), icon: MessageSquare, description: 'Avaliações' },
  
  // Comercial
  LEADS: { name: 'Leads & Funil', href: createPageUrl('AutoavaliacaoComercial'), icon: Filter, description: 'Gestão de Vendas' },
  SALES_TRAINING: { name: 'Treinamento Vendas', href: createPageUrl('TreinamentoVendas'), icon: Video, description: 'Capacitação' },
  
  // Financeiro
  FINANCIAL_REPORTS: { name: 'Relatórios Financeiros', href: createPageUrl('DiagnosticoEndividamento'), icon: BarChart2, description: 'Análises' },
  
  // Estoque
  INVENTORY: { name: 'Estoque', href: createPageUrl('Home'), icon: Package, description: 'Controle de Peças' },
  
  // RH
  RECRUITMENT: { name: 'Recrutamento', href: createPageUrl('ConvidarColaborador'), icon: UserPlus, description: 'Novos Colaboradores' },
  EVALUATIONS: { name: 'Avaliações', href: createPageUrl('Historico'), icon: FileText, description: 'DISC, Desempenho' },
  
  // Administrativo
  DOCUMENTS: { name: 'Documentos', href: createPageUrl('Home'), icon: FileText, description: 'Arquivos e Contratos' },
  AGENDA: { name: 'Agenda', href: createPageUrl('Home'), icon: Calendar, description: 'Compromissos' },
  
  // Admin/Master (Mantidos)
  ADMIN_PLANS: { name: 'Gerenciar Planos', href: createPageUrl('GerenciarPlanos'), icon: Shield, description: 'Admin Only', adminOnly: true },
  ADMIN_CLIENTS: { name: 'Gestão de Clientes', href: createPageUrl('AdminClientes'), icon: Users, description: 'Admin Only', adminOnly: true },
  ADMIN_MASTER: { name: 'Tela Master', href: createPageUrl('AdminMaster'), icon: Building2, description: 'Admin Only', adminOnly: true },
};

// Configuração de Menus por Função
export const ROLE_MENUS = {
  // Diretor / Sócio (Visão Completa)
  diretor: [
    { group: MENU_GROUPS.DASHBOARD, items: [ALL_MENUS.HOME, ALL_MENUS.IA_ANALYTICS_GESTAO, ALL_MENUS.GENERAL_DASHBOARD, ALL_MENUS.GOALS] },
    { group: MENU_GROUPS.FINANCIAL, items: [ALL_MENUS.DRE, ALL_MENUS.FINANCIAL_REPORTS] },
    { group: MENU_GROUPS.PEOPLE, items: [ALL_MENUS.TEAM_MANAGEMENT, ALL_MENUS.EVALUATIONS, ALL_MENUS.RECRUITMENT] },
    { group: MENU_GROUPS.CULTURE, items: [ALL_MENUS.CULTURE] },
    { group: MENU_GROUPS.CONFIG, items: [ALL_MENUS.WORKSHOP_MANAGEMENT] }
  ],
  
  // Gerente (Visão Operacional Ampla)
  gerente: [
    { group: MENU_GROUPS.OPERATIONAL, items: [ALL_MENUS.HOME, ALL_MENUS.IA_ANALYTICS_GESTAO, ALL_MENUS.TASKS, ALL_MENUS.MY_OS] },
    { group: MENU_GROUPS.PEOPLE, items: [ALL_MENUS.TEAM_MANAGEMENT, ALL_MENUS.FEEDBACKS] },
    { group: MENU_GROUPS.COMMERCIAL, items: [ALL_MENUS.LEADS] },
    { group: MENU_GROUPS.CULTURE, items: [ALL_MENUS.CULTURE] }
  ],

  // Líder Técnico
  lider_tecnico: [
    { group: MENU_GROUPS.OPERATIONAL, items: [ALL_MENUS.TECHNICAL_HOME, ALL_MENUS.IA_ANALYTICS_OPERACIONAL, ALL_MENUS.TASKS, ALL_MENUS.MY_OS] },
    { group: MENU_GROUPS.PEOPLE, items: [ALL_MENUS.TEAM_MANAGEMENT] }, // Filtrado para operacional
    { group: MENU_GROUPS.CULTURE, items: [ALL_MENUS.CULTURE] }
  ],

  // Operacionais (Técnicos, Pintores, etc)
  operacional: [
    { group: MENU_GROUPS.OPERATIONAL, items: [ALL_MENUS.TECHNICAL_HOME, ALL_MENUS.IA_ANALYTICS_OPERACIONAL, ALL_MENUS.TASKS, ALL_MENUS.MY_OS] },
    { group: MENU_GROUPS.DASHBOARD, items: [ALL_MENUS.GAMIFICATION] },
    { group: MENU_GROUPS.CULTURE, items: [ALL_MENUS.CULTURE] }
  ],

  // Comercial
  comercial: [
    { group: MENU_GROUPS.COMMERCIAL, items: [ALL_MENUS.HOME, ALL_MENUS.IA_ANALYTICS_OPERACIONAL, ALL_MENUS.LEADS, ALL_MENUS.TASKS, ALL_MENUS.SALES_TRAINING] },
    { group: MENU_GROUPS.DASHBOARD, items: [ALL_MENUS.GAMIFICATION] },
    { group: MENU_GROUPS.CULTURE, items: [ALL_MENUS.CULTURE] }
  ],

  // Financeiro
  financeiro: [
    { group: MENU_GROUPS.FINANCIAL, items: [ALL_MENUS.HOME, ALL_MENUS.IA_ANALYTICS_OPERACIONAL, ALL_MENUS.DRE, ALL_MENUS.FINANCIAL_REPORTS] },
    { group: MENU_GROUPS.OPERATIONAL, items: [ALL_MENUS.TASKS] },
    { group: MENU_GROUPS.CULTURE, items: [ALL_MENUS.CULTURE] }
  ],

  // RH
  rh: [
    { group: MENU_GROUPS.PEOPLE, items: [ALL_MENUS.HOME, ALL_MENUS.IA_ANALYTICS_OPERACIONAL, ALL_MENUS.TEAM_MANAGEMENT, ALL_MENUS.RECRUITMENT, ALL_MENUS.EVALUATIONS] },
    { group: MENU_GROUPS.CULTURE, items: [ALL_MENUS.CULTURE, ALL_MENUS.TASKS] }
  ],
  
  // Estoque
  estoque: [
    { group: MENU_GROUPS.OPERATIONAL, items: [ALL_MENUS.HOME, ALL_MENUS.INVENTORY, ALL_MENUS.TASKS] }
  ],

  // Administrativo
  administrativo: [
    { group: MENU_GROUPS.OPERATIONAL, items: [ALL_MENUS.HOME, ALL_MENUS.DOCUMENTS, ALL_MENUS.AGENDA, ALL_MENUS.TASKS] }
  ]
};

// Função helper para normalizar papéis operacionais
const normalizeRole = (role) => {
  const operationalRoles = [
    "tecnico", "pintor", "funileiro", "chapeador", 
    "martelinho", "desmontador", "moto_boy", "lavador"
  ];
  const commercialRoles = ["comercial_telemarketing", "consultor_vendas"];
  const marketingRoles = ["marketing_trafego"];

  if (operationalRoles.includes(role)) return "operacional";
  if (commercialRoles.includes(role)) return "comercial";
  if (marketingRoles.includes(role)) return "comercial"; // Simplificação para fase 1
  
  return role;
};

export const getMenusForRole = (role, isPartner = false) => {
  // Sócios sempre têm visão de diretor, a menos que especificado
  if (isPartner && !role) return ROLE_MENUS.diretor;
  
  const normalized = normalizeRole(role);
  return ROLE_MENUS[normalized] || ROLE_MENUS.operacional; // Fallback seguro
};

export const getAdminMenus = () => {
    return [
        { 
            group: "Administração", 
            items: [ALL_MENUS.ADMIN_MASTER, ALL_MENUS.ADMIN_PLANS, ALL_MENUS.ADMIN_CLIENTS] 
        }
    ];
};
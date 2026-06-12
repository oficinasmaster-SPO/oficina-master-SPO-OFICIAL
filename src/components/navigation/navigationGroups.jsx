import { createPageUrl } from "@/utils";
import {
  BarChart3,
  LayoutDashboard,
  TrendingUp,
  Trophy,
  Database,
  Building2,
  Network,
  Users,
  BookOpen,
  Wrench,
  ListTodo,
  Bell,
  ClipboardList,
  Truck,
  BarChart4,
  BarChart2,
  GitBranch,
  Calculator,
  DollarSign,
  TrendingDown,
  Target,
  Briefcase,
  Heart,
  FilePenLine,
  User,
  Smile,
  Award,
  Brain,
  Sparkles,
  FileText,
  History,
  Package,
  FileCheck,
  Flame,
  Calendar,
  GraduationCap,
  Video,
  Settings,
  Lightbulb,
  Receipt,
  Clock,
  Shield,
  CreditCard,
  MessageCircle,
  Mail,
  Activity,
  Bug,
} from "lucide-react";

/**
 * Estrutura de navegação do Sidebar — fonte única dos grupos e itens de menu.
 * O Sidebar fica responsável apenas por renderização, filtros (canAccessItem),
 * estado e expansão.
 */
export const getNavigationGroups = (unreadCount) => [
  {
    id: 'dashboard',
    label: 'Dashboard & Rankings',
    icon: BarChart3,
    items: [
      {
        name: 'Visão Geral',
        href: createPageUrl('DashboardOverview'),
        icon: LayoutDashboard,
        description: 'Resumo da sua oficina',
        highlight: true,
        requiredPermission: 'dashboard.view'
      },
      {
        name: 'Dashboard Nacional',
        href: createPageUrl('Dashboard'),
        icon: TrendingUp,
        description: 'Métricas, rankings e KPIs',
        requiredPermission: 'admin.audit'
      },
      {
        name: 'Desafios & Conquistas',
        href: createPageUrl('Gamificacao'),
        icon: Trophy,
        description: 'Rankings, desafios e recompensas',
        requiredPermission: 'operations.view_qgp'
      }
    ]
  },
  {
    id: 'cadastros',
    label: 'Empresa',
    icon: Database,
    items: [
      {
        name: 'Gestão da Oficina',
        href: createPageUrl('GestaoOficina'),
        icon: Building2,
        description: 'Dados, serviços, metas e cultura',
        highlight: true,
        requiredPermission: 'workshop.view'
      },
      {
        name: 'Organograma Estrutural',
        href: createPageUrl('Organograma'),
        icon: Network,
        description: 'Áreas e funções',
        highlight: true,
        requiredPermission: 'workshop.view'
      },
      {
        name: 'Organograma Funcional',
        href: createPageUrl('OrganogramaFuncional'),
        icon: Users,
        description: 'Pessoas e equipes',
        highlight: true,
        requiredPermission: 'workshop.view'
      },
      {
        name: 'Regimento Interno',
        href: createPageUrl('Regimento'),
        icon: BookOpen,
        description: 'Normas e políticas da oficina',
        highlight: true,
        requiredPermission: 'culture.view'
      },
    ]
  },
  {
    id: 'patio',
    label: 'Pátio Operação (QGP)',
    icon: Wrench,
    items: [
      {
        name: 'Tarefas Operacionais',
        href: createPageUrl('Tarefas'),
        icon: ListTodo,
        description: 'Gestão de tarefas do dia a dia',
        highlight: true,
        requiredPermission: 'operations.manage_tasks'
      },
      {
        name: 'Notificações',
        href: createPageUrl('Notificacoes'),
        icon: Bell,
        badge: unreadCount,
        description: 'Alertas e prazos',
        requiredPermission: 'dashboard.view'
      },
      {
        name: 'Diário de Produção',
        href: createPageUrl('RegistroDiario'),
        icon: ClipboardList,
        description: 'Registro diário de métricas',
        highlight: true,
        requiredPermission: 'operations.daily_log'
      },
      {
        name: 'Quadro Geral (TV)',
        href: createPageUrl('QGPBoard'),
        icon: Truck,
        description: 'Visão aeroporto do pátio',
        highlight: true,
        technicianOnly: true,
        requiredPermission: 'operations.view_qgp'
      },
      {
        name: 'Minha Fila (Técnico)',
        href: createPageUrl('TechnicianQGP'),
        icon: Wrench,
        description: 'Painel do executor',
        highlight: true,
        technicianOnly: true,
        requiredPermission: 'operations.view_qgp'
      }
    ]
  },
  {
    id: 'resultados',
    label: 'Resultados (OS, Metas, Finanças)',
    icon: BarChart4,
    items: [
      {
        name: 'Histórico de Metas',
        href: createPageUrl('HistoricoMetas'),
        icon: BarChart2,
        description: 'Relatórios e gráficos de metas',
        highlight: true,
        requiredPermission: 'workshop.manage_goals'
      },
      {
        name: 'Desdobramento de Metas',
        href: createPageUrl('DesdobramentoMeta'),
        icon: GitBranch,
        description: 'Esforço e Resultado - Meta por área',
        highlight: true,
        requiredPermission: 'workshop.manage_goals'
      },
      {
        name: 'DRE & TCMP²',
        href: createPageUrl('DRETCMP2'),
        icon: Calculator,
        description: 'DRE mensal e cálculo TCMP²',
        highlight: true,
        requiredPermission: 'financeiro.view'
      },
      {
        name: 'OS - R70/I30',
        href: createPageUrl('DiagnosticoOS'),
        icon: DollarSign,
        description: 'Rentabilidade de Ordens de Serviço',
        requiredPermission: 'diagnostics.create'
      },
      {
        name: 'Produção vs Salário',
        href: createPageUrl('DiagnosticoProducao'),
        icon: Calculator,
        description: 'Relação custo x produtividade',
        requiredPermission: 'diagnostics.create'
      },
      {
        name: 'Curva de Endividamento',
        href: createPageUrl('DiagnosticoEndividamento'),
        icon: TrendingDown,
        description: 'Análise 12 meses com IA',
        requiredPermission: 'financeiro.view'
      },
      {
        name: 'Diagnóstico Gerencial',
        href: createPageUrl('DiagnosticoGerencial'),
        icon: Building2,
        description: 'Análise de áreas da empresa',
        highlight: true,
        requiredPermission: 'diagnostics.create'
      }
    ]
  },
  {
    id: 'pessoas',
    label: 'Pessoas & RH (Colaboradores)',
    icon: Users,
    items: [
      {
        name: 'Mapas de Autoavaliação',
        href: createPageUrl('Autoavaliacoes'),
        icon: Target,
        description: 'Vendas, Comercial, Marketing, RH...',
        highlight: true,
        requiredPermission: 'diagnostics.view'
      },
      {
        name: 'Colaboradores',
        href: createPageUrl('Colaboradores'),
        icon: Briefcase,
        description: 'Gestão de equipe e RH',
        highlight: true,
        requiredPermission: 'employees.view'
      },
      {
        name: '🅲🅴🆂🅿🅴 - Contratação',
        href: createPageUrl('CESPECanal'),
        icon: Target,
        description: 'Canal → Entrevista → Sonho → Proposta → Integração',
        highlight: true,
        requiredPermission: 'employees.create'
      },
      {
        name: 'CDC - Conexão do Colaborador',
        href: createPageUrl('CDCList'),
        icon: Heart,
        description: 'Conhecer e conectar com a equipe',
        highlight: true,
        requiredPermission: 'processes.view'
      },
      {
        name: 'COEX - Contrato Expectativa',
        href: createPageUrl('COEXList'),
        icon: FilePenLine,
        description: 'Alinhamento de metas e comportamentos',
        highlight: true,
        requiredPermission: 'processes.view'
      },
      {
        name: 'Descrições de Cargo',
        href: createPageUrl('DescricoesCargo'),
        icon: ClipboardList,
        description: 'Cargos e responsabilidades',
        highlight: true,
        requiredPermission: 'employees.view'
      },
      {
        name: 'Perfil do Empresário',
        href: createPageUrl('DiagnosticoEmpresario'),
        icon: User,
        description: 'Aventureiro, Empreendedor, Gestor',
        requiredPermission: 'diagnostics.create'
      },
      {
        name: 'Teste DISC',
        href: createPageUrl('AutoavaliacaoDISC'),
        icon: Smile,
        description: 'Perfil comportamental DEUSA',
        requiredPermission: 'diagnostics.create'
      },
      {
        name: 'Maturidade do Colaborador',
        href: createPageUrl('DiagnosticoMaturidade'),
        icon: Users,
        description: 'Bebê, Criança, Adolescente, Adulto',
        requiredPermission: 'diagnostics.create'
      },
      {
        name: 'Matriz de Desempenho',
        href: createPageUrl('DiagnosticoDesempenho'),
        icon: Award,
        description: 'Competências técnicas e emocionais',
        requiredPermission: 'diagnostics.create'
      },
      {
        name: 'Carga de Trabalho',
        href: createPageUrl('DiagnosticoCarga'),
        icon: BarChart4,
        description: 'Distribuição e sobrecarga',
        requiredPermission: 'diagnostics.create'
      }
    ]
  },
  {
    id: 'diagnosticos',
    label: 'Diagnósticos & IA',
    icon: Brain,
    items: [
      {
        name: 'IA Analytics',
        href: createPageUrl('IAAnalytics'),
        icon: Sparkles,
        description: 'Previsões, gargalos e recomendações',
        highlight: true,
        requiredPermission: 'diagnostics.ai_access'
      },
      {
        name: 'Treinamento de Vendas',
        href: createPageUrl('TreinamentoVendas'),
        icon: Award,
        description: 'Pratique cenários com IA',
        highlight: true,
        requiredPermission: 'training.view'
      },
      {
        name: 'Diagnóstico Comercial',
        href: createPageUrl('DiagnosticoComercial'),
        icon: TrendingUp,
        description: 'Avaliação de processos comerciais',
        highlight: true,
        requiredPermission: 'diagnostics.create'
      },
      {
        name: 'Selecionar Diagnóstico',
        href: createPageUrl('SelecionarDiagnostico'),
        icon: FileText,
        description: 'Central de diagnósticos',
        requiredPermission: 'diagnostics.view'
      },
      {
        name: 'Histórico de Diagnósticos',
        href: createPageUrl('Historico'),
        icon: History,
        description: 'Todos os diagnósticos realizados',
        requiredPermission: 'diagnostics.view'
      }
    ]
  },
  {
    id: 'processos',
    label: 'Processos',
    icon: Package,
    items: [
      {
        name: 'Meus Processos (MAPs)',
        href: createPageUrl('MeusProcessos'),
        icon: Package,
        description: 'Biblioteca de processos padrão',
        requiredPermission: 'processes.view'
      },
      {
        name: 'Manual de Processos',
        href: createPageUrl('ManualProcessos'),
        icon: BookOpen,
        description: 'Manual completo da empresa',
        highlight: true,
        requiredPermission: 'processes.view'
      }
    ]
  },
  {
    id: 'documentos',
    label: 'Documentos',
    icon: FileCheck,
    items: [
      {
        name: 'Repositório de Documentos',
        href: createPageUrl('RepositorioDocumentos'),
        icon: FileCheck,
        description: 'Central segura de documentos',
        requiredPermission: 'documents.upload'
      }
    ]
  },
  {
    id: 'cultura',
    label: 'Cultura',
    icon: Heart,
    items: [
      {
        name: 'Manual da Cultura',
        href: createPageUrl('CulturaOrganizacional'),
        icon: BookOpen,
        description: 'Pilares, expectativas e rituais',
        highlight: true,
        requiredPermission: 'culture.view'
      },
      {
        name: 'Regimento Interno',
        href: createPageUrl('Regimento'),
        icon: FileText,
        description: 'Regulamento jurídico da empresa',
        highlight: true,
        requiredPermission: 'culture.edit'
      },
      {
        name: 'Missão, Visão e Valores',
        href: createPageUrl('MissaoVisaoValores'),
        icon: Heart,
        description: 'Cultura organizacional',
        requiredPermission: 'culture.edit'
      },
      {
        name: 'Rituais de Aculturamento',
        href: createPageUrl('RituaisAculturamento'),
        icon: Flame,
        description: '34 rituais para fortalecer a cultura',
        highlight: true,
        requiredPermission: 'culture.manage_rituals'
      },
      {
        name: 'Cronograma de Aculturação',
        href: createPageUrl('CronogramaAculturacao'),
        icon: Calendar,
        description: 'Atividades automáticas programadas',
        highlight: true,
        requiredPermission: 'culture.manage_rituals'
      },
      {
        name: 'Pesquisa de Clima',
        href: createPageUrl('PesquisaClima'),
        icon: BarChart2,
        description: 'Desempenho e satisfação da equipe',
        highlight: true,
        requiredPermission: 'culture.view'
      }
    ]
  },
  {
    id: 'treinamentos',
    label: 'Treinamentos',
    icon: GraduationCap,
    items: [
      {
        name: 'Academia de Treinamento',
        href: createPageUrl('AcademiaTreinamento'),
        icon: Video,
        description: 'Plataforma estilo Netflix',
        highlight: true,
        requiredPermission: 'training.view'
      },
      {
        name: 'Gestão de Treinamentos',
        href: createPageUrl('GerenciarTreinamentos'),
        icon: BookOpen,
        description: 'Módulos, aulas e avaliações',
        highlight: true,
        requiredPermission: 'training.manage'
      },
      {
        name: 'Configuração da Academia',
        href: createPageUrl('ConfiguracaoAcademia'),
        icon: Settings,
        description: 'Regras e comportamento da academia',
        requiredPermission: 'training.manage'
      },
      {
        name: 'Acompanhamento',
        href: createPageUrl('AcompanhamentoTreinamento'),
        icon: Users,
        description: 'Progresso e notas da equipe',
        requiredPermission: 'training.evaluate'
      },
      {
        name: 'Meus Treinamentos',
        href: createPageUrl('MeusTreinamentos'),
        icon: GraduationCap,
        description: 'Área do aluno',
        requiredPermission: 'training.view'
      }
    ]
  },
  {
    id: 'gestao',
    label: 'Gestão da Operação',
    icon: Lightbulb,
    items: [
      {
        name: 'Dicas da Operação',
        href: createPageUrl('DicasOperacao'),
        icon: Lightbulb,
        description: 'Mural de avisos para a equipe',
        highlight: true,
        requiredPermission: 'operations.view_qgp'
      },
      {
        name: 'Criar Desafios Internos',
        href: createPageUrl('GestaoDesafios'),
        icon: Target,
        description: 'Crie competições para sua equipe',
        requiredPermission: 'operations.manage_tasks'
      }
    ]
  },
  {
    id: 'inteligencia',
    label: 'Inteligência do Cliente',
    icon: Brain,
    items: [
      {
        name: 'Inteligência',
        href: createPageUrl('IntelligenciaCliente'),
        icon: Brain,
        description: 'Dores, Dúvidas, Desejos, Riscos e Evoluções',
        highlight: true,
        requiredPermission: 'workshop.view'
      },
      {
        name: 'Mapa de Checklists',
        href: createPageUrl('MapaChecklists'),
        icon: ClipboardList,
        description: 'Gerenciar checklists por tipo',
        requiredPermission: 'workshop.view'
      },
      {
        name: 'Relatórios de Inteligência',
        href: createPageUrl('RelatoriosInteligencia'),
        icon: BarChart3,
        description: 'Análises e indicadores',
        highlight: true,
        requiredPermission: 'workshop.view'
      }
    ]
  },
  {
    id: 'aceleracao',
    label: 'Aceleração',
    icon: Briefcase,
    items: [
      {
        name: 'Meu Plano de Aceleração',
        href: createPageUrl('PainelClienteAceleracao'),
        icon: Sparkles,
        description: 'Plano mensal gerado por IA',
        highlight: true,
        requiredPermission: 'acceleration.view'
      },
      {
        name: 'CheckPoint / Cronograma',
        href: createPageUrl('CronogramaImplementacao'),
        icon: ListTodo,
        description: 'Progresso detalhado do plano',
        highlight: true,
        requiredPermission: 'acceleration.view'
      },
      {
        name: 'Controle da Aceleração',
        href: createPageUrl('ControleAceleracao'),
        icon: Briefcase,
        description: 'Painel completo de gestão',
        highlight: true,
        globalAdminOnly: true,
        requiredPermission: 'acceleration.manage'
      },
      {
        name: 'Contratos',
        href: createPageUrl('GestaoContratos'),
        icon: Receipt,
        description: 'Gestão e envio de contratos',
        highlight: true,
        globalAdminOnly: true,
        requiredPermission: 'acceleration.manage'
      },
      {
        name: 'Relatórios de Aceleração',
        href: createPageUrl('RelatoriosAceleracao'),
        icon: FileText,
        description: 'Testes, diagnósticos e desempenho',
        globalAdminOnly: true,
        requiredPermission: 'acceleration.manage'
      },
      {
        name: '⏱️ Tempo de Atenção',
        href: createPageUrl('DashboardTempoAtencao'),
        icon: Clock,
        description: 'Horas dedicadas por consultor e cliente',
        globalAdminOnly: true,
        requiredPermission: 'acceleration.manage'
      }
    ]
  },
  {
    id: 'admin',
    label: 'Administração & Planos',
    icon: Shield,
    items: [
      {
        name: 'Gestão de Empresas',
        href: createPageUrl('GestaoEmpresas'),
        icon: Briefcase,
        description: 'Gerencie empresas da sua consultoria',
        highlight: true,
        requiredPermission: 'admin.users'
      },
      {
        name: 'Gestão de Usuários',
        href: createPageUrl('UsuariosAdmin'),
        icon: Users,
        description: 'Consultores e aceleradores do sistema',
        globalAdminOnly: true,
        highlight: true,
        requiredPermission: 'admin.users'
      },
      {
        name: 'Gestão RBAC',
        href: createPageUrl('GestaoRBAC'),
        icon: Shield,
        description: 'Perfis e permissões centralizados',
        globalAdminOnly: true,
        highlight: true,
        requiredPermission: 'admin.profiles'
      },
      {
        name: 'Dashboard Financeiro',
        href: createPageUrl('DashboardFinanceiro'),
        icon: DollarSign,
        description: 'Métricas financeiras e pagamentos',
        highlight: true,
        globalAdminOnly: true,
        requiredPermission: 'admin.system_config'
      },
      {
        name: 'Configurações Kiwify',
        href: createPageUrl('ConfiguracoesKiwify'),
        icon: CreditCard,
        description: 'Integração de pagamentos',
        highlight: true,
        globalAdminOnly: true,
        requiredPermission: 'admin.system_config'
      },
      {
        name: 'Usuários e Empresas',
        href: createPageUrl('GestaoUsuariosEmpresas'),
        icon: Users,
        description: 'Central de gestão de usuários e oficinas',
        highlight: true,
        globalAdminOnly: true,
        requiredPermission: 'admin.users'
      },
      {
        name: 'Gestão de Tenants',
        href: createPageUrl('GestaoTenants'),
        icon: Building2,
        description: 'Consultorias e Empresas globais',
        highlight: true,
        globalAdminOnly: true,
        requiredPermission: 'admin.users'
      },
      {
        name: 'Config. Produtividade',
        href: createPageUrl('AdminProdutividade'),
        icon: Target,
        description: 'Métricas e KPIs globais',
        globalAdminOnly: true,
        requiredPermission: 'admin.system_config'
      },
      {
        name: 'Gestão Desafios Globais',
        href: createPageUrl('AdminDesafios'),
        icon: Trophy,
        description: 'Desafios nível Brasil',
        globalAdminOnly: true,
        requiredPermission: 'admin.system_config'
      },
      {
        name: 'Gerenciar Planos',
        href: createPageUrl('GerenciarPlanos'),
        icon: CreditCard,
        description: 'Controle de permissões e recursos por plano',
        globalAdminOnly: true,
        requiredPermission: 'admin.system_config'
      },
      {
        name: 'Calendário de Eventos',
        href: createPageUrl('CalendarioEventos'),
        icon: Calendar,
        description: 'Eventos anuais (imersões, treinamentos)',
        highlight: true,
        globalAdminOnly: true,
        requiredPermission: 'admin.system_config'
      },
      {
        name: 'Templates de Mensagem',
        href: createPageUrl('AdminMensagens'),
        icon: MessageCircle,
        description: 'Configurar mensagens de incentivo',
        globalAdminOnly: true,
        requiredPermission: 'admin.system_config'
      },
      {
        name: 'Automação de E-mails',
        href: createPageUrl('AdminNotificacoes'),
        icon: Mail,
        description: 'Alertas de inatividade e resumos',
        globalAdminOnly: true,
        requiredPermission: 'admin.system_config'
      },
      {
        name: 'Gerenciar Tours e Vídeos',
        href: createPageUrl('GerenciarToursVideos'),
        icon: Video,
        description: 'Configure ajuda e tours guiados',
        globalAdminOnly: true,
        requiredPermission: 'admin.system_config'
      },
      {
        name: 'Gerenciar Processos',
        href: createPageUrl('GerenciarProcessos'),
        icon: FileText,
        description: 'Upload e gestão de MAPs',
        globalAdminOnly: true,
        requiredPermission: 'admin.system_config'
      },
      {
        name: 'Saúde do Sistema',
        href: createPageUrl('AdminSaudeSistema'),
        icon: Activity,
        description: 'Governança, RBAC, Onboarding, Observabilidade',
        globalAdminOnly: true,
        highlight: true,
        requiredPermission: 'admin.audit'
      },
      {
        name: 'Logs de Auditoria RBAC',
        href: createPageUrl('LogsAuditoriaRBAC'),
        icon: Activity,
        description: 'Histórico de alterações em permissões',
        globalAdminOnly: true,
        requiredPermission: 'admin.audit'
      },
      {
        name: 'Monitoramento de Usuários',
        href: createPageUrl('MonitoramentoUsuarios'),
        icon: Activity,
        description: 'Rastreamento e tempo no sistema',
        globalAdminOnly: true,
        highlight: true,
        requiredPermission: 'admin.audit'
      },
      {
        name: 'Diagnóstico de Plano',
        href: createPageUrl('DiagnosticoPlano'),
        icon: Bug,
        description: 'Verificar status do plano Base44',
        globalAdminOnly: true,
        requiredPermission: 'admin.system_config'
      },
      {
        name: 'Integrações',
        href: createPageUrl('Integracoes'),
        icon: Network,
        description: 'Google Calendar & Meet',
        highlight: true,
        globalAdminOnly: true,
        requiredPermission: 'admin.system_config'
      }
    ]
  }
];
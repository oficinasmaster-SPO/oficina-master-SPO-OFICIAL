import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/components/hooks/usePermissions";
import { 
  Home, 
  FileText, 
  History, 
  Bell, 
  BarChart3, 
  User,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Menu,
  Database,
  TrendingUp,
  Building2,
  Users,
  Brain,
  Calculator,
  Award,
  BarChart4,
  DollarSign,
  Smile,
  Briefcase,
  Target,
  ClipboardList,
  TrendingDown,
  Settings,
  Trophy,
  ListTodo,
  Sparkles,
  Wrench,
  Package,
  FileCheck,
  Heart,
  GraduationCap,
  Shield,
  LayoutDashboard,
  Lightbulb,
  Video,
  FilePenLine,
  GitBranch,
  BookOpen,
  Calendar,
  BarChart2,
  Crown,
  Flame,
  Receipt,
  CreditCard,
  MessageCircle,
  Truck,
  Mail,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar({ user, unreadCount, isOpen, onClose }) {
  const location = useLocation();
  const { canViewModule, canEditModule, isAdmin, permissionLevel } = usePermissions(user);
  
  const [expandedGroups, setExpandedGroups] = React.useState(['dashboard', 'patio', 'treinamentos']);
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    try {
      localStorage.setItem('sidebar-collapsed', String(newState));
    } catch {
      // Ignora erro
    }
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Verificar se o usuário é acelerador
  const isAcelerador = user?.job_role === 'acelerador' || user?.role === 'admin';

  const navigationGroups = [
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
          highlight: true
        },
        { 
          name: 'Dashboard Nacional', 
          href: createPageUrl('Dashboard'), 
          icon: TrendingUp,
          description: 'Métricas, rankings e KPIs',
          adminOnly: true
        },
        { 
          name: 'Desafios & Conquistas', 
          href: createPageUrl('Gamificacao'), 
          icon: Trophy,
          description: 'Rankings, desafios e recompensas'
        }
      ]
    },
    {
      id: 'cadastros',
      label: 'Cadastros (Base de Dados)',
      icon: Database,
      items: [
        { 
          name: 'Gestão da Oficina', 
          href: createPageUrl('GestaoOficina'), 
          icon: Building2,
          description: 'Dados, serviços, metas e cultura',
          highlight: true
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
          highlight: true
        },
        { 
          name: 'Notificações', 
          href: createPageUrl('Notificacoes'), 
          icon: Bell,
          badge: unreadCount,
          description: 'Alertas e prazos'
        },
        { 
          name: 'Diário de Produção', 
          href: createPageUrl('RegistroDiario'), 
          icon: ClipboardList,
          description: 'Registro diário de métricas',
          highlight: true
        },
        { 
          name: 'Quadro Geral (TV)', 
          href: createPageUrl('QGPBoard'), 
          icon: Truck,
          description: 'Visão aeroporto do pátio',
          highlight: true,
          technicianOnly: true
        },
        { 
          name: 'Minha Fila (Técnico)', 
          href: createPageUrl('TechnicianQGP'), 
          icon: Wrench,
          description: 'Painel do executor',
          highlight: true,
          technicianOnly: true
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
          highlight: true
        },
        { 
          name: 'Desdobramento de Metas', 
          href: createPageUrl('DesdobramentoMeta'), 
          icon: GitBranch,
          description: 'Esforço e Resultado - Meta por área',
          highlight: true
        },

        { 
          name: 'DRE & TCMP²', 
          href: createPageUrl('DRETCMP2'), 
          icon: Calculator,
          description: 'DRE mensal e cálculo TCMP²',
          highlight: true
        },
        { 
          name: 'OS - R70/I30', 
          href: createPageUrl('DiagnosticoOS'), 
          icon: DollarSign,
          description: 'Rentabilidade de Ordens de Serviço'
        },
        { 
          name: 'Produção vs Salário', 
          href: createPageUrl('DiagnosticoProducao'), 
          icon: Calculator,
          description: 'Relação custo x produtividade'
        },
        { 
          name: 'Curva de Endividamento',
          href: createPageUrl('DiagnosticoEndividamento'), 
          icon: TrendingDown,
          description: 'Análise 12 meses com IA'
        },
        { 
          name: 'Diagnóstico Gerencial', 
          href: createPageUrl('DiagnosticoGerencial'), 
          icon: Building2,
          description: 'Análise de áreas da empresa',
          highlight: true
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
          highlight: true
        },
        { 
          name: 'Colaboradores', 
          href: createPageUrl('Colaboradores'), 
          icon: Briefcase,
          description: 'Gestão de equipe e RH',
          highlight: true
        },
        { 
          name: 'Convidar Colaborador', 
          href: createPageUrl('ConvidarColaborador'), 
          icon: Users,
          description: 'Enviar convite por e-mail',
          highlight: true
        },
        { 
          name: 'CDC - Conexão do Colaborador', 
          href: createPageUrl('CDCList'), 
          icon: Heart,
          description: 'Conhecer e conectar com a equipe',
          highlight: true
        },
        { 
          name: 'COEX - Contrato Expectativa', 
          href: createPageUrl('COEXList'), 
          icon: FilePenLine,
          description: 'Alinhamento de metas e comportamentos',
          highlight: true
        },
// { 
        //   name: 'Descrições de Cargo', 
        //   href: createPageUrl('DescricoesCargo'), 
        //   icon: ClipboardList,
        //   description: 'Geração com IA'
        // },
        { 
          name: 'Perfil do Empresário', 
          href: createPageUrl('DiagnosticoEmpresario'), 
          icon: User,
          description: 'Aventureiro, Empreendedor, Gestor'
        },
        { 
          name: 'Teste DISC', 
          href: createPageUrl('DiagnosticoDISC'), 
          icon: Smile,
          description: 'Perfil comportamental DEUSA'
        },
        { 
          name: 'Maturidade do Colaborador', 
          href: createPageUrl('DiagnosticoMaturidade'), 
          icon: Users,
          description: 'Bebê, Criança, Adolescente, Adulto'
        },
        { 
          name: 'Matriz de Desempenho', 
          href: createPageUrl('DiagnosticoDesempenho'), 
          icon: Award,
          description: 'Competências técnicas e emocionais'
        },
        { 
          name: 'Carga de Trabalho', 
          href: createPageUrl('DiagnosticoCarga'), 
          icon: BarChart4,
          description: 'Distribuição e sobrecarga'
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
          highlight: true
        },
        { 
          name: 'Treinamento de Vendas', 
          href: createPageUrl('TreinamentoVendas'), 
          icon: Award,
          description: 'Pratique cenários com IA',
          highlight: true
        },
        { 
          name: 'Diagnóstico Comercial', 
          href: createPageUrl('DiagnosticoComercial'), 
          icon: TrendingUp,
          description: 'Avaliação de processos comerciais',
          highlight: true
        },
        { 
          name: 'Selecionar Diagnóstico', 
          href: createPageUrl('SelecionarDiagnostico'), 
          icon: FileText,
          description: 'Central de diagnósticos'
        },
        { 
          name: 'Histórico de Diagnósticos', 
          href: createPageUrl('Historico'), 
          icon: History,
          description: 'Todos os diagnósticos realizados'
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
          description: 'Biblioteca de processos padrão'
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
          description: 'Central segura de documentos'
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
          highlight: true
        },
        { 
          name: 'Missão, Visão e Valores', 
          href: createPageUrl('MissaoVisaoValores'), 
          icon: Heart,
          description: 'Cultura organizacional'
        },
        { 
          name: 'Rituais de Aculturamento', 
          href: createPageUrl('RituaisAculturamento'), 
          icon: Flame,
          description: '34 rituais para fortalecer a cultura',
          highlight: true
        },
        { 
          name: 'Cronograma de Aculturação', 
          href: createPageUrl('CronogramaAculturacao'), 
          icon: Calendar,
          description: 'Atividades automáticas programadas',
          highlight: true
        },
        { 
          name: 'Pesquisa de Clima', 
          href: createPageUrl('PesquisaClima'), 
          icon: BarChart2,
          description: 'Desempenho e satisfação da equipe',
          highlight: true
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
          highlight: true
        },
        { 
          name: 'Gestão de Treinamentos', 
          href: createPageUrl('GerenciarTreinamentos'), 
          icon: BookOpen,
          description: 'Módulos, aulas e avaliações',
          highlight: true
        },
        { 
          name: 'Configuração da Academia', 
          href: createPageUrl('ConfiguracaoAcademia'), 
          icon: Settings,
          description: 'Regras e comportamento da academia',
          adminOnly: true
        },
        { 
          name: 'Acompanhamento', 
          href: createPageUrl('AcompanhamentoTreinamento'), 
          icon: Users,
          description: 'Progresso e notas da equipe'
        },
        { 
          name: 'Meus Treinamentos', 
          href: createPageUrl('MeusTreinamentos'), 
          icon: GraduationCap,
          description: 'Área do aluno'
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
          highlight: true
        },
        { 
          name: 'Criar Desafios Internos', 
          href: createPageUrl('GestaoDesafios'), 
          icon: Target,
          description: 'Crie competições para sua equipe'
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
          highlight: true
        },
        { 
          name: 'CheckPoint / Cronograma', 
          href: createPageUrl('CronogramaImplementacao'), 
          icon: ListTodo,
          description: 'Progresso detalhado do plano',
          highlight: true
        },
        { 
          name: 'Controle da Aceleração', 
          href: createPageUrl('ControleAceleracao'), 
          icon: Briefcase,
          description: 'Painel completo de gestão',
          highlight: true,
          aceleradorOnly: true
        },
        { 
          name: 'Relatórios de Aceleração', 
          href: createPageUrl('RelatoriosAceleracao'), 
          icon: FileText,
          description: 'Testes, diagnósticos e desempenho',
          aceleradorOnly: true
        }
      ]
    },
    {
      id: 'admin',
      label: 'Administração & Planos',
      icon: Shield,
      items: [
        { 
          name: 'Usuários do Sistema', 
          href: createPageUrl('Usuarios'), 
          icon: Users,
          description: 'Gerenciar usuários e empresas',
          highlight: true,
          adminOnly: true
        },
        { 
          name: 'Gerenciar Tela Inicial', 
          href: createPageUrl('GerenciarTelaInicial'), 
          icon: LayoutDashboard,
          description: 'Widgets e indicadores da Home',
          adminOnly: true,
          highlight: true
        },
        { 
          name: 'Gerenciar Permissões', 
          href: createPageUrl('GerenciarPermissoes'), 
          icon: Shield,
          description: 'Acesso aos módulos laterais',
          adminOnly: true
        },
        { 
          name: 'Config. Produtividade', 
          href: createPageUrl('AdminProdutividade'), 
          icon: Target,
          description: 'Métricas e KPIs globais',
          adminOnly: true
        },
        { 
          name: 'Gestão Desafios Globais', 
          href: createPageUrl('AdminDesafios'), 
          icon: Trophy,
          description: 'Desafios nível Brasil',
          adminOnly: true
        },
        { 
          name: 'Gerenciar Planos', 
          href: createPageUrl('GerenciarPlanos'), 
          icon: CreditCard,
          description: 'Controle de permissões e recursos por plano',
          adminOnly: true
        },
        { 
          name: 'Teste de Usuários', 
          href: createPageUrl('TesteUsuarios'), 
          icon: Settings,
          description: 'Validação de cadastro padronizado',
          adminOnly: true,
          highlight: true
        },
        { 
          name: 'Templates de Mensagem', 
          href: createPageUrl('AdminMensagens'), 
          icon: MessageCircle,
          description: 'Configurar mensagens de incentivo',
          adminOnly: true
        },
        { 
          name: 'Automação de E-mails', 
          href: createPageUrl('AdminNotificacoes'), 
          icon: Mail,
          description: 'Alertas de inatividade e resumos',
          adminOnly: true
        },
        { 
          name: 'Gestão de Clientes', 
          href: createPageUrl('AdminClientes'), 
          icon: Users,
          description: 'Painel administrativo de clientes',
          adminOnly: true
        },
        { 
          name: 'Gerenciar Tours e Vídeos', 
          href: createPageUrl('GerenciarToursVideos'), 
          icon: Video,
          description: 'Configure ajuda e tours guiados',
          adminOnly: true
        },
        { 
          name: 'Gerenciar Processos', 
          href: createPageUrl('GerenciarProcessos'), 
          icon: FileText,
          description: 'Upload e gestão de MAPs',
          adminOnly: true
        },
        { 
          name: 'Gestão de Perfis', 
          href: createPageUrl('GestaoPerfis'), 
          icon: Shield,
          description: 'Perfis e permissões centralizados',
          adminOnly: true,
          highlight: true
        },
        { 
          name: 'Usuários Internos', 
          href: createPageUrl('UsuariosAdmin'), 
          icon: Users,
          description: 'Consultores e aceleradores do sistema',
          adminOnly: true,
          highlight: true
        },
        { 
          name: 'Monitoramento de Usuários', 
          href: createPageUrl('MonitoramentoUsuarios'), 
          icon: Activity,
          description: 'Rastreamento e tempo no sistema',
          adminOnly: true,
          highlight: true
        }
      ]
    }
  ];

  const isActive = (href) => {
    return location.pathname.toLowerCase() === href.toLowerCase();
  };

  const canAccessItem = (item) => {
    if (item.public) return true;
    if (!user) return false;

    // Admin sempre tem acesso total
    if (user.role === 'admin') return true;

    // Verificar permissões específicas de acelerador
    if (item.aceleradorOnly && !isAcelerador) return false;

    // Verificar permissões específicas de admin
    if (item.adminOnly) return false;
    
    // Mapear item para módulo de permissão
    const moduleMap = {
      'Visão Geral': 'dashboard',
      'Dashboard Nacional': 'dashboard',
      'Desafios & Conquistas': 'dashboard',
      'Gestão da Oficina': 'cadastros',
      'Tarefas Operacionais': 'patio',
      'Notificações': 'patio',
      'Diário de Produção': 'patio',
      'Quadro Geral (TV)': 'patio',
      'Minha Fila (Técnico)': 'patio',
      'Histórico de Metas': 'resultados',
      'Desdobramento de Metas': 'resultados',
      'DRE & TCMP²': 'resultados',
      'OS - R70/I30': 'resultados',
      'Produção vs Salário': 'resultados',
      'Curva de Endividamento': 'resultados',
      'Diagnóstico Gerencial': 'resultados',
      'Mapas de Autoavaliação': 'pessoas',
      'Colaboradores': 'pessoas',
      'Convidar Colaborador': 'pessoas',
      'CDC - Conexão do Colaborador': 'pessoas',
      'COEX - Contrato Expectativa': 'pessoas',
      'Perfil do Empresário': 'pessoas',
      'Teste DISC': 'pessoas',
      'Maturidade do Colaborador': 'pessoas',
      'Matriz de Desempenho': 'pessoas',
      'Carga de Trabalho': 'pessoas',
      'IA Analytics': 'diagnosticos',
      'Treinamento de Vendas': 'diagnosticos',
      'Diagnóstico Comercial': 'diagnosticos',
      'Selecionar Diagnóstico': 'diagnosticos',
      'Histórico de Diagnósticos': 'diagnosticos',
      'Meus Processos (MAPs)': 'processos',
      'Repositório de Documentos': 'documentos',
      'Manual da Cultura': 'cultura',
      'Missão, Visão e Valores': 'cultura',
      'Rituais de Aculturamento': 'cultura',
      'Cronograma de Aculturação': 'cultura',
      'Pesquisa de Clima': 'cultura',
      'Academia de Treinamento': 'treinamentos',
      'Gestão de Treinamentos': 'treinamentos',
      'Configuração da Academia': 'treinamentos',
      'Acompanhamento': 'treinamentos',
      'Meus Treinamentos': 'treinamentos',
      'Dicas da Operação': 'gestao',
      'Criar Desafios Internos': 'gestao',
      'CheckPoint / Cronograma': 'admin'
    };
    
    const module = moduleMap[item.name];
    
    // Se não mapeou, permite acesso (fallback seguro para itens novos)
    if (!module) return true;
    
    // Verificar se tem permissão de visualização para o módulo
    return canViewModule(module);
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside 
        className={cn(
          "fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 transition-all duration-300 flex flex-col print:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className={cn(
          "border-b border-gray-200 transition-all",
          isCollapsed ? "p-3" : "p-6"
        )}>
          {isCollapsed ? (
            <button
              onClick={toggleCollapse}
              className="mx-auto flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors w-full"
              title="Expandir menu"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <Link to={createPageUrl('Home')} className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Oficinas Master</h2>
                  <p className="text-xs text-gray-600">Sistema de Aceleração</p>
                </div>
              </Link>
              <button
                onClick={toggleCollapse}
                className="hidden lg:flex p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Recolher menu"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          {!isCollapsed && (
            <div className="space-y-1 mb-6">
              <Link
                to={createPageUrl('Home')}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  isActive(createPageUrl('Home'))
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Home className="w-5 h-5" />
                <span>Início</span>
              </Link>
            </div>
          )}

          {isCollapsed && (
            <div className="flex flex-col items-center gap-4 py-2">
              <Link
                to={createPageUrl('Home')}
                onClick={onClose}
                className={cn(
                  "p-3 rounded-lg transition-all",
                  isActive(createPageUrl('Home'))
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                )}
                title="Início"
              >
                <Home className="w-5 h-5" />
              </Link>
            </div>
          )}

          <div className="space-y-6">
                    {navigationGroups.map((group) => {
                      // Se o grupo é exclusivo para aceleradores, verificar acesso
                      if (group.aceleradorOnly && !isAcelerador) return null;

                      const visibleItems = group.items.filter(canAccessItem);
                      if (visibleItems.length === 0) return null;

              const isExpanded = expandedGroups.includes(group.id);
              const GroupIcon = group.icon;

              return (
                <div key={group.id}>
                  {!isCollapsed ? (
                    <>
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className="flex items-center justify-between w-full px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <GroupIcon className="w-4 h-4" />
                          <span>{group.label}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="space-y-1 mt-2">
                          {visibleItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);

                            return (
                              <Link
                                key={item.name}
                                to={item.href}
                                onClick={onClose}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative select-none",
                                  active 
                                    ? "bg-blue-50 text-blue-700 font-medium" 
                                    : "text-gray-700 hover:bg-gray-100 active:bg-gray-200",
                                  item.highlight && !active && "bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100 hover:border-blue-200"
                                )}
                              >
                                <Icon className={cn(
                                  "w-5 h-5 flex-shrink-0",
                                  active ? "text-blue-600" : item.highlight ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700"
                                )} />
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm truncate">{item.name}</span>
                                    {item.badge > 0 && (
                                      <Badge className="bg-red-500 text-white ml-2 h-5 min-w-5 px-1.5">
                                        {item.badge}
                                      </Badge>
                                    )}
                                  </div>
                                  {item.description && !active && (
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                      {item.description}
                                    </p>
                                  )}
                                </div>

                                {active && (
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r" />
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>

          {!isCollapsed && (
            <div className="mt-6 px-3 py-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 mb-1">💡 Dica</p>
              <p className="text-xs text-blue-700">
                Complete os diagnósticos para receber planos de ação personalizados!
              </p>
            </div>
          )}

          {/* Item fixo: Escolha seu Plano */}
          <div className="mt-6 border-t border-gray-200 pt-4">
            <Link
              to={createPageUrl('CadastroPlanos')}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all",
                "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-md",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? "Escolha seu Plano" : ""}
            >
              <Crown className="w-5 h-5" />
              {!isCollapsed && (
                <div className="flex-1">
                  <span className="text-sm font-semibold">Escolha seu Plano</span>
                  <p className="text-xs text-purple-100">Upgrade ou altere seu plano</p>
                </div>
              )}
            </Link>
          </div>
        </nav>

        {user && (
          <div className="p-4 border-t border-gray-200">
            <div className={cn(
              "flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg",
              isCollapsed && "justify-center px-0"
            )}>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.full_name || user.email}
                  </p>
                  <p className="text-xs text-gray-600 capitalize">
                    {user.role === 'admin' ? 'Administrador' : user.job_role === 'acelerador' ? 'Acelerador' : user.role === 'user' ? 'Consultor' : 'Usuário'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
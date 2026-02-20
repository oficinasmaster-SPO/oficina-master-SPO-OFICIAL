import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/components/hooks/usePermissions";
import { useAssistanceMode } from "@/components/hooks/useAssistanceMode";
import { base44 } from "@/api/base44Client";
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
  Activity,
  Bug,
  UserCheck,
  Network,
  AlertCircle,
  HelpCircle,
  UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";

function UserProfileSection({ user, collapsed }) {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadEmployee();
    }
  }, [user?.id]);

  const loadEmployee = async () => {
    try {
      let employees = await base44.entities.Employee.filter({ user_id: user.id });
      
      // Fallback: tentar por email se não encontrar por ID
      if (!employees || employees.length === 0) {
        employees = await base44.entities.Employee.filter({ email: user.email });
      }

      if (employees && employees.length > 0) {
        setEmployee(employees[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar employee:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (employee?.full_name) {
      return employee.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    return user?.full_name?.[0] || user?.email?.[0] || 'U';
  };

  const jobRoleLabels = {
    socio: "Sócio",
    diretor: "Diretor",
    supervisor_loja: "Supervisor",
    gerente: "Gerente",
    lider_tecnico: "Líder Técnico",
    financeiro: "Financeiro",
    rh: "RH",
    tecnico: "Técnico",
    funilaria_pintura: "Funilaria/Pintura",
    comercial: "Comercial",
    consultor_vendas: "Consultor",
    marketing: "Marketing",
    estoque: "Estoque",
    administrativo: "Administrativo",
    motoboy: "Motoboy",
    lavador: "Lavador",
    acelerador: "Acelerador",
    consultor: "Consultor",
    outros: "Outros"
  };

  const areaLabels = {
    vendas: "Vendas",
    comercial: "Comercial",
    marketing: "Marketing",
    tecnico: "Técnico",
    administrativo: "Administrativo",
    financeiro: "Financeiro",
    gerencia: "Gerência"
  };

  if (loading) {
    return (
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
          {!collapsed && (
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-gray-200">
      <div className="flex items-center gap-3">
        {employee?.profile_picture_url ? (
          <img 
            src={employee.profile_picture_url} 
            alt={employee.full_name}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-blue-200"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold flex-shrink-0 border-2 border-blue-200">
            {getInitials()}
          </div>
        )}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {employee?.full_name || user?.full_name || user?.email}
            </p>
            <p className="text-xs text-gray-600 truncate">
              {employee ? (
                <>
                  {jobRoleLabels[employee.job_role] || employee.position || 'Colaborador'}
                  {employee.area && ` - ${areaLabels[employee.area] || employee.area}`}
                </>
              ) : (
                user?.role === 'admin' ? 'Administrador' : 'Usuário'
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Sidebar({ user, unreadCount, isOpen, onClose }) {
  const location = useLocation();
  const { profile, hasPermission, canAccessPage } = usePermissions();
  const { queryString } = useAssistanceMode();
  
  const [expandedGroups, setExpandedGroups] = React.useState([]);
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [userWorkshop, setUserWorkshop] = React.useState(null);
  
  // Controle de acesso Admin Global (SPO)
  const [isGlobalContext, setIsGlobalContext] = React.useState(false);
  const GLOBAL_ADMIN_ID = '69540822472c4a70b54d47ab';

  React.useEffect(() => {
    const checkGlobalContext = async () => {
       if (!user) return;
       // 1. Verificar ID direto (Owner Global)
       if (user.id === GLOBAL_ADMIN_ID) {
         setIsGlobalContext(true);
         return;
       }
       // 2. Verificar colaboradores do Admin Global
       try {
         const employees = await base44.entities.Employee.filter({ user_id: user.id });
         if (employees && employees.length > 0) {
            const isGlobalEmployee = employees.some(emp => emp.owner_id === GLOBAL_ADMIN_ID);
            if (isGlobalEmployee) setIsGlobalContext(true);
         }
       } catch (e) {
         console.error("Erro ao verificar contexto global:", e);
       }
    }
    checkGlobalContext();
  }, [user?.id]);

  // Carregar workshop ao montar o componente
  React.useEffect(() => {
    if (user?.id) {
      loadUserWorkshop();
    }
  }, [user?.id]);

  const loadUserWorkshop = async () => {
    try {
      // Tentar carregar workshop do usuário (proprietário ou funcionário)
      let targetWorkshop = null;
      
      // 1. Verificar se é proprietário
      const ownedWorkshops = await base44.entities.Workshop.filter({ owner_id: user.id });
      if (ownedWorkshops && ownedWorkshops.length > 0) {
        targetWorkshop = ownedWorkshops[0];
      } else {
        // 2. Verificar se é funcionário
        const employees = await base44.entities.Employee.filter({ user_id: user.id });
        if (employees && employees.length > 0 && employees[0].workshop_id) {
          try {
            targetWorkshop = await base44.entities.Workshop.get(employees[0].workshop_id);
          } catch (e) {
            console.error("Erro ao carregar workshop do funcionário:", e);
          }
        }
      }
      
      setUserWorkshop(targetWorkshop);
    } catch (error) {
      console.error("Erro ao carregar workshop:", error);
      setUserWorkshop(null);
    }
  };

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

  // Recolher todos os grupos quando a rota mudar (após clicar em um item)
  useEffect(() => {
    setExpandedGroups([]);
  }, [location.pathname]);

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
      label: 'Cadastros (Base de Dados)',
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
          name: 'Convidar Colaborador', 
          href: createPageUrl('ConvidarColaborador'), 
          icon: Users,
          description: 'Enviar convite por e-mail',
          highlight: true,
          requiredPermission: 'employees.create'
        },
        { 
          name: 'Aprovar Colaboradores', 
          href: createPageUrl('AprovarColaboradores'), 
          icon: UserCheck,
          description: 'Aprovar acessos pendentes',
          highlight: true,
          requiredPermission: 'employees.create'
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
          href: createPageUrl('DiagnosticoDISC'), 
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
          aceleradorOnly: true,
          requiredPermission: 'acceleration.manage'
        },
        { 
          name: 'Contratos', 
          href: createPageUrl('GestaoContratos'), 
          icon: Receipt,
          description: 'Gestão e envio de contratos',
          highlight: true,
          globalAdminOnly: true,
          aceleradorOnly: true,
          requiredPermission: 'acceleration.manage'
        },
        { 
          name: 'Relatórios de Aceleração', 
          href: createPageUrl('RelatoriosAceleracao'), 
          icon: FileText,
          description: 'Testes, diagnósticos e desempenho',
          globalAdminOnly: true,
          aceleradorOnly: true,
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
          name: 'Cadastro Direto User', 
          href: createPageUrl('CadastroUsuarioDireto'), 
          icon: UserPlus,
          description: 'Criar usuário direto no sistema',
          globalAdminOnly: true,
          highlight: true,
          requiredPermission: 'admin.users'
        },
        { 
          name: 'Debug Permissões', 
          href: createPageUrl('TestUsuarios'), 
          icon: Bug,
          description: 'Diagnóstico de permissões e perfis',
          globalAdminOnly: true,
          highlight: true,
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
          name: 'Gestão RBAC', 
          href: createPageUrl('GestaoRBAC'), 
          icon: Shield,
          description: 'Perfis e permissões centralizados',
          globalAdminOnly: true,
          highlight: true,
          requiredPermission: 'admin.profiles'
        },
        { 
          name: 'Permissões Granulares', 
          href: createPageUrl('ConfiguracaoPermissoesGranulares'), 
          icon: Settings,
          description: 'Configure por cargo e módulo',
          globalAdminOnly: true,
          highlight: true,
          requiredPermission: 'admin.system_config'
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
          name: 'Usuários Internos', 
          href: createPageUrl('UsuariosAdmin'), 
          icon: Users,
          description: 'Consultores e aceleradores do sistema',
          globalAdminOnly: true,
          highlight: true,
          requiredPermission: 'admin.users'
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
        },
        { 
          name: 'Teste OpenAI', 
          href: createPageUrl('TesteOpenAI'), 
          icon: Sparkles,
          description: 'Testar chave secundária',
          highlight: true,
          globalAdminOnly: true,
          requiredPermission: 'diagnostics.ai_access'
        }
      ]
    }
  ];

  const isActive = (href) => {
    return location.pathname.toLowerCase() === href.toLowerCase();
  };

  const canAccessItem = (item) => {
    // Bloqueio Global: Se o item é exclusivo do Admin Global e o usuário não é, bloqueia
    if (item.globalAdminOnly && !isGlobalContext) return false;

    if (item.public) return true;
    if (!user) return false;

    // Admin sempre tem acesso total
    if (user.role === 'admin') return true;

    // Verificar permissões específicas de acelerador
    if (item.aceleradorOnly && !isAcelerador) return false;

    // Verificação de adminOnly removida em favor do RBAC granular
    
    // Sistema RBAC Granular: Verificar permissão granular se definida
    if (item.requiredPermission) {
      return hasPermission(item.requiredPermission);
    }
    
    // Fallback: permite acesso se não há permissão definida
    return true;
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
              <Link to={createPageUrl('Home') + queryString} className="flex items-center gap-3 flex-1">
                {userWorkshop?.logo_url ? (
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-gray-200 flex items-center justify-center">
                    <img 
                      src={userWorkshop.logo_url} 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--brand-primary))] to-[hsl(var(--brand-secondary))] opacity-90" />
                    <FileText className="w-6 h-6 text-black z-10 relative" />
                  </div>
                )}
                <div>
                  <h2 className="font-bold text-gray-900 truncate max-w-[140px]" title={userWorkshop?.name || "Oficinas Master"}>
                    {userWorkshop?.name || "Oficinas Master"}
                  </h2>
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
                to={createPageUrl('Home') + queryString}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  isActive(createPageUrl('Home'))
                    ? "bg-accent text-primary font-bold shadow-sm"
                    : "text-gray-700 hover:bg-accent/50 hover:text-primary transition-colors"
                )}
              >
                <Home className="w-5 h-5" />
                <span>Início</span>
              </Link>
              <Link
                to={createPageUrl('MeuPerfil') + queryString}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  isActive(createPageUrl('MeuPerfil'))
                    ? "bg-accent text-primary font-bold shadow-sm"
                    : "text-gray-700 hover:bg-accent/50 hover:text-primary transition-colors"
                )}
              >
                <User className="w-5 h-5" />
                <span>Meu Perfil</span>
              </Link>
            </div>
          )}

          {isCollapsed && (
            <div className="flex flex-col items-center gap-4 py-2">
              <Link
                to={createPageUrl('Home') + queryString}
                onClick={onClose}
                className={cn(
                  "p-3 rounded-lg transition-all",
                  isActive(createPageUrl('Home'))
                    ? "bg-accent text-primary"
                    : "text-gray-700 hover:bg-accent/50 hover:text-primary"
                )}
                title="Início"
              >
                <Home className="w-5 h-5" />
              </Link>
              <Link
                to={createPageUrl('MeuPerfil') + queryString}
                onClick={onClose}
                className={cn(
                  "p-3 rounded-lg transition-all",
                  isActive(createPageUrl('MeuPerfil'))
                    ? "bg-accent text-primary"
                    : "text-gray-700 hover:bg-accent/50 hover:text-primary"
                )}
                title="Meu Perfil"
              >
                <User className="w-5 h-5" />
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
                                to={item.href + queryString}
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
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
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

          {/* Item fixo: Escolha seu Plano - Apenas se tem workshop */}
          {userWorkshop && (
           <div className="mt-6 border-t border-gray-200 pt-4">
             <Link
               to={createPageUrl('Planos') + queryString}
               onClick={() => {
                 console.log("[NAV] Sidebar: clique em 'Escolha seu Plano' -> indo para Planos");
                 onClose();
               }}
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
          )}
        </nav>

        {user && <UserProfileSection user={user} collapsed={isCollapsed} />}
      </aside>
    </>
  );
}
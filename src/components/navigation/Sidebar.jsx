import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  FileText, 
  History, 
  Bell, 
  BarChart3, 
  User,
  ChevronDown,
  ChevronRight,
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
  UserCircle,
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
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar({ user, unreadCount, isOpen, onClose }) {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = React.useState(['dashboard', 'cadastros']);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const navigationGroups = [
    {
      id: 'dashboard',
      label: 'Dashboard & Rankings',
      icon: BarChart3,
      items: [
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
        { 
          name: 'Minha Oficina', 
          href: createPageUrl('Cadastro'), 
          icon: Settings,
          description: 'Cadastro básico da oficina'
        }
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
        }
      ]
    },
    {
      id: 'resultados',
      label: 'Resultados (OS, Metas, Finanças)',
      icon: BarChart4,
      items: [
        { 
          name: 'Mapas de Autoavaliação', 
          href: createPageUrl('Autoavaliacoes'), 
          icon: Target,
          description: 'Vendas, Comercial, Marketing, RH...',
          highlight: true
        },
        { 
          name: 'OS - R70/I30 + TCMP²', 
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
        }
      ]
    },
    {
      id: 'pessoas',
      label: 'Pessoas & RH (Colaboradores)',
      icon: Users,
      items: [
        { 
          name: 'Colaboradores', 
          href: createPageUrl('Colaboradores'), 
          icon: Briefcase,
          description: 'Gestão de equipe e RH'
        },
        { 
          name: 'Descrições de Cargo', 
          href: createPageUrl('DescricoesCargo'), 
          icon: ClipboardList,
          description: 'Geração com IA'
        },
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
          name: 'Fase da Oficina', 
          href: createPageUrl('Questionario'), 
          icon: FileText,
          description: '4 Fases de evolução'
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
          name: 'Em Desenvolvimento', 
          href: createPageUrl('Home'), 
          icon: Package,
          description: 'Gestão de processos - em breve'
        }
      ]
    },
    {
      id: 'documentos',
      label: 'Documentos',
      icon: FileCheck,
      items: [
        { 
          name: 'Em Desenvolvimento', 
          href: createPageUrl('Home'), 
          icon: FileCheck,
          description: 'Central de documentos - em breve'
        }
      ]
    },
    {
      id: 'cultura',
      label: 'Cultura',
      icon: Heart,
      items: [
        { 
          name: 'Missão, Visão e Valores', 
          href: createPageUrl('MissaoVisaoValores'), 
          icon: Heart,
          description: 'Cultura organizacional'
        }
      ]
    },
    {
      id: 'treinamentos',
      label: 'Treinamentos',
      icon: GraduationCap,
      items: [
        { 
          name: 'Em Desenvolvimento', 
          href: createPageUrl('Home'), 
          icon: GraduationCap,
          description: 'Cursos e capacitações - em breve'
        }
      ]
    },
    {
      id: 'admin',
      label: 'Administração & Planos',
      icon: Shield,
      items: [
        { 
          name: 'Gestão de Clientes', 
          href: createPageUrl('AdminClientes'), 
          icon: Users,
          description: 'Painel administrativo de clientes',
          adminOnly: true
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
    if (item.adminOnly && user.role !== 'admin') return false;
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
          "fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transition-transform duration-300 flex flex-col print:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-6 border-b border-gray-200">
          <Link to={createPageUrl('Home')} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Oficinas Master</h2>
              <p className="text-xs text-gray-600">Sistema de Aceleração</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
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

          <div className="space-y-6">
            {navigationGroups.map((group) => {
              const visibleItems = group.items.filter(canAccessItem);
              if (visibleItems.length === 0) return null;

              const isExpanded = expandedGroups.includes(group.id);
              const GroupIcon = group.icon;

              return (
                <div key={group.id}>
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
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative",
                              active 
                                ? "bg-blue-50 text-blue-700 font-medium" 
                                : "text-gray-700 hover:bg-gray-100",
                              item.highlight && !active && "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200"
                            )}
                          >
                            <Icon className={cn(
                              "w-5 h-5 flex-shrink-0",
                              active ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700"
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
                </div>
              );
            })}
          </div>

          <div className="mt-6 px-3 py-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <p className="text-xs font-semibold text-blue-900 mb-1">💡 Dica</p>
            <p className="text-xs text-blue-700">
              Complete os diagnósticos para receber planos de ação personalizados!
            </p>
          </div>
        </nav>

        {user && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.full_name || user.email}
                </p>
                <p className="text-xs text-gray-600 capitalize">
                  {user.role === 'admin' ? 'Administrador' : user.role === 'user' ? 'Consultor' : 'Usuário'}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
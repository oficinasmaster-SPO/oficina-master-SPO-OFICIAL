import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, User, ListTodo, Target, MessageSquare, BarChart3, 
  FileText, Trophy, Gauge, Calendar, Phone, LogOut, Menu, X,
  CheckCircle2, Clock, AlertTriangle, TrendingUp, Star, GraduationCap,
  Users, Package
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PortalColaborador() {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [activeSection, setActiveSection] = useState("perfil");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [permissionsConfig, setPermissionsConfig] = useState(null);

  useEffect(() => {
    loadUser();
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const settings = await base44.entities.SystemSetting.filter({ key: 'permissions_config_portal' });
      if (settings && settings[0]) {
        setPermissionsConfig(JSON.parse(settings[0].value));
      }
    } catch (error) {
      console.log("Error loading permissions:", error);
    }
  };

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Buscar colaborador pelo email
      const employees = await base44.entities.Employee.filter({ email: currentUser.email });
      if (employees && employees.length > 0) {
        setEmployee(employees[0]);
        
        // Buscar oficina pelo ID
        if (employees[0].workshop_id) {
          const workshopData = await base44.entities.Workshop.get(employees[0].workshop_id);
          setWorkshop(workshopData);
        }
      }
    } catch (error) {
      console.log("Error loading user:", error);
      base44.auth.redirectToLogin();
    }
  };

  // Buscar tarefas do colaborador
  const { data: tasks = [] } = useQuery({
    queryKey: ['my-tasks', employee?.id, user?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const result = await base44.entities.Task.filter({ workshop_id: workshop.id });
      const tasksArray = Array.isArray(result) ? result : [];
      return tasksArray.filter(t => 
        t.assigned_to?.includes(employee?.id) || 
        t.assigned_to?.includes(user?.id) ||
        t.employee_id === employee?.id
      );
    },
    enabled: !!workshop?.id && (!!employee?.id || !!user?.id)
  });

  // Buscar feedbacks
  const { data: feedbacks = [] } = useQuery({
    queryKey: ['my-feedbacks', employee?.id],
    queryFn: () => employee?.feedbacks || [],
    enabled: !!employee
  });

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const menuItems = [
    { id: "perfil", label: "Meu Perfil", icon: User },
    { id: "tarefas", label: "Minhas Tarefas", icon: ListTodo },
    { id: "equipe", label: "Minha Equipe", icon: Users },
    { id: "financeiro", label: "Financeiro", icon: TrendingUp },
    { id: "comercial", label: "Vendas & CRM", icon: Phone },
    { id: "metas", label: "Minhas Metas", icon: Target },
    { id: "feedbacks", label: "Meus Feedbacks", icon: MessageSquare },
    { id: "desempenho", label: "Desempenho", icon: BarChart3 },
    { id: "documentos", label: "Documentos", icon: FileText },
    { id: "treinamentos", label: "Meus Treinamentos", icon: GraduationCap },
    { id: "gamificacao", label: "Gamificação", icon: Trophy },
    { id: "qgp", label: "QGP Pessoal", icon: Gauge },
    { id: "estoque", label: "Estoque", icon: Package },
    { id: "agenda", label: "Agenda", icon: Calendar }
  ];

  const canViewModule = (moduleId) => {
    // Admin e Diretor (Dono) sempre têm acesso total
    if (user.role === 'admin' || (workshop && user.id === workshop.owner_id)) return true;

    // Se não há configuração de permissões, usa padrão: perfil, tarefas, metas e feedbacks sempre visíveis
    if (!permissionsConfig || !employee?.job_role) {
      return ['perfil', 'tarefas', 'metas', 'feedbacks', 'documentos', 'treinamentos'].includes(moduleId);
    }

    const permission = permissionsConfig[employee.job_role]?.[moduleId];
    
    // Se a permissão foi explicitamente definida, respeita
    if (permission !== undefined) return permission;

    // Padrão: apenas módulos básicos
    return ['perfil', 'tarefas', 'metas', 'feedbacks'].includes(moduleId);
  };

  const filterMenuItems = () => {
    return menuItems.filter(item => canViewModule(item.id));
  };

  const filteredMenuItems = filterMenuItems();

  const pendingTasks = tasks.filter(t => t.status === 'pendente').length;
  const inProgressTasks = tasks.filter(t => t.status === 'em_andamento').length;
  const completedTasks = tasks.filter(t => t.status === 'concluida').length;

  if (!user || !employee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-100">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case "perfil":
        return (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {employee.profile_picture_url ? (
                    <img 
                      src={employee.profile_picture_url} 
                      alt={employee.full_name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">
                        {employee.full_name?.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="text-center md:text-left">
                    <h2 className="text-2xl font-bold text-gray-900">{employee.full_name}</h2>
                    <p className="text-gray-600">{employee.position}</p>
                    <Badge className="mt-2 capitalize">{employee.area}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">E-mail</span>
                    <p className="font-medium">{employee.email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Telefone</span>
                    <p className="font-medium">{employee.telefone || "Não informado"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Data de Admissão</span>
                    <p className="font-medium">
                      {employee.hire_date ? format(new Date(employee.hire_date), "dd/MM/yyyy", { locale: ptBR }) : "Não informada"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumo de Atividades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Tarefas Pendentes</span>
                      <Badge variant="outline" className="bg-yellow-50">{pendingTasks}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Em Andamento</span>
                      <Badge variant="outline" className="bg-blue-50">{inProgressTasks}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Concluídas</span>
                      <Badge variant="outline" className="bg-green-50">{completedTasks}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "tarefas":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-4 text-center">
                  <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-800">{pendingTasks}</p>
                  <p className="text-sm text-yellow-700">Pendentes</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4 text-center">
                  <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-800">{inProgressTasks}</p>
                  <p className="text-sm text-blue-700">Em Andamento</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-800">{completedTasks}</p>
                  <p className="text-sm text-green-700">Concluídas</p>
                </CardContent>
              </Card>
            </div>

            {tasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <ListTodo className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhuma tarefa atribuída</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{task.title}</h3>
                          {task.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className={
                              task.priority === 'urgente' ? 'bg-red-50 text-red-700' :
                              task.priority === 'alta' ? 'bg-orange-50 text-orange-700' :
                              task.priority === 'media' ? 'bg-blue-50 text-blue-700' :
                              'bg-gray-50 text-gray-700'
                            }>
                              {task.priority}
                            </Badge>
                            {task.due_date && (
                              <Badge variant="outline">
                                <Calendar className="w-3 h-3 mr-1" />
                                {format(new Date(task.due_date), "dd/MM", { locale: ptBR })}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge className={
                          task.status === 'concluida' ? 'bg-green-100 text-green-700' :
                          task.status === 'em_andamento' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }>
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      {task.progress > 0 && (
                        <div className="mt-3">
                          <Progress value={task.progress} className="h-2" />
                          <p className="text-xs text-gray-500 mt-1">{task.progress}% concluído</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case "metas":
        const employeeGoals = employee?.monthly_goals || {};
        const individualGoal = employeeGoals.individual_goal || 0;
        const actualRevenue = employeeGoals.actual_revenue_achieved || 0;
        const achievementPercentage = individualGoal > 0 ? (actualRevenue / individualGoal * 100) : 0;
        const dailyGoal = employeeGoals.daily_projected_goal || 0;

        return (
          <div className="space-y-4">
            <Card className="border-l-4 border-blue-500">
              <CardHeader>
                <CardTitle>Minhas Metas do Mês</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Meta Mensal</p>
                    <p className="text-2xl font-bold text-blue-600">
                      R$ {individualGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Realizado</p>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {actualRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Atingimento</span>
                    <span className={`text-sm font-bold ${achievementPercentage >= 100 ? 'text-green-600' : achievementPercentage >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {achievementPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={Math.min(achievementPercentage, 100)} className="h-3" />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Meta Diária Projetada</p>
                  <p className="text-xl font-bold text-blue-700">
                    R$ {dailyGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Para atingir a meta mensal
                  </p>
                </div>

                {individualGoal === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">Suas metas ainda não foram definidas</p>
                    <p className="text-xs mt-1">Aguarde seu gestor realizar o desdobramento de metas</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "feedbacks":
        return (
          <div className="space-y-4">
            {feedbacks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhum feedback registrado</p>
                </CardContent>
              </Card>
            ) : (
              feedbacks.map((feedback, idx) => (
                <Card key={idx}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={
                        feedback.type === 'positivo' ? 'bg-green-100 text-green-700' :
                        feedback.type === 'negativo' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }>
                        {feedback.type}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {feedback.date ? format(new Date(feedback.date), "dd/MM/yyyy", { locale: ptBR }) : ""}
                      </span>
                    </div>
                    <p className="text-gray-700">{feedback.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        );

      case "desempenho":
        return (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Seu histórico de desempenho</p>
              <p className="text-sm mt-2">Avaliações e produtividade serão exibidas aqui</p>
            </CardContent>
          </Card>
        );

      case "documentos":
        return (
          <div className="space-y-4">
            {(!employee.documents || employee.documents.length === 0) ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhum documento anexado</p>
                </CardContent>
              </Card>
            ) : (
              employee.documents.map((doc, idx) => (
                <Card key={idx}>
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-gray-500">{doc.type}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">Ver</a>
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        );

      case "treinamentos":
        return (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-900">Universidade Corporativa</p>
              <p className="text-sm mt-2 mb-6">Acesse seus cursos, aulas e avaliações para evoluir na carreira.</p>
              <Button onClick={() => window.location.href = createPageUrl('MeusTreinamentos')} className="bg-blue-600 hover:bg-blue-700">
                Acessar Meus Treinamentos
              </Button>
            </CardContent>
          </Card>
        );

      case "gamificacao":
        return (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Ranking e conquistas</p>
              <p className="text-sm mt-2">Seus pontos e posição no ranking</p>
            </CardContent>
          </Card>
        );

      case "qgp":
        return (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Gauge className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>QGP Pessoal</p>
              <p className="text-sm mt-2">Termômetro de produtividade e alertas</p>
            </CardContent>
          </Card>
        );

      case "agenda":
        return (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Sua agenda pessoal</p>
              <p className="text-sm mt-2">Compromissos e tarefas diárias</p>
            </CardContent>
          </Card>
        );

      case "comercial":
        return (
          <div className="space-y-4">
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Phone className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Módulo Comercial</p>
                <p className="text-sm mt-2">CRM, Funil de Vendas e Metas Comerciais</p>
                <Button variant="outline" className="mt-4">Acessar CRM Completo</Button>
              </CardContent>
            </Card>
          </div>
        );

      case "financeiro":
        return (
          <div className="space-y-4">
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Módulo Financeiro</p>
                <p className="text-sm mt-2">Fluxo de Caixa, DRE e Contas a Pagar/Receber</p>
                <Button variant="outline" className="mt-4">Ver Relatórios</Button>
              </CardContent>
            </Card>
          </div>
        );

      case "equipe":
        return (
          <div className="space-y-4">
             <Card>
              <CardHeader>
                <CardTitle>Minha Equipe</CardTitle>
              </CardHeader>
              <CardContent className="py-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Gestão de Equipe</p>
                <p className="text-sm mt-2">Visualize o desempenho e tarefas da sua equipe</p>
                <Button variant="outline" className="mt-4" onClick={() => window.location.href = createPageUrl('Colaboradores')}>
                  Gerenciar Colaboradores
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case "estoque":
        return (
          <div className="space-y-4">
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Controle de Estoque</p>
                <p className="text-sm mt-2">Gestão de peças e inventário</p>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-100">
      {/* Sidebar Mobile Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-slate-800 to-slate-900 
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            {employee.profile_picture_url ? (
              <img 
                src={employee.profile_picture_url} 
                alt={employee.full_name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold">{employee.full_name?.charAt(0)}</span>
              </div>
            )}
            <div>
              <p className="text-white font-medium text-sm truncate">{employee.full_name}</p>
              <p className="text-slate-400 text-xs">{employee.position}</p>
            </div>
          </div>
          <p className="text-slate-500 text-xs mt-3">{workshop?.name}</p>
        </div>

        {/* Menu */}
        <nav className="p-4 space-y-1">
          {filteredMenuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors
                  ${activeSection === item.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'}
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="bg-white shadow-sm border-b p-4 lg:p-6">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 ml-12 lg:ml-0">
            {menuItems.find(m => m.id === activeSection)?.label || "Portal"}
          </h1>
        </header>

        {/* Content */}
        <div className="p-4 lg:p-6">
          {renderContent()}
        </div>
      </main>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
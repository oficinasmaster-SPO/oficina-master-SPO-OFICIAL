import {
  LayoutDashboard, Users, Wrench, BarChart4, Brain,
  FileText, Heart, GraduationCap, Lightbulb, Briefcase, Shield
} from "lucide-react";

// Roles oficiais do sistema - Fonte única da verdade
export const systemRoles = [
  {
    id: "dashboard",
    name: "Dashboard & Analytics",
    icon: LayoutDashboard,
    roles: [
      {
        id: "dashboard.view",
        name: "Visualizar Dashboard",
        description: "Acesso à visão geral e métricas",
        permissions: ["view"],
      },
      {
        id: "dashboard.edit",
        name: "Editar Dashboard",
        description: "Configurar widgets e indicadores",
        permissions: ["view", "edit"],
      },
      {
        id: "dashboard.export",
        name: "Exportar Relatórios",
        description: "Exportar dados e gráficos",
        permissions: ["view", "export"],
      },
    ],
  },
  {
    id: "workshop",
    name: "Gestão de Oficina",
    icon: Wrench,
    roles: [
      {
        id: "workshop.view",
        name: "Visualizar Dados da Oficina",
        description: "Ver informações cadastrais",
        permissions: ["view"],
      },
      {
        id: "workshop.edit",
        name: "Editar Dados da Oficina",
        description: "Alterar cadastro e configurações",
        permissions: ["view", "edit"],
      },
      {
        id: "workshop.manage_goals",
        name: "Gerenciar Metas",
        description: "Criar e editar metas da oficina",
        permissions: ["view", "edit", "create"],
      },
    ],
  },
  {
    id: "employees",
    name: "Gestão de Pessoas",
    icon: Users,
    roles: [
      {
        id: "employees.view",
        name: "Visualizar Colaboradores",
        description: "Ver lista e dados dos colaboradores",
        permissions: ["view"],
      },
      {
        id: "employees.create",
        name: "Cadastrar Colaboradores",
        description: "Adicionar novos colaboradores",
        permissions: ["view", "create"],
      },
      {
        id: "employees.edit",
        name: "Editar Colaboradores",
        description: "Alterar dados de colaboradores",
        permissions: ["view", "edit"],
      },
      {
        id: "employees.delete",
        name: "Excluir Colaboradores",
        description: "Remover colaboradores do sistema",
        permissions: ["view", "delete"],
      },
      {
        id: "employees.manage_permissions",
        name: "Gerenciar Permissões",
        description: "Controlar acessos de colaboradores",
        permissions: ["view", "edit", "approve"],
      },
    ],
  },
  {
    id: "financeiro",
    name: "Financeiro & Resultados",
    icon: BarChart4,
    roles: [
      {
        id: "financeiro.view",
        name: "Visualizar Dados Financeiros",
        description: "Ver DRE, metas e resultados",
        permissions: ["view"],
      },
      {
        id: "financeiro.edit",
        name: "Editar Dados Financeiros",
        description: "Alterar DRE e metas",
        permissions: ["view", "edit"],
      },
      {
        id: "financeiro.approve",
        name: "Aprovar Dados Financeiros",
        description: "Validar e aprovar registros",
        permissions: ["view", "approve"],
      },
      {
        id: "financeiro.export",
        name: "Exportar Relatórios",
        description: "Gerar relatórios financeiros",
        permissions: ["view", "export"],
      },
    ],
  },
  {
    id: "diagnostics",
    name: "Diagnósticos & IA",
    icon: Brain,
    roles: [
      {
        id: "diagnostics.view",
        name: "Visualizar Diagnósticos",
        description: "Ver diagnósticos realizados",
        permissions: ["view"],
      },
      {
        id: "diagnostics.create",
        name: "Realizar Diagnósticos",
        description: "Criar novos diagnósticos",
        permissions: ["view", "create"],
      },
      {
        id: "diagnostics.ai_access",
        name: "Acessar IA Analytics",
        description: "Usar recursos de inteligência artificial",
        permissions: ["view", "create"],
      },
    ],
  },
  {
    id: "processes",
    name: "Processos & Documentos",
    icon: FileText,
    roles: [
      {
        id: "processes.view",
        name: "Visualizar Processos",
        description: "Ver MAPs e documentos",
        permissions: ["view"],
      },
      {
        id: "processes.create",
        name: "Criar Processos",
        description: "Adicionar novos processos",
        permissions: ["view", "create"],
      },
      {
        id: "processes.edit",
        name: "Editar Processos",
        description: "Alterar processos existentes",
        permissions: ["view", "edit"],
      },
      {
        id: "documents.upload",
        name: "Upload de Documentos",
        description: "Fazer upload de arquivos",
        permissions: ["view", "create"],
      },
    ],
  },
  {
    id: "culture",
    name: "Cultura Organizacional",
    icon: Heart,
    roles: [
      {
        id: "culture.view",
        name: "Visualizar Cultura",
        description: "Ver MVV e rituais",
        permissions: ["view"],
      },
      {
        id: "culture.edit",
        name: "Editar Cultura",
        description: "Alterar MVV e configurar rituais",
        permissions: ["view", "edit"],
      },
      {
        id: "culture.manage_rituals",
        name: "Gerenciar Rituais",
        description: "Criar e agendar rituais",
        permissions: ["view", "edit", "create"],
      },
    ],
  },
  {
    id: "training",
    name: "Treinamentos",
    icon: GraduationCap,
    roles: [
      {
        id: "training.view",
        name: "Visualizar Treinamentos",
        description: "Ver módulos e aulas",
        permissions: ["view"],
      },
      {
        id: "training.create",
        name: "Criar Treinamentos",
        description: "Adicionar módulos e conteúdo",
        permissions: ["view", "create"],
      },
      {
        id: "training.manage",
        name: "Gerenciar Treinamentos",
        description: "Controle completo de treinamentos",
        permissions: ["view", "edit", "create", "delete"],
      },
      {
        id: "training.evaluate",
        name: "Avaliar Alunos",
        description: "Corrigir avaliações e dar feedback",
        permissions: ["view", "approve"],
      },
    ],
  },
  {
    id: "operations",
    name: "Operações & QGP",
    icon: Lightbulb,
    roles: [
      {
        id: "operations.view_qgp",
        name: "Visualizar QGP",
        description: "Ver quadro geral de produção",
        permissions: ["view"],
      },
      {
        id: "operations.manage_tasks",
        name: "Gerenciar Tarefas",
        description: "Criar e editar tarefas operacionais",
        permissions: ["view", "edit", "create"],
      },
      {
        id: "operations.daily_log",
        name: "Registro Diário",
        description: "Lançar produção diária",
        permissions: ["view", "create"],
      },
    ],
  },
  {
    id: "acceleration",
    name: "Aceleração",
    icon: Briefcase,
    roles: [
      {
        id: "acceleration.view",
        name: "Visualizar Plano",
        description: "Ver plano de aceleração",
        permissions: ["view"],
      },
      {
        id: "acceleration.manage",
        name: "Gerenciar Aceleração",
        description: "Controlar todo processo (Aceleradores)",
        permissions: ["view", "edit", "create", "approve"],
      },
    ],
  },
  {
    id: "admin",
    name: "Administração",
    icon: Shield,
    roles: [
      {
        id: "admin.users",
        name: "Gerenciar Usuários",
        description: "CRUD completo de usuários",
        permissions: ["view", "edit", "create", "delete"],
      },
      {
        id: "admin.profiles",
        name: "Gerenciar Perfis",
        description: "Gestão de perfis e roles",
        permissions: ["view", "edit", "create", "delete"],
      },
      {
        id: "admin.system_config",
        name: "Configurações do Sistema",
        description: "Ajustes globais da plataforma",
        permissions: ["view", "edit"],
      },
      {
        id: "admin.audit",
        name: "Auditoria",
        description: "Ver logs e auditoria completa",
        permissions: ["view"],
      },
    ],
  },
];
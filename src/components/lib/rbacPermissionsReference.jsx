/**
 * Referência de Permissões RBAC - Oficinas Master
 * 
 * Documento técnico que mapeia todas as permissões granulares do sistema
 * para uso em UserProfile.roles
 */

export const rbacPermissions = {
  // ===== DASHBOARD & ANALYTICS =====
  "dashboard.view": {
    description: "Visualizar dashboards e métricas gerais",
    level: "básico"
  },
  
  // ===== WORKSHOP & CADASTROS =====
  "workshop.view": {
    description: "Visualizar dados da oficina",
    level: "básico"
  },
  "workshop.manage_goals": {
    description: "Gerenciar metas e objetivos",
    level: "intermediário"
  },
  
  // ===== EMPLOYEES & RH =====
  "employees.view": {
    description: "Visualizar colaboradores",
    level: "básico"
  },
  "employees.create": {
    description: "Convidar e cadastrar colaboradores",
    level: "intermediário"
  },
  "employees.edit": {
    description: "Editar dados de colaboradores",
    level: "intermediário"
  },
  
  // ===== FINANCEIRO =====
  "financeiro.view": {
    description: "Visualizar relatórios financeiros",
    level: "básico"
  },
  
  // ===== DIAGNOSTICS =====
  "diagnostics.view": {
    description: "Visualizar diagnósticos",
    level: "básico"
  },
  "diagnostics.create": {
    description: "Criar novos diagnósticos",
    level: "intermediário"
  },
  "diagnostics.ai_access": {
    description: "Acessar IA Analytics e previsões",
    level: "avançado"
  },
  
  // ===== PROCESSES =====
  "processes.view": {
    description: "Visualizar processos (MAPs)",
    level: "básico"
  },
  "processes.create": {
    description: "Criar e editar processos",
    level: "intermediário"
  },
  "processes.admin": {
    description: "Administrar biblioteca de processos (upload, gestão global)",
    level: "administrativo",
    note: "Liberado para internos e perfis específicos via RBAC"
  },
  
  // ===== DOCUMENTS =====
  "documents.upload": {
    description: "Fazer upload e gerenciar documentos",
    level: "intermediário"
  },
  
  // ===== CULTURE =====
  "culture.view": {
    description: "Visualizar cultura organizacional",
    level: "básico"
  },
  "culture.edit": {
    description: "Editar missão, visão, valores e regimento",
    level: "intermediário"
  },
  "culture.manage_rituals": {
    description: "Gerenciar rituais de aculturamento",
    level: "avançado"
  },
  
  // ===== TRAINING =====
  "training.view": {
    description: "Visualizar e consumir treinamentos",
    level: "básico"
  },
  "training.create": {
    description: "Criar módulos e aulas",
    level: "intermediário"
  },
  "training.manage": {
    description: "Gerenciar treinamentos completos",
    level: "avançado"
  },
  "training.evaluate": {
    description: "Acompanhar progresso de alunos",
    level: "intermediário"
  },
  
  // ===== OPERATIONS & QGP =====
  "operations.view_qgp": {
    description: "Visualizar quadros operacionais (QGP)",
    level: "básico"
  },
  "operations.daily_log": {
    description: "Registrar diário de produção",
    level: "intermediário"
  },
  "operations.manage_tasks": {
    description: "Gerenciar tarefas e planos de ação",
    level: "intermediário"
  },
  
  // ===== ACCELERATION =====
  "acceleration.view": {
    description: "Visualizar plano de aceleração e cronograma",
    level: "básico"
  },
  "acceleration.manage": {
    description: "Gerenciar atendimentos, contratos e cronogramas",
    level: "avançado",
    note: "Exclusivo para consultores internos"
  },
  
  // ===== ADMIN - SISTEMA BASE44 (APENAS ADMIN REAL) =====
  "admin.system_config": {
    description: "Configurações do sistema Base44",
    level: "super_admin",
    note: "Apenas role=admin do Base44"
  },
  "admin.users": {
    description: "Gerenciar usuários do sistema Base44",
    level: "super_admin",
    note: "Apenas role=admin do Base44"
  },
  "admin.audit": {
    description: "Logs de auditoria e monitoramento",
    level: "super_admin",
    note: "Apenas role=admin do Base44"
  },
  "admin.profiles": {
    description: "Gestão RBAC completa",
    level: "super_admin",
    note: "Apenas role=admin do Base44"
  },
  "admin.financial_dashboard": {
    description: "Dashboard financeiro do sistema",
    level: "super_admin",
    note: "Apenas role=admin do Base44"
  },
  
  // ===== TELAS ADMIN LIBERADAS VIA RBAC (EXTERNOS/INTERNOS) =====
  "plans.change": {
    description: "Escolher e mudar plano da oficina",
    level: "administrativo",
    note: "Liberado para perfis específicos (Closer, Marketing, SDR, CS, Financeiro, Consultor/Mentor)"
  },
  "plans.manage": {
    description: "Gerenciar planos disponíveis (criar/editar features)",
    level: "administrativo",
    note: "Liberado apenas para Consultor/Mentor (interno)"
  },
  "productivity.settings": {
    description: "Configurar métricas de produtividade",
    level: "administrativo",
    note: "Liberado para todos os perfis externos e internos"
  },
  "challenge.manage": {
    description: "Criar e gerenciar desafios",
    level: "administrativo",
    note: "Liberado para todos os perfis externos e internos"
  },
  "events.calendar": {
    description: "Gerenciar calendário de eventos anuais",
    level: "administrativo",
    note: "Liberado para todos os perfis externos e internos"
  },
  "messages.templates": {
    description: "Gerenciar templates de mensagem",
    level: "administrativo",
    note: "Liberado para todos os perfis externos e internos"
  },
  "email.manage": {
    description: "Configurar automação de e-mails",
    level: "administrativo",
    note: "Liberado para todos os perfis externos e internos"
  },
  "processes.admin": {
    description: "Administrar processos (upload MAPs, gestão global)",
    level: "administrativo",
    note: "Liberado apenas para Consultor/Mentor (interno)"
  },
  "internal_users.manage": {
    description: "Gerenciar usuários internos (consultores/aceleradores)",
    level: "administrativo",
    note: "Liberado apenas para Consultor/Mentor (interno)"
  }
};

/**
 * Agrupa permissões por nível de acesso
 */
export const permissionsByLevel = {
  básico: [
    "dashboard.view",
    "workshop.view",
    "employees.view",
    "financeiro.view",
    "diagnostics.view",
    "processes.view",
    "culture.view",
    "training.view",
    "operations.view_qgp",
    "acceleration.view"
  ],
  intermediário: [
    "workshop.manage_goals",
    "employees.create",
    "employees.edit",
    "diagnostics.create",
    "processes.create",
    "culture.edit",
    "training.create",
    "training.evaluate",
    "operations.daily_log",
    "operations.manage_tasks",
    "documents.upload"
  ],
  avançado: [
    "diagnostics.ai_access",
    "culture.manage_rituals",
    "training.manage",
    "acceleration.manage"
  ],
  administrativo: [
    "plans.change",
    "plans.manage",
    "productivity.settings",
    "challenge.manage",
    "events.calendar",
    "messages.templates",
    "email.manage",
    "processes.admin",
    "internal_users.manage"
  ],
  super_admin: [
    "admin.system_config",
    "admin.users",
    "admin.audit",
    "admin.profiles",
    "admin.financial_dashboard"
  ]
};

/**
 * Matriz de acesso por perfil (para referência)
 */
export const profileAccessMatrix = {
  "Closer": {
    type: "externo",
    permissions: ["messages.templates", "email.manage", "events.calendar", "challenge.manage", "productivity.settings"]
  },
  "Marketing": {
    type: "externo",
    permissions: ["messages.templates", "email.manage", "events.calendar", "challenge.manage", "productivity.settings"]
  },
  "SDR": {
    type: "externo",
    permissions: ["messages.templates", "email.manage", "events.calendar", "challenge.manage", "productivity.settings"]
  },
  "CS (Customer Success)": {
    type: "externo",
    permissions: ["messages.templates", "email.manage", "events.calendar", "challenge.manage", "productivity.settings"]
  },
  "Financeiro": {
    type: "externo",
    permissions: ["messages.templates", "email.manage", "events.calendar", "challenge.manage", "productivity.settings"]
  },
  "Consultor / Mentor (Interno)": {
    type: "interno",
    permissions: [
      "messages.templates",
      "email.manage",
      "events.calendar",
      "challenge.manage",
      "productivity.settings",
      "processes.admin",
      "internal_users.manage",
      "plans.manage",
      "plans.change",
      "acceleration.view",
      "acceleration.manage"
    ]
  }
};
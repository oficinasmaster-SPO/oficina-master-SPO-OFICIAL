import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar perfis existentes
    const existingProfiles = await base44.asServiceRole.entities.UserProfile.list();
    
    // Perfis padrão do sistema
    const defaultProfiles = [
      {
        name: "Administrador Master",
        type: "interno",
        description: "Acesso total ao sistema - Administrador da plataforma",
        is_system,
        status: "ativo",
        job_roles: [],
        permission_type: "role",
        roles: [
          "admin.users", "admin.profiles", "admin.system_config", "admin.audit",
          "dashboard.view", "dashboard.edit", "dashboard.export",
          "workshop.view", "workshop.edit", "workshop.manage_goals",
          "employees.view", "employees.create", "employees.edit", "employees.delete", "employees.manage_permissions",
          "financeiro.view", "financeiro.edit", "financeiro.approve", "financeiro.export",
          "diagnostics.view", "diagnostics.create", "diagnostics.ai_access",
          "processes.view", "processes.create", "processes.edit", "documents.upload",
          "culture.view", "culture.edit", "culture.manage_rituals",
          "training.view", "training.create", "training.manage", "training.evaluate",
          "operations.view_qgp", "operations.manage_tasks", "operations.daily_log",
          "acceleration.view", "acceleration.manage"
        ],
        module_permissions: {
          dashboard: "total", cadastros: "total", patio: "total",
          resultados: "total", pessoas: "total", diagnosticos: "total",
          processos: "total", documentos: "total", cultura: "total",
          treinamentos: "total", gestao: "total", aceleracao: "total", admin: "total"
        }
      },
      {
        name: "Gestor Completo",
        type: "interno",
        description: "Proprietário/Sócio com acesso total à gestão da oficina",
        is_system,
        status: "ativo",
        job_roles: ["socio", "diretor"],
        permission_type: "job_role",
        roles: [
          "dashboard.view", "dashboard.edit", "dashboard.export",
          "workshop.view", "workshop.edit", "workshop.manage_goals",
          "employees.view", "employees.create", "employees.edit", "employees.manage_permissions",
          "financeiro.view", "financeiro.edit", "financeiro.export",
          "diagnostics.view", "diagnostics.create", "diagnostics.ai_access",
          "processes.view", "processes.create", "processes.edit", "documents.upload",
          "culture.view", "culture.edit", "culture.manage_rituals",
          "training.view", "training.create", "training.evaluate",
          "operations.view_qgp", "operations.manage_tasks", "operations.daily_log"
        ],
        module_permissions: {
          dashboard: "total", cadastros: "total", patio: "total",
          resultados: "total", pessoas: "total", diagnosticos: "total",
          processos: "total", documentos: "total", cultura: "total",
          treinamentos: "total", gestao: "total", aceleracao: "visualizacao", admin: "bloqueado"
        }
      },
      {
        name: "Gerente de Operações",
        type: "interno",
        description: "Gerenciamento operacional completo",
        is_system,
        status: "ativo",
        job_roles: ["gerente", "supervisor_loja", "lider_tecnico"],
        permission_type: "job_role",
        roles: [
          "dashboard.view", "workshop.view",
          "employees.view", "employees.edit",
          "financeiro.view", "diagnostics.view",
          "processes.view", "documents.upload",
          "operations.view_qgp", "operations.manage_tasks", "operations.daily_log"
        ],
        module_permissions: {
          dashboard: "visualizacao", cadastros: "visualizacao", patio: "total",
          resultados: "visualizacao", pessoas: "total", diagnosticos: "visualizacao",
          processos: "visualizacao", documentos: "visualizacao", cultura: "visualizacao",
          treinamentos: "visualizacao", gestao: "total", aceleracao: "bloqueado", admin: "bloqueado"
        }
      },
      {
        name: "Técnico/Mecânico",
        type: "interno",
        description: "Acesso operacional para técnicos",
        is_system,
        status: "ativo",
        job_roles: ["tecnico", "funilaria_pintura", "estoque"],
        permission_type: "job_role",
        roles: [
          "dashboard.view", "operations.view_qgp", "operations.daily_log",
          "processes.view", "training.view"
        ],
        module_permissions: {
          dashboard: "visualizacao", cadastros: "bloqueado", patio: "visualizacao",
          resultados: "bloqueado", pessoas: "bloqueado", diagnosticos: "bloqueado",
          processos: "visualizacao", documentos: "bloqueado", cultura: "visualizacao",
          treinamentos: "visualizacao", gestao: "visualizacao", aceleracao: "bloqueado", admin: "bloqueado"
        }
      },
      {
        name: "Comercial/Vendas",
        type: "interno",
        description: "Equipe de vendas e atendimento",
        is_system,
        status: "ativo",
        job_roles: ["comercial", "consultor_vendas", "marketing"],
        permission_type: "job_role",
        roles: [
          "dashboard.view", "operations.view_qgp", "operations.daily_log",
          "financeiro.view", "processes.view"
        ],
        module_permissions: {
          dashboard: "visualizacao", cadastros: "visualizacao", patio: "visualizacao",
          resultados: "visualizacao", pessoas: "bloqueado", diagnosticos: "bloqueado",
          processos: "visualizacao", documentos: "bloqueado", cultura: "visualizacao",
          treinamentos: "visualizacao", gestao: "visualizacao", aceleracao: "bloqueado", admin: "bloqueado"
        }
      },
      {
        name: "Consultor/Acelerador",
        type: "interno",
        description: "Consultores da plataforma com acesso de suporte",
        is_system,
        status: "ativo",
        job_roles: ["consultor", "acelerador"],
        permission_type: "job_role",
        roles: [
          "dashboard.view", "dashboard.export",
          "workshop.view", "employees.view",
          "financeiro.view", "financeiro.export",
          "diagnostics.view", "diagnostics.create", "diagnostics.ai_access",
          "acceleration.view", "acceleration.manage"
        ],
        module_permissions: {
          dashboard: "total", cadastros: "visualizacao", patio: "visualizacao",
          resultados: "visualizacao", pessoas: "visualizacao", diagnosticos: "total",
          processos: "visualizacao", documentos: "visualizacao", cultura: "visualizacao",
          treinamentos: "visualizacao", gestao: "visualizacao", aceleracao: "total", admin: "bloqueado"
        }
      },
      {
        name: "Cliente Externo",
        type: "externo",
        description: "Cliente com acesso limitado para consultas",
        is_system,
        status: "ativo",
        job_roles: [],
        permission_type: "role",
        roles: ["dashboard.view"],
        module_permissions: {
          dashboard: "visualizacao", cadastros: "bloqueado", patio: "bloqueado",
          resultados: "bloqueado", pessoas: "bloqueado", diagnosticos: "bloqueado",
          processos: "bloqueado", documentos: "bloqueado", cultura: "bloqueado",
          treinamentos: "bloqueado", gestao: "bloqueado", aceleracao: "bloqueado", admin: "bloqueado"
        }
      }
    ];

    const createdProfiles = [];
    
    for (const profile of defaultProfiles) {
      const exists = existingProfiles.find(p => p.name === profile.name);
      if (!exists) {
        const created = await base44.asServiceRole.entities.UserProfile.create({
          ...profile,
          users_count: 0,
          sidebar_permissions: {},
          audit_log: [{
            changed_by: "Sistema",
            changed_by_email: "system@oficinasmaster.com",
            changed_at Date().toISOString(),
            action: "create",
            field_changed: "initial_creation",
            old_value: "",
            new_value: "Perfil criado automaticamente",
            affected_users_count: 0
          }]
        });
        createdProfiles.push(created);
      }
    }

    return Response.json({
      success,
      message: `${createdProfiles.length} perfis criados`,
      total_profiles.length + createdProfiles.length,
      created.map(p => p.name)
    });

  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error.message }, { status: 500 });
  }
});

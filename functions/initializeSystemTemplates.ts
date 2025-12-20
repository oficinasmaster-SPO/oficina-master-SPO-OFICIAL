import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Templates de Roles Customizadas
    const roleTemplates = [
      {
        name: 'Template Desenvolvedor',
        description: 'Permissões padrão para desenvolvedores: acesso a código, documentação e processos técnicos',
        system_roles: [
          'dashboard.view',
          'employees.view',
          'processes.view',
          'processes.edit',
          'documents.view',
          'documents.edit'
        ],
        entity_permissions: {
          'ProcessDocument': ['read', 'create', 'update'],
          'CompanyDocument': ['read'],
          'Employee': ['read']
        },
        is_system: true,
        usage_count: 0
      },
      {
        name: 'Template Marketing',
        description: 'Permissões para equipe de marketing: clientes, campanhas e análises',
        system_roles: [
          'dashboard.view',
          'clients.view',
          'clients.edit',
          'clients.create',
          'analytics.view'
        ],
        entity_permissions: {
          'Client': ['read', 'create', 'update'],
          'CustomerFeedback': ['read', 'create']
        },
        is_system: true,
        usage_count: 0
      },
      {
        name: 'Template RH',
        description: 'Permissões para recursos humanos: gestão de colaboradores e treinamentos',
        system_roles: [
          'employees.view',
          'employees.edit',
          'employees.create',
          'training.view',
          'training.manage',
          'diagnostics.view'
        ],
        entity_permissions: {
          'Employee': ['read', 'create', 'update'],
          'TrainingCourse': ['read', 'create', 'update'],
          'EmployeeTrainingProgress': ['read']
        },
        is_system: true,
        usage_count: 0
      },
      {
        name: 'Template Financeiro',
        description: 'Permissões para área financeira: DRE, metas e análises',
        system_roles: [
          'dashboard.view',
          'financial.view',
          'financial.edit',
          'goals.view',
          'reports.view',
          'reports.export'
        ],
        entity_permissions: {
          'DREMonthly': ['read', 'create', 'update'],
          'Goal': ['read', 'create', 'update'],
          'DebtAnalysis': ['read', 'create']
        },
        is_system: true,
        usage_count: 0
      }
    ];

    // Templates de Perfis de Usuário
    const profileTemplates = [
      {
        name: 'Template Consultor Júnior',
        description: 'Perfil padrão para consultores iniciantes',
        type: 'interno',
        permission_type: 'job_role',
        job_roles: ['consultor'],
        module_permissions: {
          dashboard: 'visualizacao',
          cadastros: 'visualizacao',
          diagnosticos: 'total',
          processos: 'visualizacao'
        },
        is_system: true,
        usage_count: 0
      },
      {
        name: 'Template Consultor Sênior',
        description: 'Perfil padrão para consultores experientes',
        type: 'interno',
        permission_type: 'job_role',
        job_roles: ['consultor', 'lider_tecnico'],
        module_permissions: {
          dashboard: 'total',
          cadastros: 'total',
          diagnosticos: 'total',
          processos: 'total',
          pessoas: 'total',
          treinamentos: 'total'
        },
        is_system: true,
        usage_count: 0
      },
      {
        name: 'Template Acelerador',
        description: 'Perfil para aceleradores de negócios',
        type: 'interno',
        permission_type: 'job_role',
        job_roles: ['acelerador'],
        module_permissions: {
          dashboard: 'total',
          aceleracao: 'total',
          resultados: 'total',
          processos: 'total',
          gestao: 'total'
        },
        is_system: true,
        usage_count: 0
      },
      {
        name: 'Template Cliente Básico',
        description: 'Perfil padrão para oficinas clientes',
        type: 'externo',
        permission_type: 'job_role',
        job_roles: ['gerente'],
        module_permissions: {
          dashboard: 'visualizacao',
          diagnosticos: 'total',
          patio: 'visualizacao',
          pessoas: 'visualizacao'
        },
        is_system: true,
        usage_count: 0
      }
    ];

    // Criar templates de roles
    const createdRoleTemplates = [];
    for (const template of roleTemplates) {
      try {
        const existing = await base44.asServiceRole.entities.RoleTemplate.filter({ name: template.name });
        if (!existing || existing.length === 0) {
          const created = await base44.asServiceRole.entities.RoleTemplate.create(template);
          createdRoleTemplates.push(created);
        }
      } catch (err) {
        console.error(`Erro ao criar template de role ${template.name}:`, err);
      }
    }

    // Criar templates de perfis
    const createdProfileTemplates = [];
    for (const template of profileTemplates) {
      try {
        const existing = await base44.asServiceRole.entities.ProfileTemplate.filter({ name: template.name });
        if (!existing || existing.length === 0) {
          const created = await base44.asServiceRole.entities.ProfileTemplate.create(template);
          createdProfileTemplates.push(created);
        }
      } catch (err) {
        console.error(`Erro ao criar template de perfil ${template.name}:`, err);
      }
    }

    return Response.json({
      success: true,
      roleTemplates: createdRoleTemplates.length,
      profileTemplates: createdProfileTemplates.length,
      message: `${createdRoleTemplates.length} templates de roles e ${createdProfileTemplates.length} templates de perfis criados`
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
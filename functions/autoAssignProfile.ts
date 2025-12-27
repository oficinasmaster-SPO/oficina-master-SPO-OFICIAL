import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Regras de atribuição automática de perfil por job_role
 * Mapeamento: job_role -> profile_name
 */
const JOB_ROLE_TO_PROFILE = {
  'socio': 'Sócio - Acesso Total',
  'diretor': 'Diretor - Gestão Estratégica',
  'gerente': 'Gerente - Gestão Operacional',
  'supervisor_loja': 'Supervisor - Operação e Equipe',
  'lider_tecnico': 'Líder Técnico - Coordenação Técnica',
  'financeiro': 'Financeiro - Gestão Financeira',
  'rh': 'RH - Gestão de Pessoas',
  'tecnico': 'Técnico - Execução e Produção',
  'comercial': 'Comercial - Vendas e Atendimento',
  'consultor_vendas': 'Vendedor - Atendimento ao Cliente',
  'marketing': 'Marketing - Comunicação e Marketing',
  'administrativo': 'Administrativo - Suporte e Administração',
  'outros': 'Colaborador Básico'
};

/**
 * Busca ou cria perfil padrão baseado no job_role
 */
async function getOrCreateDefaultProfile(base44, jobRole, workshopId) {
  const profileName = JOB_ROLE_TO_PROFILE[jobRole] || 'Colaborador Básico';
  
  try {
    // Buscar perfil existente
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ 
      name: profileName,
      type: 'interno'
    });
    
    if (profiles && profiles.length > 0) {
      return profiles[0];
    }
    
    // Criar perfil padrão se não existir
    const newProfile = await base44.asServiceRole.entities.UserProfile.create({
      name: profileName,
      type: 'interno',
      job_roles: [jobRole],
      status: 'ativo',
      description: `Perfil padrão para ${profileName}`,
      module_permissions: getDefaultModulePermissions(jobRole),
      roles: getDefaultRoles(jobRole)
    });
    
    console.log(`✅ Perfil criado: ${profileName} para job_role: ${jobRole}`);
    return newProfile;
  } catch (error) {
    console.error('Erro ao buscar/criar perfil:', error);
    return null;
  }
}

/**
 * Define permissões de módulo padrão por job_role
 */
function getDefaultModulePermissions(jobRole) {
  const basePermissions = {
    dashboard: 'visualizacao',
    cadastros: 'bloqueado',
    patio: 'bloqueado',
    resultados: 'bloqueado',
    pessoas: 'bloqueado',
    diagnosticos: 'bloqueado',
    processos: 'bloqueado',
    documentos: 'bloqueado',
    cultura: 'bloqueado',
    treinamentos: 'visualizacao',
    gestao: 'bloqueado',
    aceleracao: 'bloqueado',
    admin: 'bloqueado'
  };
  
  // Ajustar por nível hierárquico
  switch(jobRole) {
    case 'socio':
    case 'diretor':
      return Object.keys(basePermissions).reduce((acc, key) => {
        acc[key] = 'total';
        return acc;
      }, {});
      
    case 'gerente':
    case 'supervisor_loja':
      return {
        ...basePermissions,
        dashboard: 'total',
        cadastros: 'total',
        patio: 'total',
        pessoas: 'total',
        diagnosticos: 'total',
        processos: 'visualizacao',
        resultados: 'total'
      };
      
    case 'lider_tecnico':
      return {
        ...basePermissions,
        dashboard: 'visualizacao',
        patio: 'total',
        processos: 'visualizacao',
        documentos: 'visualizacao'
      };
      
    case 'financeiro':
      return {
        ...basePermissions,
        dashboard: 'total',
        resultados: 'total',
        gestao: 'total'
      };
      
    case 'rh':
      return {
        ...basePermissions,
        pessoas: 'total',
        cultura: 'total',
        treinamentos: 'total'
      };
      
    default:
      return basePermissions;
  }
}

/**
 * Define roles padrão por job_role
 */
function getDefaultRoles(jobRole) {
  switch(jobRole) {
    case 'socio':
    case 'diretor':
      return ['admin_full', 'dashboard_view', 'employees_full', 'workshops_full'];
      
    case 'gerente':
    case 'supervisor_loja':
      return ['dashboard_view', 'employees_view', 'employees_edit', 'tasks_full'];
      
    case 'lider_tecnico':
      return ['dashboard_view', 'employees_view', 'tasks_view'];
      
    case 'financeiro':
      return ['dashboard_view', 'finances_full', 'reports_view'];
      
    case 'rh':
      return ['employees_full', 'training_full', 'culture_full'];
      
    default:
      return ['dashboard_view', 'tasks_view'];
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const payload = await req.json();
    const { employee_id, job_role, force = false } = payload;
    
    if (!employee_id || !job_role) {
      return Response.json({ 
        error: 'employee_id e job_role são obrigatórios' 
      }, { status: 400 });
    }
    
    // Buscar employee
    const employee = await base44.asServiceRole.entities.Employee.get(employee_id);
    
    if (!employee) {
      return Response.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }
    
    // Verificar se já tem profile e não está forçando
    if (employee.profile_id && !force) {
      return Response.json({ 
        success: true,
        message: 'Colaborador já possui perfil atribuído',
        profile_id: employee.profile_id,
        auto_assigned: false
      });
    }
    
    // Buscar ou criar perfil padrão
    const profile = await getOrCreateDefaultProfile(base44, job_role, employee.workshop_id);
    
    if (!profile) {
      return Response.json({ 
        error: 'Não foi possível criar perfil padrão' 
      }, { status: 500 });
    }
    
    // Atribuir perfil ao employee
    await base44.asServiceRole.entities.Employee.update(employee_id, {
      profile_id: profile.id
    });
    
    // Registrar log de auditoria
    try {
      await base44.functions.invoke('logRBACAction', {
        action_type: 'profile_created',
        target_type: 'employee',
        target_id: employee_id,
        target_name: employee.full_name,
        changes: {
          before: { profile_id: null },
          after: { profile_id: profile.id, profile_name: profile.name }
        },
        notes: `Perfil atribuído automaticamente com base no job_role: ${job_role}`
      });
    } catch (logError) {
      console.warn('Erro ao registrar log (não crítico):', logError);
    }
    
    return Response.json({
      success: true,
      message: 'Perfil atribuído com sucesso',
      profile_id: profile.id,
      profile_name: profile.name,
      auto_assigned: true
    });
    
  } catch (error) {
    console.error('Erro em autoAssignProfile:', error);
    return Response.json({ 
      error: error.message || 'Erro interno do servidor' 
    }, { status: 500 });
  }
});
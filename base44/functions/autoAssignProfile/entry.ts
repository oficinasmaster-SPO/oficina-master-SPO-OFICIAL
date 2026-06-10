import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Regras de atribuição automática de perfil por job_role
 * Mapeamento: job_role -> profile_name
 * TABELA CANÔNICA OFICIAL - FASE 4 (Pré-Seleção Automática)
 */
// TABELA CANÔNICA OFICIAL
// Mapeamento job_role → profile_name para pré-seleção automática.
// Todos os perfis referenciados aqui DEVEM existir no banco (validados em 2026-06-09).
// Cargos operacionais mapeiam para "Vendedor - Atendimento ao Cliente" — intencional.
// Cargo RH ≠ perfil RBAC. Um mecânico não precisa de um perfil "Mecânico".
const JOB_ROLE_TO_PROFILE = {
  // Gestão
  'socio': 'Sócio - Acesso Total',
  'diretor': 'Diretor - Gestão Estratégica',
  'gerente': 'Gerente - Gestão Operacional',
  'supervisor_loja': 'Supervisor - Operação e Equipe',
  // Especialistas
  'rh': 'RH - Gestão de Pessoas',
  'financeiro': 'Financeiro - Controle Financeiro',
  'administrativo': 'Financeiro - Controle Financeiro',
  'lider_tecnico': 'Líder Técnico - Coordenação Técnica',
  // Vendas e Atendimento
  'comercial': 'Comercial - Vendas e Atendimento',
  'consultor_vendas': 'Vendedor - Atendimento ao Cliente',
  'marketing': 'Marketing - Comunicação e Marketing',
  // Operacional (todos com acesso mínimo operacional — intencional)
  'tecnico': 'Vendedor - Atendimento ao Cliente',
  'eletricista': 'Vendedor - Atendimento ao Cliente',
  'funilaria_pintura': 'Vendedor - Atendimento ao Cliente',
  'estoque': 'Vendedor - Atendimento ao Cliente',
  'motoboy': 'Vendedor - Atendimento ao Cliente',
  'lavador': 'Vendedor - Atendimento ao Cliente',
  'outros': 'Vendedor - Atendimento ao Cliente',
  // Internos (equipe Oficinas Master)
  'consultor': 'Consultor',
};

/**
 * Busca perfil existente pelo nome
 */
async function findProfileByName(base44, profileName) {
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ 
    name: profileName,
    status: 'ativo'
  });
  
  return profiles && profiles.length > 0 ? profiles[0] : null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const payload = await req.json();
    const { 
      employee_id, 
      job_role, 
      workshop_id,
      current_profile_id,
      force = false 
    } = payload;
    
    // Modo observação: apenas sugere, não aplica (UI do modal)
    if (job_role && !employee_id) {
      const profileName = JOB_ROLE_TO_PROFILE[job_role];
      
      if (!profileName) {
        return Response.json({
          success: true,
          has_suggestion: false,
          message: 'Sem sugestão para este job_role'
        });
      }
      
      const profile = await findProfileByName(base44, profileName);
      
      if (!profile) {
        return Response.json({
          success: true,
          has_suggestion: false,
          message: 'Perfil sugerido não existe',
          suggested_profile_name: profileName
        });
      }
      
      // Verificar se já está usando o perfil sugerido
      if (current_profile_id === profile.id) {
        return Response.json({
          success: true,
          has_suggestion: false,
          message: 'Já está usando o perfil sugerido'
        });
      }
      
      return Response.json({
        success: true,
        has_suggestion: true,
        suggested_profile_id: profile.id,
        suggested_profile_name: profile.name,
        job_role: job_role,
        message: `Sugestão: ${profile.name}`
      });
    }
    
    // Modo aplicação: requer employee_id (backend/automação)
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
    
    // Buscar perfil padrão
    const profileName = JOB_ROLE_TO_PROFILE[job_role] || 'Outros - Acesso Básico';
    const profile = await findProfileByName(base44, profileName);
    
    if (!profile) {
      return Response.json({ 
        error: 'Perfil padrão não encontrado' 
      }, { status: 404 });
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
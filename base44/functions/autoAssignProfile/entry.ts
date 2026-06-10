import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// TABELA CANÔNICA OFICIAL — job_role → profile_id FIXO
// Mapeamento por ID elimina dependência de nome do perfil no banco.
// Se o nome mudar, o mapeamento continua funcionando.
// IDs validados em 2026-06-09 via auditoria MCP.
// Cargos operacionais → Técnico - Acesso Operacional (acesso mínimo — intencional).
const JOB_ROLE_TO_PROFILE_ID = {
  // Gestão
  'socio':           '6a272f8ea3fa8dd02ca7350e', // Sócio - Acesso Total
  'diretor':         '6a272f8a983951dfc5cf3493', // Diretor - Gestão Estratégica
  'gerente':         '6a272f8976cba10c3232779a', // Gerente - Gestão Operacional
  'supervisor_loja': '6a272f91b92f3d2dfe6344be', // Supervisor - Operação e Equipe
  // Especialistas
  'rh':              '6a272f883b2162c800073ace', // RH - Gestão de Pessoas
  'financeiro':      '6a285fc9f76402dd73736656', // Financeiro - Controle Financeiro
  'administrativo':  '6a285fc9f76402dd73736656', // Financeiro - Controle Financeiro
  'lider_tecnico':   '6a272f85fc4b85767f964421', // Líder Técnico - Coordenação Técnica
  // Vendas e Atendimento
  'comercial':       '6a272f96bc6eedd434194fcf', // Comercial - Vendas e Atendimento
  'consultor_vendas':'6a272f876b16129b2f5f31be', // Técnico - Acesso Operacional
  'marketing':       '6a272f99aaeffc72c503fa5e', // Marketing - Comunicação e Marketing
  // Operacional (acesso mínimo — cargo RH ≠ perfil RBAC, mecânico não precisa de perfil Mecânico)
  'tecnico':         '6a272f876b16129b2f5f31be', // Técnico - Acesso Operacional
  'eletricista':     '6a272f876b16129b2f5f31be', // Técnico - Acesso Operacional
  'funilaria_pintura':'6a272f876b16129b2f5f31be', // Técnico - Acesso Operacional
  'estoque':         '6a272f876b16129b2f5f31be', // Técnico - Acesso Operacional
  'motoboy':         '6a272f876b16129b2f5f31be', // Técnico - Acesso Operacional
  'lavador':         '6a272f876b16129b2f5f31be', // Técnico - Acesso Operacional
  'outros':          '6a272f876b16129b2f5f31be', // Técnico - Acesso Operacional
  // Internos (equipe Oficinas Master)
  'consultor':       '6a272f95957fe29d2e8a888a', // Consultor
};

// ID de fallback quando job_role não tem mapeamento
const FALLBACK_PROFILE_ID = '6a272f876b16129b2f5f31be'; // Técnico - Acesso Operacional

/**
 * Busca perfil existente pelo ID fixo — robusto a renomeações
 */
async function findProfileById(base44, profileId) {
  try {
    const profile = await base44.asServiceRole.entities.UserProfile.get(profileId);
    return profile?.status === 'ativo' ? profile : null;
  } catch {
    return null;
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
    const { 
      employee_id, 
      job_role, 
      workshop_id,
      current_profile_id,
      force = false 
    } = payload;
    
    // Modo observação: apenas sugere, não aplica (UI do modal)
    if (job_role && !employee_id) {
      const profileId = JOB_ROLE_TO_PROFILE_ID[job_role];
      
      if (!profileId) {
        return Response.json({
          success: true,
          has_suggestion: false,
          message: 'Sem sugestão para este job_role'
        });
      }
      
      const profile = await findProfileById(base44, profileId);
      
      if (!profile) {
        return Response.json({
          success: true,
          has_suggestion: false,
          message: 'Perfil sugerido não encontrado no banco',
          suggested_profile_id: profileId
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
    const profileId = JOB_ROLE_TO_PROFILE_ID[job_role] || FALLBACK_PROFILE_ID;
    const profile = await findProfileById(base44, profileId);
    
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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Valida se o usuário tem permissão para deletar um colaborador
 * Chamado antes de deletar para garantir segurança no backend
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ 
        success: false, 
        error: 'Não autenticado' 
      }, { status: 401 });
    }

    const { employee_id } = await req.json();

    if (!employee_id) {
      return Response.json({ 
        success: false, 
        error: 'employee_id é obrigatório' 
      }, { status: 400 });
    }

    // Admin sempre pode deletar
    if (user.role === 'admin') {
      return Response.json({ 
        success: true, 
        can_delete: true,
        reason: 'Admin tem permissão total'
      });
    }

    // Verificar permissão granular via job_role
    try {
      // Buscar perfil do usuário
      let profile = null;
      
      if (user.profile_id) {
        profile = await base44.entities.UserProfile.get(user.profile_id);
      } else {
        // Fallback: buscar via Employee
        const employees = await base44.entities.Employee.filter({ user_id: user.id });
        if (employees && employees.length > 0 && employees[0].profile_id) {
          profile = await base44.entities.UserProfile.get(employees[0].profile_id);
        }
      }

      if (!profile || !profile.job_roles || profile.job_roles.length === 0) {
        return Response.json({ 
          success: false, 
          can_delete: false,
          error: 'Perfil de acesso não encontrado' 
        }, { status: 403 });
      }

      // Buscar configuração granular
      const settings = await base44.asServiceRole.entities.SystemSetting.filter({ 
        key: 'granular_permissions' 
      });

      if (settings && settings.length > 0) {
        const granularConfig = JSON.parse(settings[0].value || '{}');
        
        // Verificar se algum job_role do usuário tem permissão de delete em employees
        for (const jobRole of profile.job_roles) {
          const roleConfig = granularConfig[jobRole];
          
          if (roleConfig?.resources?.employees?.actions?.includes('delete')) {
            return Response.json({ 
              success: true, 
              can_delete: true,
              reason: `${jobRole} tem permissão employees.delete`
            });
          }
        }
      }

      // Sócio sempre pode deletar (fallback de segurança)
      if (profile.job_roles.includes('socio')) {
        return Response.json({ 
          success: true, 
          can_delete: true,
          reason: 'Sócio tem permissão total por padrão'
        });
      }

      return Response.json({ 
        success: false, 
        can_delete: false,
        error: 'Usuário não tem permissão para deletar colaboradores' 
      }, { status: 403 });

    } catch (error) {
      console.error("Erro ao verificar permissão:", error);
      return Response.json({ 
        success: false, 
        can_delete: false,
        error: 'Erro ao verificar permissões: ' + error.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Erro geral:", error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});
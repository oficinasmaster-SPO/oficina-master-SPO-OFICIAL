import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const { employee_id } = await req.json();

    if (!employee_id) {
      return Response.json({ success: false, error: 'employee_id é obrigatório' }, { status: 400 });
    }

    // --- Verificação de permissão ---
    let canDelete = false;
    
    if (user.role === 'admin') {
      canDelete = true;
    } else {
      try {
        let profile = null;
        if (user.profile_id) {
          profile = await base44.entities.UserProfile.get(user.profile_id);
        } else {
          const employees = await base44.entities.Employee.filter({ user_id: user.id });
          if (employees && employees.length > 0 && employees[0].profile_id) {
            profile = await base44.entities.UserProfile.get(employees[0].profile_id);
          }
        }

        if (profile && profile.job_roles && profile.job_roles.length > 0) {
          if (profile.job_roles.includes('socio')) {
            canDelete = true;
          } else {
            const settings = await base44.asServiceRole.entities.SystemSetting.filter({ key: 'granular_permissions' });
            if (settings && settings.length > 0) {
              const granularConfig = JSON.parse(settings[0].value || '{}');
              for (const jobRole of profile.job_roles) {
                const roleConfig = granularConfig[jobRole];
                if (roleConfig?.resources?.employees?.actions?.includes('delete')) {
                  canDelete = true;
                  break;
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Erro ao verificar permissão:", e);
      }
    }

    if (!canDelete) {
      return Response.json({ success: false, error: 'Acesso negado: sem permissão para excluir colaborador' }, { status: 403 });
    }
    // --- Fim da verificação ---

    // Buscar o employee
    const employee = await base44.asServiceRole.entities.Employee.get(employee_id);
    if (!employee) {
      return Response.json({ success: false, error: 'Colaborador não encontrado' }, { status: 404 });
    }

    // Deletar o usuário vinculado (se existir)
    if (employee.user_id) {
      try {
        await base44.asServiceRole.entities.User.delete(employee.user_id);
        console.log(`User ${employee.user_id} deletado com sucesso`);
      } catch (e) {
        console.error(`Erro ao deletar User ${employee.user_id}:`, e.message);
      }
    }

    // Deletar convites pendentes do mesmo email, para não sujar o sistema
    if (employee.email) {
      try {
        const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({ email: employee.email });
        for (const invite of invites) {
          await base44.asServiceRole.entities.EmployeeInvite.delete(invite.id);
        }
      } catch (e) {
        console.error(`Erro ao deletar convites para ${employee.email}:`, e.message);
      }
    }

    // Deletar o employee
    await base44.asServiceRole.entities.Employee.delete(employee.id);

    return Response.json({ 
      success: true, 
      message: 'Colaborador e usuário excluídos com sucesso' 
    });

  } catch (error) {
    console.error("Erro geral:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
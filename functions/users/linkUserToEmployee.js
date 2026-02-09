import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Autenticar usuário
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar Employee pelo email do usuário
    const employees = await base44.asServiceRole.entities.Employee.filter({ 
      email.email 
    });

    if (!employees || employees.length === 0) {
      return Response.json({ 
        error: 'Employee not found',
        email.email 
      }, { status: 404 });
    }

    const employee = employees[0];
    const employeeActiveStatus = employee.tipo_vinculo === 'cliente' ? 'ativo' : 'active';

    // Vincular user_id ao Employee se ainda não tiver
    if (!employee.user_id) {
      await base44.asServiceRole.entities.Employee.update(employee.id, {
        user_id.id,
        first_login_at.first_login_at || new Date().toISOString(),
        last_login_at Date().toISOString()
      });

      console.log(`✅ User ${user.id} vinculado ao Employee ${employee.id}`);
    }

    let finalProfileId = employee.profile_id || user.profile_id;

    // 🔄 AUTO-VINCULAÇÃO perfil baseado em job_role se não tiver profile_id
    if (!finalProfileId && employee.job_role) {
      try {
        const allProfiles = await base44.asServiceRole.entities.UserProfile.list();
        const matchingProfile = (allProfiles || []).find(
          (p) =>
            p.status === "ativo" &&
            p.job_roles &&
            Array.isArray(p.job_roles) &&
            p.job_roles.includes(employee.job_role)
        );
        
        if (matchingProfile) {
          finalProfileId = matchingProfile.id;
          await base44.asServiceRole.entities.Employee.update(employee.id, { 
            profile_id.id 
          });
          console.log(`✅ Auto-vinculado ao perfil: ${matchingProfile.name} (job_role: ${employee.job_role})`);
        } else {
          console.warn(`⚠️ Nenhum perfil encontrado para job_role: ${employee.job_role}`);
        }
      } catch (error) {
        console.warn("⚠️ Erro ao buscar perfil:", error);
      }
    }

    if (!finalProfileId && employee.profile_id) {
      finalProfileId = employee.profile_id;
    }

    if (finalProfileId && user.profile_id !== finalProfileId) {
      await base44.asServiceRole.entities.User.update(user.id, {
        profile_id
      });
      console.log(`✅ Profile ${finalProfileId} vinculado ao User ${user.id}`);
    }

    if (finalProfileId && employee.profile_id !== finalProfileId) {
      await base44.asServiceRole.entities.Employee.update(employee.id, {
        profile_id
      });
      console.log(`✅ Profile ${finalProfileId} vinculado ao Employee ${employee.id}`);
    }

    if (finalProfileId) {
      try {
        const selectedProfile = await base44.asServiceRole.entities.UserProfile.get(finalProfileId);
        const profileCustomRoleIds = selectedProfile?.custom_role_ids || [];

        if (profileCustomRoleIds.length > 0) {
          await base44.asServiceRole.entities.User.update(user.id, {
            custom_role_ids
          });
          await base44.asServiceRole.entities.Employee.update(employee.id, {
            custom_role_ids
          });
          console.log('✅ Custom roles sincronizadas:', profileCustomRoleIds);
        }
      } catch (error) {
        console.warn("⚠️ Erro ao sincronizar custom roles:", error);
      }
    }

    if (finalProfileId && (user.user_status === 'pending' || employee.user_status === 'pending')) {
      await base44.asServiceRole.entities.User.update(user.id, {
        user_status: 'active'
      });
      await base44.asServiceRole.entities.Employee.update(employee.id, {
        user_status
      });
      console.log('✅ Usuário aprovado automaticamente após vincular perfil.');
    }

    // Atualizar workshop_id no User se o Employee tiver
    if (employee.workshop_id && user.workshop_id !== employee.workshop_id) {
      await base44.auth.updateMe({
        workshop_id.workshop_id
      });
      console.log(`✅ Workshop ${employee.workshop_id} vinculado ao User ${user.id}`);
    }

    return Response.json({ 
      success,
      employee_id.id,
      user_id.id,
      workshop_id.workshop_id,
      profile_assigned: !!employee.profile_id
    });
  } catch (error) {
    console.error("❌ Erro ao vincular User ao Employee:", error);
    return Response.json({ 
      error.message || 'Internal server error' 
    }, { status: 500 });
  }
});


import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const admin = await base44.auth.me();
    if (!admin || admin.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem aprovar' }, { status: 403 });
    }

    const { employee_id, profile_id } = await req.json();

    if (!employee_id) {
      return Response.json({ error: 'Employee ID obrigatório' }, { status: 400 });
    }

    const employee = await base44.asServiceRole.entities.Employee.get(employee_id);
    
    if (!employee) {
      return Response.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }

    // Buscar User por email OU usar user_id do Employee
    let userId = employee.user_id;
    
    if (!userId) {
      const users = await base44.asServiceRole.entities.User.filter({ email: employee.email });
      
      if (!users || users.length === 0) {
        return Response.json({ 
          error: 'Usuário precisa completar o cadastro primeiro' 
        }, { status: 404 });
      }

      userId = users[0].id;
    }
    const jobRole = employee.job_role || users[0].job_role || 'outros';
    let finalProfileId = profile_id || employee.profile_id || users[0].profile_id;
    
    if (!finalProfileId) {
      const allProfiles = await base44.asServiceRole.entities.UserProfile.list();
      const match = (allProfiles || []).find(p => 
        p.status === "ativo" && 
        p.job_roles?.includes(jobRole)
      );
      if (match) finalProfileId = match.id;
    }

    await base44.asServiceRole.entities.User.update(userId, {
      user_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: admin.id,
      profile_id: finalProfileId || null,
      workshop_id: employee.workshop_id || null
    });

    await base44.asServiceRole.entities.Employee.update(employee.id, {
      user_id: userId,
      user_status: 'approved',
      profile_id: finalProfileId || null
    });

    // Buscar o perfil e vincular as custom_role_ids ao UserProfile
    if (finalProfileId) {
      try {
        const selectedProfile = await base44.asServiceRole.entities.UserProfile.get(finalProfileId);
        
        if (selectedProfile && selectedProfile.custom_role_ids && selectedProfile.custom_role_ids.length > 0) {
          // Atualizar User com as custom_role_ids do perfil
          await base44.asServiceRole.entities.User.update(userId, {
            custom_role_ids: selectedProfile.custom_role_ids
          });

          // Atualizar Employee também
          await base44.asServiceRole.entities.Employee.update(employee.id, {
            custom_role_ids: selectedProfile.custom_role_ids
          });
          
          console.log('✅ Custom roles vinculadas:', selectedProfile.custom_role_ids);
        }
      } catch (error) {
        console.error('⚠️ Erro ao vincular custom roles (não crítico):', error);
      }
    }

    return Response.json({ 
      success: true,
      user_id: userId,
      profile_id: finalProfileId
    });

  } catch (error) {
    console.error('Erro ao aprovar:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});
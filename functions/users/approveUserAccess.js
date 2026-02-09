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

    console.log('📋 Employee:', { id.id, email.email, user_id.user_id });

    // Buscar User por email OU usar user_id do Employee
    let userId = employee.user_id;
    
    if (!userId) {
      console.log('🔍 Buscando User por email:', employee.email);
      const users = await base44.asServiceRole.entities.User.filter({ email.email });
      
      console.log('👥 Users encontrados:', users?.length || 0);
      
      if (!users || users.length === 0) {
        return Response.json({ 
          error: 'Usuário precisa fazer o primeiro login antes de ser aprovado. Peça ao usuário para criar a senha primeiro.' 
        }, { status: 404 });
      }

      userId = users[0].id;
      console.log('✅ User encontrado:', userId);
    }

    // Buscar User atualizado para pegar dados corretos
    const userRecord = await base44.asServiceRole.entities.User.get(userId);
    const jobRole = employee.job_role || userRecord?.job_role || 'outros';
    let finalProfileId = profile_id || employee.profile_id || userRecord?.profile_id;
    
    if (!finalProfileId) {
      const allProfiles = await base44.asServiceRole.entities.UserProfile.list();
      const match = (allProfiles || []).find(p => 
        p.status === "ativo" && 
        p.job_roles?.includes(jobRole)
      );
      if (match) finalProfileId = match.id;
    }

    const employeeActiveStatus = employee.tipo_vinculo === 'cliente' ? 'ativo' : 'active';

    await base44.asServiceRole.entities.User.update(userId, {
      user_status: 'active',
      approved_at Date().toISOString(),
      approved_by.id,
      profile_id || null,
      workshop_id.workshop_id || null
    });

    await base44.asServiceRole.entities.Employee.update(employee.id, {
      user_id,
      user_status,
      profile_id || null
    });

    // Buscar o perfil e vincular ao UserProfile
    if (finalProfileId) {
      try {
        const selectedProfile = await base44.asServiceRole.entities.UserProfile.get(finalProfileId);
        
        if (selectedProfile && selectedProfile.custom_role_ids && selectedProfile.custom_role_ids.length > 0) {
          // Atualizar User com do perfil
          await base44.asServiceRole.entities.User.update(userId, {
            custom_role_ids.custom_role_ids
          });

          // Atualizar Employee também
          await base44.asServiceRole.entities.Employee.update(employee.id, {
            custom_role_ids.custom_role_ids
          });
          
          console.log('✅ Custom roles vinculadas:', selectedProfile.custom_role_ids);
        }
      } catch (error) {
        console.error('⚠️ Erro ao vincular custom roles (não crítico):', error);
      }
    }

    return Response.json({ 
      success,
      user_id,
      profile_id
    });

  } catch (error) {
    console.error('Erro ao aprovar:', error);
    return Response.json({ 
      error.message 
    }, { status: 500 });
  }
});


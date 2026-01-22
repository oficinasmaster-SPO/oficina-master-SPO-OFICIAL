import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Vincula automaticamente User → Employee → Workshop/Profile
 * Dispara após primeiro login do colaborador
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_id, email } = await req.json();

    console.log('🔗 Iniciando vínculo automático para:', email);

    if (!user_id || !email) {
      return Response.json({ 
        success: false, 
        error: 'user_id e email são obrigatórios' 
      }, { status: 400 });
    }

    // Buscar convite pelo email
    const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({ 
      email: email 
    });
    
    if (!invites || invites.length === 0) {
      console.log('⚠️ Nenhum convite encontrado para:', email);
      return Response.json({ 
        success: false, 
        error: 'Convite não encontrado' 
      }, { status: 404 });
    }

    const invite = invites[0];
    console.log('✅ Convite encontrado:', {
      workshop_id: invite.workshop_id,
      profile_id: invite.profile_id,
      employee_id: invite.employee_id
    });

    // Verificar se já existe Employee
    let employee = null;
    
    if (invite.employee_id) {
      // Buscar Employee existente
      try {
        employee = await base44.asServiceRole.entities.Employee.get(invite.employee_id);
        console.log('📋 Employee já existe:', employee.id);
      } catch (e) {
        console.log('⚠️ Employee não encontrado, criando novo...');
      }
    }

    if (!employee) {
      // Buscar por email na oficina
      const existingEmployees = await base44.asServiceRole.entities.Employee.filter({
        email: email,
        workshop_id: invite.workshop_id
      });
      
      employee = existingEmployees?.[0] || null;
    }

    if (employee) {
      // Atualizar Employee existente
      console.log('🔄 Atualizando Employee existente:', employee.id);
      
      await base44.asServiceRole.entities.Employee.update(employee.id, {
        user_id: user_id,
        workshop_id: invite.workshop_id,
        profile_id: invite.profile_id,
        user_status: 'ativo',
        first_login_at: new Date().toISOString()
      });

      console.log('✅ Employee atualizado com sucesso');
    } else {
      // Criar novo Employee
      console.log('➕ Criando novo Employee');
      
      const newEmployee = await base44.asServiceRole.entities.Employee.create({
        user_id: user_id,
        workshop_id: invite.workshop_id,
        profile_id: invite.profile_id,
        owner_id: invite.admin_responsavel_id,
        full_name: invite.name,
        email: invite.email,
        position: invite.position || 'Colaborador',
        area: invite.area || 'geral',
        job_role: invite.job_role || 'outros',
        user_status: 'ativo',
        first_login_at: new Date().toISOString()
      });

      employee = newEmployee;
      console.log('✅ Employee criado:', employee.id);
    }

    // Atualizar User com employee_id
    await base44.asServiceRole.entities.User.update(user_id, {
      employee_id: employee.id,
      workshop_id: invite.workshop_id,
      profile_id: invite.profile_id
    });

    console.log('✅ User atualizado com employee_id');

    // Marcar convite como concluído
    await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
      status: 'concluido',
      completed_at: new Date().toISOString(),
      employee_id: employee.id
    });

    console.log('✅ Convite marcado como concluído');

    // Criar/Atualizar UserPermission
    const existingPermissions = await base44.asServiceRole.entities.UserPermission.filter({
      user_id: user_id
    });

    if (existingPermissions && existingPermissions.length > 0) {
      await base44.asServiceRole.entities.UserPermission.update(existingPermissions[0].id, {
        workshop_id: invite.workshop_id,
        profile_id: invite.profile_id,
        is_active: true,
        approved_at: new Date().toISOString()
      });
      console.log('✅ Permissões atualizadas');
    } else {
      await base44.asServiceRole.entities.UserPermission.create({
        user_id: user_id,
        workshop_id: invite.workshop_id,
        profile_id: invite.profile_id,
        permission_level: 'personalizado',
        is_active: true,
        approved_at: new Date().toISOString()
      });
      console.log('✅ Permissões criadas');
    }

    return Response.json({ 
      success: true,
      message: 'Vínculo criado com sucesso',
      data: {
        user_id: user_id,
        employee_id: employee.id,
        workshop_id: invite.workshop_id,
        profile_id: invite.profile_id
      }
    });

  } catch (error) {
    console.error('❌ Erro ao vincular:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});
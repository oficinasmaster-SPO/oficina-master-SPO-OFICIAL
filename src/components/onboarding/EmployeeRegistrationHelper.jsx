import { base44 } from "@/api/base44Client";

// Helper isolado para registro de colaborador - FRONTEND DIRETO
// Versão: 2025-12-18 17:00 - SEM BACKEND FUNCTION

export async function registerEmployeeDirectly(inviteToken, formData) {
  console.log("🟢 [DirectRegistration] Iniciando registro direto...");
  console.log("🟢 Token:", inviteToken);
  console.log("🟢 Dados:", formData);

  try {
    // 1. Buscar convite
    const invites = await base44.entities.EmployeeInvite.filter({ invite_token: inviteToken });
    const invite = invites[0];

    if (!invite) {
      throw new Error("Convite não encontrado");
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      throw new Error("Convite expirado");
    }

    if (invite.status === 'concluido') {
      throw new Error("Convite já utilizado");
    }

    console.log("🟢 Convite validado:", invite.id);

    const isInternal = invite.invite_type === 'internal';
    const finalEmail = formData.email || invite.email;

    // 2. Buscar owner_id se necessário
    let ownerId = null;
    if (!isInternal && invite.workshop_id) {
      const workshop = await base44.entities.Workshop.get(invite.workshop_id);
      ownerId = workshop?.owner_id;
    }

    // 3. Criar/Atualizar Employee
    const existingEmps = await base44.entities.Employee.filter({ email: finalEmail });
    
    const empData = {
      full_name: formData.name || invite.name,
      telefone: formData.phone || '',
      profile_picture_url: formData.profile_picture_url || '',
      position: invite.position || 'Colaborador',
      area: invite.area || 'tecnico',
      job_role: invite.job_role || 'outros',
      status: 'ativo',
      tipo_vinculo: isInternal ? 'interno' : 'cliente',
      is_internal: isInternal,
      first_login_at: new Date().toISOString()
    };

    if (!isInternal && invite.workshop_id) {
      empData.workshop_id = invite.workshop_id;
      if (ownerId) empData.owner_id = ownerId;
    }

    let employee;
    if (existingEmps && existingEmps.length > 0) {
      console.log("🟢 Atualizando Employee existente");
      employee = await base44.entities.Employee.update(existingEmps[0].id, empData);
    } else {
      console.log("🟢 Criando novo Employee");
      employee = await base44.entities.Employee.create({
        email: finalEmail,
        hire_date: new Date().toISOString().split('T')[0],
        ...empData
      });
    }

    console.log("✅ Employee criado/atualizado:", employee.id);

    // 4. Atualizar convite
    await base44.entities.EmployeeInvite.update(invite.id, {
      status: 'acessado',
      accepted_at: new Date().toISOString(),
      employee_id: employee.id
    });

    // 5. Criar/Atualizar User (com status pending)
    const existingUsers = await base44.entities.User.filter({ email: finalEmail });

    const userData = {
      full_name: formData.name || invite.name,
      position: invite.position || 'Colaborador',
      job_role: invite.job_role || 'outros',
      area: invite.area || 'tecnico',
      telefone: formData.phone || '',
      profile_picture_url: formData.profile_picture_url || '',
      is_internal: isInternal,
      user_status: 'pending',
      invite_id: invite.id,
      hire_date: new Date().toISOString().split('T')[0],
      first_login_at: new Date().toISOString()
    };

    if (!isInternal && invite.workshop_id) {
      userData.workshop_id = invite.workshop_id;
    }

    let userId;
    if (existingUsers && existingUsers.length > 0) {
      console.log("🟢 Atualizando User existente");
      await base44.entities.User.update(existingUsers[0].id, userData);
      userId = existingUsers[0].id;
    } else {
      console.log("🟢 Criando novo User");
      const newUser = await base44.entities.User.create({
        email: finalEmail,
        role: 'user',
        ...userData
      });
      userId = newUser.id;
    }

    console.log("✅ User criado/atualizado:", userId);

    // 6. Vincular user_id ao Employee
    await base44.entities.Employee.update(employee.id, { user_id: userId });

    console.log("🎉 Cadastro concluído com sucesso!");

    return {
      success: true,
      employee_id: employee.id,
      user_id: userId
    };

  } catch (error) {
    console.error("🟢 [DirectRegistration] Erro:", error);
    throw error;
  }
}
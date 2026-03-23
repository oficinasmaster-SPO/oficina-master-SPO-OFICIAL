import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Não autenticado' }, { status: 401 });

    const body = await req.json();
    const { formData, workshop_id, isPartner, userRoles } = body;

    if (!formData || !workshop_id) {
      return Response.json({ success: false, error: 'Dados incompletos' }, { status: 400 });
    }

    const email = formData.email.trim().toLowerCase();
    const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);
    const consulting_firm_id = workshop ? workshop.consulting_firm_id : null;

    // 1. Criar Employee (RH)
    const newEmployee = await base44.asServiceRole.entities.Employee.create({
      ...formData,
      email: email,
      workshop_id: workshop_id,
      consulting_firm_id: consulting_firm_id,
      owner_id: workshop?.owner_id || user.id,
      profile_id: formData.user_profile_id || null,
      is_partner: isPartner
    });

    // 2. Atualizar Workshop se for sócio
    if (isPartner && workshop) {
      const currentPartnerIds = workshop.partner_ids || [];
      if (!currentPartnerIds.includes(user.id)) {
        await base44.asServiceRole.entities.Workshop.update(workshop.id, {
          partner_ids: [...currentPartnerIds, user.id]
        });
      }
    }

    // 3. Verificar/Criar User
    let userId = null;
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: email }, '-created_date', 1);
    
    if (existingUsers && existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      userId = existingUser.id;
      await base44.asServiceRole.entities.User.update(userId, {
        workshop_id: workshop_id,
        consulting_firm_id: consulting_firm_id,
        position: formData.position,
        job_role: formData.job_role || 'outros',
        area: formData.area || 'tecnico',
        telefone: formData.telefone || '',
        hire_date: formData.hire_date || new Date().toISOString().split('T')[0],
        user_status: 'ativo'
      });
    } else {
      await base44.users.inviteUser(email, 'user');
      
      let createdUser = null;
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        const users = await base44.asServiceRole.entities.User.filter({ email: email }, '-created_date', 1);
        if (users && users.length > 0) {
          createdUser = users[0];
          break;
        }
      }

      if (createdUser) {
        userId = createdUser.id;
        const workshopIdentifier = workshop?.identificador || workshop_id;
        const finalProfileId = formData.user_profile_id || `${workshopIdentifier}.auto`;

        await base44.asServiceRole.entities.User.update(userId, {
          full_name: formData.full_name,
          workshop_id: workshop_id,
          consulting_firm_id: consulting_firm_id,
          profile_id: finalProfileId,
          position: formData.position || 'Colaborador',
          job_role: formData.job_role || 'outros',
          area: formData.area || 'tecnico',
          telefone: formData.telefone || '',
          hire_date: formData.hire_date || new Date().toISOString().split('T')[0],
          user_status: 'pending',
          is_internal: true,
          admin_responsavel_id: user.id
        });
      }
    }

    // 4. Vincular ID do usuário no Employee
    if (userId) {
      await base44.asServiceRole.entities.Employee.update(newEmployee.id, { user_id: userId });
    }

    // 5. Criar Convite
    const inviteToken = crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await base44.asServiceRole.entities.EmployeeInvite.create({
      workshop_id: workshop_id,
      employee_id: newEmployee.id,
      name: formData.full_name,
      email: email,
      position: formData.position,
      area: formData.area,
      job_role: formData.job_role,
      invite_token: inviteToken,
      expires_at: expiresAt.toISOString(),
      status: "enviado",
      profile_id: formData.user_profile_id || null
    });

    // 6. Enviar p/ ActiveCampaign 
    const origin = req.headers.get("origin") || 'https://oficinasmastergtr.com';
    const inviteLink = `${origin}/PrimeiroAcesso?token=${inviteToken}&profile_id=${formData.user_profile_id || invite.profile_id}`;

    try {
      const AC_API_KEY = Deno.env.get("ACTIVECAMPAIGN_API_KEY");
      const AC_API_URL = Deno.env.get("ACTIVECAMPAIGN_API_URL");
      if (AC_API_KEY && AC_API_URL) {
        const contactResponse = await fetch(`${AC_API_URL}/api/3/contact/sync`, {
          method: 'POST',
          headers: { 'Api-Token': AC_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact: {
              email: email,
              firstName: formData.full_name.split(' ')[0],
              lastName: formData.full_name.split(' ').slice(1).join(' ') || '',
              fieldValues: [{ field: '1', value: workshop?.name || '' }]
            }
          })
        });

        if (contactResponse.ok) {
          const contactResult = await contactResponse.json();
          await fetch(`${AC_API_URL}/api/3/notes`, {
            method: 'POST',
            headers: { 'Api-Token': AC_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              note: {
                note: `🔑 DADOS DO CONVITE\n\nLink: ${inviteLink}\nSenha Temporária: Oficina@2025\nEmail: ${email}\nNome: ${formData.full_name}`,
                relid: contactResult.contact.id,
                reltype: 'Subscriber'
              }
            })
          });
        }
      }
    } catch(e) {
      console.error("ActiveCampaign background error:", e);
    }

    return Response.json({
      success: true,
      message: 'Colaborador cadastrado e convite processado.',
      employee_id: newEmployee.id
    });

  } catch (error) {
    console.error("registerEmployeeComplete Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
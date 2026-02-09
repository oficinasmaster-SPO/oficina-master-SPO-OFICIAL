import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { employee_id } = body;
    
    if (!employee_id) {
      return Response.json({ error: 'ID do colaborador obrigatório' }, { status: 400 });
    }

    console.log("🔄 Reenviando convite para:", employee_id);

    // Buscar Employee
    const employee = await base44.asServiceRole.entities.Employee.get(employee_id);
    
    if (!employee) {
      return Response.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }

    // Buscar convite existente
    const existingInvites = await base44.asServiceRole.entities.EmployeeInvite.filter({ 
      employee_id 
    });

    let invite;
    
    if (existingInvites && existingInvites.length > 0) {
      // Atualizar convite existente - GERAR NOVO TOKEN
      invite = existingInvites[0];
      
      // Gerar novo invite_token aleatório
      const newInviteToken = Math.random().toString(36).substring(2, 15) + 
                            Math.random().toString(36).substring(2, 15);
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
        invite_token,
        status: 'enviado',
        expires_at.toISOString(),
        resent_count: (invite.resent_count || 0) + 1,
        last_resent_at Date().toISOString()
      });
      
      // Atualizar o objeto invite com o novo token para usar na construção do link
      invite.invite_token = newInviteToken;
      
      console.log("✅ Convite atualizado com novo token:", newInviteToken);
    } else {
      // Criar novo convite
      const inviteToken = Math.random().toString(36).substring(2, 15) + 
                         Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      invite = await base44.asServiceRole.entities.EmployeeInvite.create({
        workshop_id.workshop_id,
        employee_id.id,
        name.full_name || employee.name,
        email.email,
        position.position,
        area.area,
        job_role.job_role,
        profile_id.profile_id,
        invite_token,
        invite_type: 'workshop',
        expires_at.toISOString(),
        status: "enviado"
      });
      
      console.log("✅ Novo convite criado");
    }

    // Gerar link de convite com domínio correto + workshop_id para rastreamento
    const inviteDomain = `https://oficinasmastergtr.com`;
    const inviteLink = `${inviteDomain}/PrimeiroAcesso?token=${invite.invite_token}&workshop_id=${employee.workshop_id}`;

    console.log("🔗 Link gerado para reenvio:", inviteLink);
    console.log("🔑 Token utilizado:", invite.invite_token);

    // ⏸️ ENVIO DE EMAIL DESABILITADO - Focar em WhatsApp
    console.log("📱 Link disponível para compartilhar via WhatsApp");

    return Response.json({ 
      success,
      message: 'Convite reenviado com sucesso!',
      email.email,
      temporary_password: "Oficina@2025",
      invite_link,
      invite_token.invite_token,
      action: 'resent'
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ 
      success,
      error.message 
    }, { status: 500 });
  }
});

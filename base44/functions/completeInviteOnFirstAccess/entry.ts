import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { invite_token } = await req.json();

    if (!invite_token) {
      return Response.json({ error: 'invite_token obrigatório' }, { status: 400 });
    }

    // Obter usuário autenticado
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    console.log(`👤 Completando aceitação de convite para usuário: ${user.id} (${user.email})`);

    // Buscar convite pelo token
    const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({
      invite_token: invite_token
    });

    if (!invites || invites.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Convite não encontrado' 
      }, { status: 404 });
    }

    const invite = invites[0];

    // Validar email
    if (invite.email !== user.email) {
      console.error(`❌ Email mismatch: invite ${invite.email} vs user ${user.email}`);
      return Response.json({ 
        success: false, 
        error: 'Email do convite não corresponde ao usuário logado' 
      }, { status: 403 });
    }

    console.log(`✅ Convite validado para ${invite.email}`);

    // Atualizar status do EmployeeInvite para 'acessado'
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
      status: 'acessado',
      last_resent_at: now
    });
    console.log(`📝 EmployeeInvite status atualizado para 'acessado'`);

    // EXTRAÇÃO SEGURA DE DADOS (Fonte da verdade: Metadata)
    const secureProfileId = invite.metadata?.profile_id || invite.profile_id;
    const secureWorkshopId = invite.metadata?.workshop_id || invite.metadata?.company_id || invite.workshop_id;

    // Criar EmployeeInviteAcceptance para disparar automação
    console.log(`📝 Criando EmployeeInviteAcceptance...`);
    const acceptance = await base44.asServiceRole.entities.EmployeeInviteAcceptance.create({
      user_id: user.id,
      invite_id: invite.id,
      workshop_id: secureWorkshopId,
      profile_id: secureProfileId,
      email: invite.email,
      full_name: invite.name || user.full_name,
      processed: false
    });

    console.log(`✅ EmployeeInviteAcceptance criado: ${acceptance.id}`);

    // Forçar atualização do User com workshop_id, profile_id e pular onboarding de oficina
    const updateData = {};
    // Colaboradores convidados não precisam passar pelo onboarding de cadastro de oficina
    updateData.first_access_completed = true;
    // Mas PRECISAM completar o próprio perfil (CPF e Telefone)
    updateData.profile_completed = false;

    if (secureWorkshopId) {
      updateData.workshop_id = secureWorkshopId;
    }
    if (secureProfileId && !user.profile_id) {
      updateData.profile_id = secureProfileId;
    }
    
    await base44.asServiceRole.entities.User.update(user.id, updateData);
    console.log(`✅ User atualizado com workshop/profile e onboarding pulado:`, updateData);

    return Response.json({
      success: true,
      message: 'Convite aceito com sucesso',
      user_id: user.id,
      workshop_id: invite.workshop_id,
      profile_id: invite.profile_id
    });

  } catch (error) {
    console.error('❌ Erro ao completar convite:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
      invite_token
    });

    if (!invites || invites.length === 0) {
      return Response.json({
        success,
        error: 'Convite não encontrado'
      }, { status: 404 });
    }

    const invite = invites[0];

    // Validar email
    if (invite.email !== user.email) {
      console.error(`❌ Email mismatch ${invite.email} vs user ${user.email}`);
      return Response.json({
        success,
        error: 'Email do convite não corresponde ao usuário logado'
      }, { status: 403 });
    }

    console.log(`✅ Convite validado para ${invite.email}`);

    // Atualizar status do EmployeeInvite para 'acessado'
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
      status: 'acessado',
      last_resent_at
    });
    console.log(`📝 EmployeeInvite status atualizado para 'acessado'`);

    // Criar EmployeeInviteAcceptance para disparar automação
    console.log(`📝 Criando EmployeeInviteAcceptance...`);
    const acceptance = await base44.asServiceRole.entities.EmployeeInviteAcceptance.create({
      user_id.id,
      invite_id.id,
      workshop_id.workshop_id,
      profile_id.profile_id,
      email.email,
      full_name.name || user.full_name,
      processed
    });

    console.log(`✅ EmployeeInviteAcceptance criado: ${acceptance.id}`);

    // Atualizar User com workshop_id e profile_id se não tiver
    if (invite.workshop_id || invite.profile_id) {
      const updateData = {};
      if (invite.workshop_id && !user.workshop_id) {
        updateData.workshop_id = invite.workshop_id;
      }
      if (invite.profile_id && !user.profile_id) {
        updateData.profile_id = invite.profile_id;

        // Se tem profile_id, buscar o perfil para pegar a role
        try {
          const profile = await base44.asServiceRole.entities.UserProfile.get(invite.profile_id);
          if (profile && profile.roles && profile.roles.length > 0) {
            // Atualizar também o campo roles do usuário (se existir na tabela User) ou apenas ter a referência
            // updateData.roles = profile.roles; // Comentado pois roles ficam em UserPermission geralmente
          }
        } catch (e) {
          console.error("Erro ao buscar perfil para update do user:", e);
        }
      }

      if (Object.keys(updateData).length > 0) {
        await base44.asServiceRole.entities.User.update(user.id, updateData);
        console.log(`✅ User atualizado com workshop/profile:`, updateData);
      }
    }

    // --- CORREÇÃO: CRIAR PERMISSÕES (UserPermission) ---
    // O sistema depende da tabela UserPermission para liberar acesso.
    // Sem isso, o usuário tem o profile_id mas não tem a permissão efetiva carregada.
    if (invite.profile_id) {
      try {
        console.log("🔐 Iniciando criação de permissões (UserPermission)...");

        // 1. Verificar se já existe permissão
        const existingPerms = await base44.asServiceRole.entities.UserPermission.filter({ user_id: user.id });

        if (existingPerms && existingPerms.length > 0) {
          console.log("⚠️ Usuário já possui tabela de permissões. Pulando criação.");
          // Opcional: Poderíamos atualizar a permissão existente aqui se fosse necessário.
        } else {
          // 2. Buscar dados do perfil
          const profile = await base44.asServiceRole.entities.UserProfile.get(invite.profile_id);

          if (!profile) {
            console.error("❌ Perfil não encontrado ao criar permissões:", invite.profile_id);
          } else {
            // 3. Criar UserPermission
            const permissionData = {
              user_id: user.id,
              user_email: user.email,
              profile_id: invite.profile_id,
              profile_name: profile.name,
              custom_roles: profile.roles || [],
              custom_role_ids: profile.custom_role_ids || [],
              module_permissions: profile.module_permissions || {},
              sidebar_permissions: profile.sidebar_permissions || {},
              is_active: true,
              created_at: new Date().toISOString()
            };

            const createdPermission = await base44.asServiceRole.entities.UserPermission.create(permissionData);
            console.log("✅ Permissões criadas com sucesso! ID:", createdPermission.id);
          }
        }
      } catch (permError) {
        console.error("❌ Erro CRÍTICO ao criar permissões:", permError);
        // Não vamos travar o fluxo aqui, mas é um erro grave se falhar.
      }
    }
    // ----------------------------------------------------

    return Response.json({
      success,
      message: 'Convite aceito com sucesso',
      user_id.id,
      workshop_id.workshop_id,
      profile_id.profile_id
    });

  } catch (error) {
    console.error('❌ Erro ao completar convite:', error);
    return Response.json({
      success,
      error.message,
      stack.stack
    }, { status: 500 });
  }
});

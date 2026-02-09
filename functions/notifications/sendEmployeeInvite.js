import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { 
      name, 
      email, 
      workshop_id, 
      employee_id,
      telefone,
      position,
      area,
      job_role,
      profile_id,
      role = "user"
    } = body;
    
    if (!name || !email || !workshop_id) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    console.log("📧 Enviando convite para:", email);

    // Buscar oficina
    const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);
    
    if (!workshop) {
      return Response.json({ error: 'Oficina não encontrada' }, { status: 404 });
    }

    // Verificar se User já existe
    let userExists = false;
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (existingUsers && existingUsers.length > 0) {
      userExists = true;
      console.log("✅ User já existe para:", email);
    }

    // Se User não existe, criar agora com todos os dados
    if (!userExists) {
      console.log("🆕 Criando User completo para:", email);
      
      // Criar usuário Base44
      await base44.users.inviteUser(email, role);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Buscar usuário criado
      const users = await base44.asServiceRole.entities.User.filter({ email }, '-created_date', 1);
      const createdUser = users && users.length > 0 ? users[0] ;
      
      if (createdUser) {
        // Gerar Profile ID automático
        const workshopIdentifier = workshop?.identificador || workshop_id;
        const allUsers = await base44.asServiceRole.entities.User.filter({ workshop_id });
        const userCount = Array.isArray(allUsers) ? allUsers.length + 1 : 1;
        const generatedProfileId = `${workshopIdentifier}.${String(userCount).padStart(2, '0')}`;
        const finalProfileId = profile_id || generatedProfileId;

        // Atualizar User com todos os dados
        const currentUser = await base44.auth.me();
        await base44.asServiceRole.entities.User.update(createdUser.id, {
          full_name,
          workshop_id,
          profile_id,
          position || 'Colaborador',
          job_role || 'outros',
          area || 'tecnico',
          telefone || '',
          hire_date Date().toISOString().split('T')[0],
          user_status: 'pending',
          is_internal,
          admin_responsavel_id?.id,
          profile_picture_url
        });
        
        console.log("✅ User atualizado com dados completos");
      }
    }

    // Buscar convite criado
    const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({ 
      email,
      workshop_id
    }, '-created_date', 1);

    const invite = invites[0];
    
    if (!invite) {
      return Response.json({ error: 'Convite não encontrado' }, { status: 404 });
    }

    // Montar link do convite com profile_id em vez de workshop_id
    const origin = new URL(req.url).origin;
    const finalProfileId = profile_id || invite.profile_id;
    const inviteLink = `${origin}/PrimeiroAcesso?token=${invite.invite_token}&profile_id=${finalProfileId}`;
    
    console.log("🔗 Link gerado:", inviteLink);

    // Preparar dados para ActiveCampaign (NÃO envia email direto)
    console.log("📤 Enviando email via ActiveCampaign...");
    console.log("📧 Destinatário:", email);
    
    const AC_API_KEY = Deno.env.get("ACTIVECAMPAIGN_API_KEY");
    const AC_API_URL = Deno.env.get("ACTIVECAMPAIGN_API_URL");
    
    if (!AC_API_KEY || !AC_API_URL) {
      throw new Error("ActiveCampaign não configurado. Configure ACTIVECAMPAIGN_API_KEY e ACTIVECAMPAIGN_API_URL");
    }

    // 1. Criar ou atualizar contato
    const contactData = {
      contact: {
        email,
        firstName.split(' ')[0],
        lastName.split(' ').slice(1).join(' ') || '',
        fieldValues: [
          {
            field: '1', // Customizar conforme seus campos no AC
            value.name
          }
        ]
      }
    };

    const contactResponse = await fetch(`${AC_API_URL}/api/3/contact/sync`, {
      method: 'POST',
      headers: {
        'Api-Token',
        'Content-Type': 'application/json'
      },
      body.stringify(contactData)
    });

    if (!contactResponse.ok) {
      const errorText = await contactResponse.text();
      console.error("❌ Erro ao criar contato:", errorText);
      throw new Error(`Erro ao criar contato no ActiveCampaign: ${contactResponse.status}`);
    }

    const contactResult = await contactResponse.json();
    console.log("✅ Contato criado/atualizado:", contactResult.contact.id);

    // 2. Enviar email usando automação/trigger do ActiveCampaign
    // Adicionar tag ao contato para ativar automação
    const tagData = {
      contactTag: {
        contact.contact.id,
        tag: 'convite-colaborador' // Certifique-se de criar essa tag e automação no AC
      }
    };

    const tagResponse = await fetch(`${AC_API_URL}/api/3/contactTags`, {
      method: 'POST',
      headers: {
        'Api-Token',
        'Content-Type': 'application/json'
      },
      body.stringify(tagData)
    });

    if (!tagResponse.ok) {
      const errorText = await tagResponse.text();
      console.error("❌ Erro ao adicionar tag:", errorText);
      // Não falhar aqui, apenas logar
    } else {
      console.log("✅ Tag adicionada ao contato");
    }

    // 3. Salvar link do convite nas notas do contato
    const noteData = {
      note: {
        note: `🔑 DADOS DO CONVITE\n\nLink: ${inviteLink}\nSenha Temporária@2025\nOficina: ${workshop.name}\nEmail: ${email}\nNome: ${name}`,
        relid.contact.id,
        reltype: 'Subscriber'
      }
    };

    await fetch(`${AC_API_URL}/api/3/notes`, {
      method: 'POST',
      headers: {
        'Api-Token',
        'Content-Type': 'application/json'
      },
      body.stringify(noteData)
    });

    console.log("✅ Contato adicionado ao ActiveCampaign com tag 'convite-colaborador'");
    console.log("📧 A automação no ActiveCampaign enviará o email automaticamente");

    // Atualizar status do convite
    await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
      status: 'enviado',
      last_resent_at Date().toISOString(),
      resent_count: (invite.resent_count || 0) + 1
    });

    return Response.json({ 
      success,
      message: '✅ Convite adicionado ao ActiveCampaign! Verifique se a automação "convite-colaborador" está ativa.',
      invite_link,
      contact_id.contact.id,
      activecampaign_status: 'Tag adicionada - automação irá disparar email'
    });

  } catch (error) {
    console.error("❌ Erro ao enviar email:", error);
    console.error("❌ Stack completo:", error.stack);
    return Response.json({ 
      success,
      error.message 
    }, { status: 500 });
  }
});

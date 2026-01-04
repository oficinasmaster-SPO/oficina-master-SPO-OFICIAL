import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, position, area, job_role, initial_permission, workshop_id, workshop_name, origin, employee_id, invite_type = 'workshop', profile_id, role, telefone, company_id } = body;
    
    console.log("📋 Profile ID recebido:", profile_id);

    if (!name || !email) {
      return Response.json({ error: 'Campos obrigatórios: nome e email' }, { status: 400 });
    }

    if (invite_type === 'workshop' && !workshop_id) {
      return Response.json({ error: 'Workshop obrigatório para colaboradores de oficina' }, { status: 400 });
    }

    console.log("📧 Iniciando convite para:", email);
    console.log("📋 Tipo de convite:", invite_type);

    // Criar Employee para todos (internos e externos)
    let finalEmployeeId = employee_id;
    let employee;

    if (invite_type === 'internal') {
      // Criar Employee interno para aparecer na listagem
      if (!finalEmployeeId) {
        const employees = await base44.asServiceRole.entities.Employee.filter({ 
          email: email, 
          tipo_vinculo: 'interno'
        });

        if (employees && employees.length > 0) {
          employee = employees[0];
          finalEmployeeId = employee.id;
          console.log("✅ Employee interno já existe:", finalEmployeeId);
        } else {
          employee = await base44.asServiceRole.entities.Employee.create({
            full_name: name,
            email: email,
            position: position || 'Usuário Interno',
            area: area || 'administrativo',
            job_role: job_role || 'consultor',
            telefone: telefone || '',
            status: 'ativo',
            user_status: 'pending',
            tipo_vinculo: 'interno',
            is_internal: true,
            hire_date: new Date().toISOString().split('T')[0],
            profile_id: profile_id || null
          });
          finalEmployeeId = employee.id;
          console.log("✅ Employee interno criado:", finalEmployeeId);
        }
      }
    } else {
      // Apenas para colaboradores de oficina: criar Employee
      if (!finalEmployeeId) {
        const employees = await base44.asServiceRole.entities.Employee.filter({ 
          email: email, 
          workshop_id: workshop_id 
        });

        if (employees && employees.length > 0) {
          employee = employees[0];
          finalEmployeeId = employee.id;
          console.log("✅ Employee já existe:", finalEmployeeId);
        } else {
          const workshops = await base44.asServiceRole.entities.Workshop.filter({ id: workshop_id });
          const workshop = workshops[0];

          employee = await base44.asServiceRole.entities.Employee.create({
            full_name: name,
            email: email,
            position: position || 'Colaborador',
            area: area || 'tecnico',
            job_role: job_role || 'outros',
            status: 'ativo',
            tipo_vinculo: 'cliente',
            is_internal: false,
            hire_date: new Date().toISOString().split('T')[0],
            workshop_id: workshop_id,
            owner_id: workshop?.owner_id || null,
            profile_id: profile_id || null,
            user_status: 'ativo'
          });
          finalEmployeeId = employee.id;
          console.log("✅ Employee criado:", finalEmployeeId);
        }
      }
    }

    // Gerar token
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Verificar convites existentes
    const inviteFilter = invite_type === 'internal'
      ? { email: email, invite_type: 'internal' }
      : { email: email, workshop_id: workshop_id };

    const existingInvites = await base44.asServiceRole.entities.EmployeeInvite.filter(inviteFilter);

    let inviteId;
    const inviteData = {
      name,
      email,
      position: position || (invite_type === 'internal' ? 'Usuário Interno' : 'Colaborador'),
      area: area || (invite_type === 'internal' ? 'administrativo' : 'tecnico'),
      job_role: job_role || (invite_type === 'internal' ? 'consultor' : 'outros'),
      initial_permission: initial_permission || 'colaborador',
      company_id: invite_type === 'internal' ? company_id : null,
      workshop_id: invite_type === 'workshop' ? workshop_id : null,
      invite_type,
      employee_id: finalEmployeeId,
      invite_token: token,
      expires_at: expiresAt,
      status: 'enviado'
    };

    // Adicionar profile_id ao convite (interno ou workshop)
    if (profile_id) {
      inviteData.profile_id = profile_id;
      
      // Metadados extras para internos
      if (invite_type === 'internal') {
        inviteData.metadata = {
          role: role || 'user',
          telefone: telefone || ''
        };
      }
    }

    if (existingInvites && existingInvites.length > 0) {
      const existing = existingInvites[0];
      inviteId = existing.id;

      await base44.asServiceRole.entities.EmployeeInvite.update(existing.id, {
        ...inviteData,
        resent_count: (existing.resent_count || 0) + 1,
        last_resent_at: new Date().toISOString()
      });
      console.log("🔄 Convite atualizado:", inviteId);
    } else {
      const newInvite = await base44.asServiceRole.entities.EmployeeInvite.create(inviteData);
      inviteId = newInvite.id;
      console.log("✅ Convite criado:", inviteId);
    }

    // Usa o domínio correto da aplicação
    const baseUrl = 'https://oficina-master-b2bc845b.base44.app';
    const inviteUrl = `${baseUrl}/PrimeiroAcesso?token=${token}`;
    
    console.log("🔗 Link gerado:", inviteUrl);

    // Template HTML personalizado com logo e cores da marca
    const emailHTML = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite - ${workshop_name || 'Oficinas Master'}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header com logo -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px 30px; text-align: center; border-bottom: 3px solid #DC2626;">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540822472c4a70b54d47aa/34d4cdd0e_CpiadeCarrossel-COLOQUESUAOFICINANOBOTOAUTOMTICO1.png" alt="Oficinas Master" style="max-width: 250px; height: auto; margin-bottom: 20px;">
              <h1 style="color: #1F2937; margin: 0; font-size: 26px; font-weight: bold;">Bem-vindo à Equipe! 🎉</h1>
            </td>
          </tr>
          
          <!-- Corpo do email -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #111827; font-size: 18px; margin: 0 0 20px 0; font-weight: 600;">
                Olá, ${name}! 👋
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                Você foi <strong>convidado(a)</strong> para acessar a plataforma de gestão da <strong style="color: #DC2626;">${workshop_name || 'sua oficina'}</strong>.
              </p>
              
              <!-- Dados do convite -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEE2E2; border-left: 4px solid #DC2626; border-radius: 8px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #991B1B; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">📋 Seus Dados de Acesso:</p>
                    <p style="color: #7F1D1D; font-size: 14px; margin: 5px 0; line-height: 1.5;">
                      <strong>Cargo:</strong> ${position}<br>
                      <strong>Área:</strong> ${area ? area.charAt(0).toUpperCase() + area.slice(1) : 'Não especificada'}<br>
                      <strong>E-mail:</strong> ${email}
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                Clique no botão abaixo para <strong>completar seu cadastro</strong> e acessar o sistema:
              </p>
              
              <!-- Botão de ação -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px 0;">
                    <a href="${inviteUrl}" style="display: inline-block; background-color: #DC2626; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.4);">
                      ✅ Completar Cadastro
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;">
                Ou copie e cole o link abaixo no seu navegador:
              </p>
              <p style="color: #DC2626; font-size: 12px; word-break: break-all; background-color: #f9fafb; padding: 12px; border-radius: 6px; margin: 0 0 25px 0;">
                ${inviteUrl}
              </p>
              
              <!-- Aviso importante -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="color: #78350F; font-size: 13px; margin: 0; line-height: 1.5;">
                      <strong>⚠️ Importante:</strong> Este link expira em 7 dias. Complete seu cadastro o quanto antes!
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                Se tiver dúvidas, entre em contato com o gestor da sua oficina.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1F2937; padding: 30px; border-top: 3px solid #DC2626;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="color: #ffffff; font-size: 14px; margin: 0 0 10px 0; font-weight: bold;">
                      Oficinas Master Aceleradora
                    </p>
                    <p style="color: #D1D5DB; font-size: 12px; margin: 0 0 5px 0;">
                      Plataforma de Gestão para Oficinas Mecânicas
                    </p>
                    <p style="color: #D1D5DB; font-size: 12px; margin: 0;">
                      📧 contato@oficinasmaster.com.br | 📱 (11) 99999-9999
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Enviar convite via Base44 (funciona para usuários externos)
    let emailSent = false;
    let emailError = null;

    try {
      console.log("📧 Convidando usuário via Base44 inviteUser:", email);

      // inviteUser cria o usuário e envia email automaticamente
      await base44.users.inviteUser(email, "user");

      emailSent = true;
      console.log("✅ Convite enviado com sucesso via Base44 para:", email);

    } catch (error) {
      emailError = error.message;
      console.error("❌ Erro ao convidar usuário via Base44:", error);
    }

    return Response.json({ 
      success: true, 
      message: emailSent ? 'Convite enviado por email com sucesso!' : 'Convite criado. Email não pôde ser enviado.',
      data: {
        invite_id: inviteId,
        invite_link: inviteUrl,
        employee_id: finalEmployeeId
      },
      email_sent: emailSent,
      email_error: emailError
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ 
      success: false,
      error: 'Erro ao criar convite',
      details: error.message 
    }, { status: 500 });
  }
});
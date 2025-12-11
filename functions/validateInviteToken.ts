import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { token } = await req.json();

    console.log("🔍 Validando token:", token);

    if (!token) {
      return Response.json({ success: false, error: 'Token não fornecido' }, { status: 400 });
    }

    // Buscar convite pelo token usando service role - usando filter é mais eficiente
    const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({ invite_token: token });
    const invite = invites[0];

    if (!invite) {
      return Response.json({ 
        success: false, 
        error: 'Convite não encontrado ou link inválido. Solicite um novo convite ao gestor.' 
      }, { status: 404 });
    }

    // Verificar se expirou
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return Response.json({ 
        success: false, 
        error: 'Este convite expirou. Solicite um novo convite ao gestor.' 
      }, { status: 400 });
    }

    // Verificar se já foi concluído
    if (invite.status === 'concluido') {
      return Response.json({ 
        success: false, 
        error: 'Este convite já foi utilizado. Faça login na sua conta.' 
      }, { status: 400 });
    }

    // Marcar como acessado se ainda não foi
    if (invite.status === 'enviado') {
      try {
        await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
          status: 'acessado',
          accessed_at: new Date().toISOString()
        });
      } catch (e) {
        console.log('Aviso: não foi possível atualizar status do convite');
      }
    }

    // Buscar oficina usando filter (mais eficiente)
    let workshop = null;
    try {
      const workshops = await base44.asServiceRole.entities.Workshop.filter({ id: invite.workshop_id });
      workshop = workshops[0];
      console.log("✅ Oficina encontrada:", workshop?.name);
    } catch (e) {
      console.error('Erro ao carregar oficina:', e);
    }

    console.log("✅ Convite validado com sucesso:", invite.email);

    return Response.json({ 
      success: true, 
      invite: {
        id: invite.id,
        name: invite.name,
        email: invite.email,
        position: invite.position,
        area: invite.area,
        workshop_id: invite.workshop_id,
        invite_token: invite.invite_token,
        job_role: invite.job_role
      },
      workshop: workshop ? {
        id: workshop.id,
        name: workshop.name,
        logo_url: workshop.logo_url
      } : null
    });

  } catch (error) {
    console.error('Erro ao validar token:', error);
    return Response.json({ 
      success: false, 
      error: 'Erro ao validar convite. Tente novamente.' 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { token } = await req.json();

    if (!token) {
      return Response.json({ success: false, error: 'Token não fornecido' }, { status: 400 });
    }

    // Buscar convite pelo token usando service role (não precisa de auth)
    const invites = await base44.asServiceRole.entities.EmployeeInvite.list();
    const invite = invites.find(inv => inv.invite_token === token);

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

    // Buscar oficina
    let workshop = null;
    try {
      const workshops = await base44.asServiceRole.entities.Workshop.list();
      workshop = workshops.find(w => w.id === invite.workshop_id);
    } catch (e) {
      console.log('Aviso: não foi possível carregar oficina');
    }

    return Response.json({ 
      success: true, 
      invite: {
        id: invite.id,
        name: invite.name,
        email: invite.email,
        position: invite.position,
        area: invite.area,
        workshop_id: invite.workshop_id,
        invite_token: invite.invite_token
      },
      workshop: workshop ? {
        id: workshop.id,
        name: workshop.name
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
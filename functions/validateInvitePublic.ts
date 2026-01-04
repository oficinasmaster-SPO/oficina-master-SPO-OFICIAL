import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const { token } = await req.json();

    if (!token) {
      return Response.json({ 
        success: false, 
        error: "Token não fornecido" 
      }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Buscar com service role (acesso público)
    const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({ 
      invite_token: token 
    });
    
    const invite = invites[0];

    if (!invite) {
      return Response.json({ 
        success: false, 
        error: "Convite não encontrado ou link inválido" 
      });
    }

    // Verificar expiração
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return Response.json({ 
        success: false, 
        error: "Este convite expirou" 
      });
    }

    // Verificar status
    if (invite.status === 'concluido') {
      return Response.json({ 
        success: false, 
        error: "Este convite já foi utilizado" 
      });
    }

    // Buscar oficina se houver
    let workshop = null;
    if (invite.workshop_id) {
      try {
        workshop = await base44.asServiceRole.entities.Workshop.get(invite.workshop_id);
      } catch (e) {
        console.log("Aviso: não foi possível carregar oficina");
      }
    }

    return Response.json({ 
      success: true, 
      invite,
      workshop
    });

  } catch (error) {
    console.error("Erro ao validar convite:", error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});
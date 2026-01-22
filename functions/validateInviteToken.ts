import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token obrigatório' }, { status: 400 });
    }

    console.log("🔍 Validando token de convite:", token);

    // Buscar convite pelo token
    const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({
      invite_token: token
    });

    if (!invites || invites.length === 0) {
      console.error("❌ Convite não encontrado com token:", token);
      return Response.json({ 
        success: false, 
        error: 'Convite não encontrado ou expirado' 
      }, { status: 404 });
    }

    const invite = invites[0];

    // Verificar se expirou
    if (invite.expires_at) {
      const expiresAt = new Date(invite.expires_at);
      if (expiresAt < new Date()) {
        console.error("❌ Convite expirado");
        return Response.json({ 
          success: false, 
          error: 'Convite expirado. Solicite um novo convite.' 
        }, { status: 410 });
      }
    }

    console.log("✅ Convite validado:", invite.id);

    // Buscar workshop
    let workshop = null;
    if (invite.workshop_id) {
      try {
        workshop = await base44.asServiceRole.entities.Workshop.get(invite.workshop_id);
      } catch (e) {
        console.warn("⚠️ Workshop não encontrado:", e.message);
      }
    }

    return Response.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        name: invite.name,
        workshop_id: invite.workshop_id,
        profile_id: invite.profile_id,
        status: invite.status
      },
      workshop: workshop ? {
        id: workshop.id,
        name: workshop.name
      } : null
    });

  } catch (error) {
    console.error('❌ Erro ao validar token:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
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
      invite_token
    });

    if (!invites || invites.length === 0) {
      console.error("❌ Convite não encontrado com token:", token);
      return Response.json({ 
        success, 
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
          success, 
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
      success,
      invite: {
        id.id,
        email.email,
        name.name,
        workshop_id.workshop_id,
        profile_id.profile_id,
        status.status
      },
      workshop ? {
        id.id,
        name.name
      } 
    });

  } catch (error) {
    console.error('❌ Erro ao validar token:', error);
    return Response.json({ 
      success,
      error.message 
    }, { status: 500 });
  }
});

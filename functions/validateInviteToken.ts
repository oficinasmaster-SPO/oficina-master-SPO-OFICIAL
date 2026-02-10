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

    // EXTRAÇÃO SEGURA DE DADOS (Fonte da verdade: Metadata)
    // Prioriza os dados gravados no metadata para evitar manipulação
    const secureProfileId = invite.metadata?.profile_id || invite.profile_id;
    const secureWorkshopId = invite.metadata?.workshop_id || invite.metadata?.company_id || invite.workshop_id;

    console.log("🔒 Dados Seguros Extraídos:", { secureProfileId, secureWorkshopId });

    // Buscar workshop
    let workshop = null;
    if (secureWorkshopId) {
      try {
        workshop = await base44.asServiceRole.entities.Workshop.get(secureWorkshopId);
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
        workshop_id: secureWorkshopId, // ID Seguro
        profile_id: secureProfileId,   // ID Seguro
        status: invite.status,
        metadata: invite.metadata // Retornar metadata completo se necessário
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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { token } = body || {};

    // MODO 1: sem token = resolver convite pendente pelo usuário logado
    if (!token) {
      const user = await base44.auth.me();

      if (!user) {
        return Response.json({
          success: false,
          error: 'Token obrigatório ou usuário autenticado necessário'
        }, { status: 401 });
      }

      const userEmail = String(user.email || '').trim().toLowerCase();

      if (!userEmail) {
        return Response.json({
          success: false,
          error: 'Usuário autenticado sem email'
        }, { status: 400 });
      }

      const invitesRaw = await base44.asServiceRole.entities.EmployeeInvite.filter({
        email: user.email
      });

      const invites = (invitesRaw || [])
        .filter(inv => String(inv.email || '').trim().toLowerCase() === userEmail)
        .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

      if (invites.length === 0) {
        return Response.json({
          success: true,
          mode: 'email_lookup',
          has_invite: false,
          redirect_url: null
        });
      }

      const now = new Date();

      const validInvites = invites.filter(inv => {
        const isPending = inv.status === 'pendente' || inv.status === 'enviado';
        const isExpired = inv.expires_at && new Date(inv.expires_at) < now;
        return isPending && !isExpired;
      });

      const selectedInvite = validInvites[0] || invites[0];

      const profileId =
        selectedInvite.profile_id ||
        selectedInvite.metadata?.profile_id ||
        '';

      const redirectUrl = `/PrimeiroAcesso?token=${selectedInvite.invite_token}&profile_id=${profileId}`;

      return Response.json({
        success: true,
        mode: 'email_lookup',
        has_invite: true,
        invite_status: validInvites.length > 0 ? selectedInvite.status : 'expired_or_used',
        invite_id: selectedInvite.id,
        invite_token: selectedInvite.invite_token,
        redirect_url: redirectUrl
      });
    }

    // MODO 2: com token = comportamento original
    console.log("Validando token de convite:", token);

    const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({
      invite_token: token
    });

    if (!invites || invites.length === 0) {
      return Response.json({
        success: false,
        error: 'Convite não encontrado ou expirado'
      }, { status: 404 });
    }

    const invite = invites[0];

    if (invite.expires_at) {
      const expiresAt = new Date(invite.expires_at);

      if (expiresAt < new Date()) {
        return Response.json({
          success: false,
          error: 'Convite expirado. Solicite um novo convite.'
        }, { status: 410 });
      }
    }

    const secureProfileId = invite.metadata?.profile_id || invite.profile_id;
    const secureWorkshopId =
      invite.metadata?.workshop_id ||
      invite.metadata?.company_id ||
      invite.workshop_id;

    let workshop = null;

    if (secureWorkshopId) {
      try {
        workshop = await base44.asServiceRole.entities.Workshop.get(secureWorkshopId);
      } catch (e) {
        console.warn("Workshop não encontrado:", e.message);
      }
    }

    return Response.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        name: invite.name,
        workshop_id: secureWorkshopId,
        profile_id: secureProfileId,
        status: invite.status,
        metadata: invite.metadata
      },
      workshop: workshop ? {
        id: workshop.id,
        name: workshop.name
      } : null
    });

  } catch (error) {
    console.error('Erro ao validar/resolver convite:', error);

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});
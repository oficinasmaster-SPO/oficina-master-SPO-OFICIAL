import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || !user.id) {
      return Response.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 });
    }

    const userEmail = String(user.email || '').trim().toLowerCase();
    if (!userEmail) {
      return Response.json({ success: false, error: 'Usuário autenticado sem email' }, { status: 400 });
    }

    const invitesRaw = await base44.asServiceRole.entities.EmployeeInvite.filter({ email: user.email });

    // Filtro estrito por email normalizado (evita colisões case-insensitive)
    const invites = (invitesRaw || [])
      .filter(inv => String(inv.email || '').trim().toLowerCase() === userEmail)
      .sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());

    if (invites.length === 0) {
      return Response.json({
        success: true,
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

    if (validInvites.length > 0) {
      const invite = validInvites[0];
      const profileId = invite.profile_id || invite.metadata?.profile_id || '';
      const redirectUrl = `/PrimeiroAcesso?token=${invite.invite_token}&profile_id=${profileId}`;

      return Response.json({
        success: true,
        has_invite: true,
        invite_status: invite.status,
        invite_id: invite.id,
        invite_token: invite.invite_token,
        redirect_url: redirectUrl
      });
    }

    // Tem convites mas todos expirados/acessados/concluídos — mandar para PrimeiroAcesso
    // para que o validateInviteToken exiba o erro correto ("Convite expirado")
    const latestInvite = invites[0];
    const profileId = latestInvite.profile_id || latestInvite.metadata?.profile_id || '';
    const redirectUrl = `/PrimeiroAcesso?token=${latestInvite.invite_token}&profile_id=${profileId}`;

    return Response.json({
      success: true,
      has_invite: true,
      invite_status: 'expired_or_used',
      invite_id: latestInvite.id,
      invite_token: latestInvite.invite_token,
      redirect_url: redirectUrl
    });

  } catch (error) {
    console.error('Erro ao resolver convite pendente:', error);
    // NUNCA mascarar erro real como "sem convite"
    return Response.json({
      success: false,
      error: error.message || 'Erro interno ao verificar convite'
    }, { status: 500 });
  }
});
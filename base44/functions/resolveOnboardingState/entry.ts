import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const now = () => new Date();

function isInactive(record) {
  if (!record) return false;
  return (
    record.status === 'inativo' ||
    record.status === 'bloqueado' ||
    record.user_status === 'inativo' ||
    record.user_status === 'bloqueado' ||
    record.active === false ||
    record.is_active === false
  );
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1. Autenticar
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, state: 'ERROR', reason: 'Unauthenticated' }, { status: 401 });
    }

    // 2. Admins sempre prontos
    if (user.role === 'admin' || user.role === 'super_admin') {
      return Response.json({
        success: true,
        state: 'READY',
        reason: 'Admin user — unrestricted access',
        user_id: user.id,
      });
    }

    // 3. Normalizar email
    const email = String(user.email || '').trim().toLowerCase();

    // 4. BLOCKED: usuário inativo — verificado antes de tudo (nem convite pendente passa por cima)
    if (isInactive(user)) {
      return Response.json({
        success: true,
        state: 'BLOCKED',
        reason: 'User account is inactive or blocked',
        user_id: user.id,
      });
    }

    // 5. Buscar Employee (por user_id E por email) + EmployeeInvite (por email) em paralelo
    const [employeesByUserId, employeesByEmail, invites] = await Promise.all([
      base44.asServiceRole.entities.Employee.filter({ user_id: user.id }),
      email ? base44.asServiceRole.entities.Employee.filter({ email }) : Promise.resolve([]),
      email ? base44.asServiceRole.entities.EmployeeInvite.filter({ email }) : Promise.resolve([]),
    ]);

    // Merge employees — prioridade para o vinculado por user_id
    const employee = employeesByUserId[0] || employeesByEmail.find(e => !e.user_id) || employeesByEmail[0] || null;

    // 6. Resolver convite — mais recente primeiro
    const sortedInvites = [...invites].sort(
      (a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime()
    );
    const pendingInvite = sortedInvites.find(inv => {
      const isPending = inv.status === 'pendente' || inv.status === 'enviado';
      const isExpired = inv.expires_at && new Date(inv.expires_at) < now();
      return isPending && !isExpired;
    });
    const anyInvite = sortedInvites[0] || null;

    // 7. Resolver workshop_id do usuário (employee/perfil)
    const workshopId =
      employee?.workshop_id ||
      user.workshop_id ||
      user.data?.workshop_id ||
      null;

    // 8. Buscar workshop do usuário se tivermos ID
    let workshop = null;
    if (workshopId) {
      try {
        workshop = await base44.asServiceRole.entities.Workshop.get(workshopId);
      } catch (_) {
        // workshop não encontrado — não bloqueia o fluxo
      }
    }

    // --- Máquina de estados ---

    // INVITED: convite pendente válido — passa por cima de Employee.user_status=inativo
    // (employee convidado pode nascer inativo até aceitar o convite)
    // Mas antes validar se o workshop do convite está ativo
    if (pendingInvite) {
      const inviteWorkshopId =
        pendingInvite.metadata?.workshop_id ||
        pendingInvite.metadata?.company_id ||
        pendingInvite.workshop_id ||
        null;

      if (inviteWorkshopId) {
        try {
          const inviteWorkshop = await base44.asServiceRole.entities.Workshop.get(inviteWorkshopId).catch(() => null);
          if (inviteWorkshop && isInactive(inviteWorkshop)) {
            return Response.json({
              success: true,
              state: 'BLOCKED',
              reason: 'Workshop linked to invite is inactive or blocked',
              user_id: user.id,
              invite_id: pendingInvite.id,
              workshop_id: inviteWorkshopId,
            });
          }
        } catch (_) {
          // workshop não encontrado — não bloqueia
        }
      }

      const profileId = pendingInvite.profile_id || pendingInvite.metadata?.profile_id || '';
      const redirectUrl = profileId
        ? `/PrimeiroAcesso?token=${pendingInvite.invite_token}&profile_id=${profileId}`
        : `/PrimeiroAcesso?token=${pendingInvite.invite_token}`;

      return Response.json({
        success: true,
        state: 'INVITED',
        reason: 'Pending invite found',
        redirect_url: redirectUrl,
        user_id: user.id,
        invite_id: pendingInvite.id,
        workshop_id: inviteWorkshopId || pendingInvite.workshop_id,
      });
    }

    // BLOCKED: employee inativo sem convite pendente que o reative
    if (employee && isInactive(employee)) {
      return Response.json({
        success: true,
        state: 'BLOCKED',
        reason: 'Employee record is inactive or blocked',
        user_id: user.id,
        employee_id: employee.id,
        workshop_id: workshopId,
      });
    }

    // BLOCKED: workshop inativo
    if (workshop && isInactive(workshop)) {
      return Response.json({
        success: true,
        state: 'BLOCKED',
        reason: 'Workshop is inactive',
        user_id: user.id,
        employee_id: employee?.id,
        workshop_id: workshopId,
      });
    }

    // INVITE_EXPIRED: existe convite expirado/acessado/concluído
    // MAS só redirecionar se o usuário ainda não tem employee+workshop vinculado.
    // Convite "concluido" significa que o usuário já aceitou e está vinculado → deixar passar.
    if (anyInvite && !pendingInvite && !employee?.workshop_id && !workshopId) {
      const isExpiredInvite =
        anyInvite.status === 'expirado' ||
        (anyInvite.expires_at && new Date(anyInvite.expires_at) < now());
      if (isExpiredInvite) {
        const expProfileId = anyInvite.profile_id || anyInvite.metadata?.profile_id || '';
        const expRedirectUrl = expProfileId
          ? `/PrimeiroAcesso?token=${anyInvite.invite_token}&profile_id=${expProfileId}`
          : `/PrimeiroAcesso?token=${anyInvite.invite_token}`;
        return Response.json({
          success: true,
          state: 'INVITE_EXPIRED',
          reason: 'Invite found but expired — no workshop linked yet',
          redirect_url: expRedirectUrl,
          user_id: user.id,
          invite_id: anyInvite.id,
          workshop_id: anyInvite.workshop_id,
        });
      }
    }

    // PENDING_LINK: existe employee por email sem user_id E o employee principal
    // não está vinculado a este usuário (evita falso positivo quando employee já tem user_id de outro user)
    const unlinkedEmployee = employeesByEmail.find(e => !e.user_id);
    const employeeLinkedToThisUser = employeesByUserId[0] || null;
    if (unlinkedEmployee && !employeeLinkedToThisUser) {
      return Response.json({
        success: true,
        state: 'PENDING_LINK',
        reason: 'Employee record exists with this email but has no linked user_id',
        user_id: user.id,
        employee_id: unlinkedEmployee.id,
        workshop_id: unlinkedEmployee.workshop_id,
      });
    }

    // NEW_OWNER: sem employee, sem workshop, sem convite
    if (!employee && !workshopId) {
      return Response.json({
        success: true,
        state: 'NEW_OWNER',
        reason: 'No employee, no workshop and no invite — new owner registration',
        user_id: user.id,
      });
    }

    // COMPLETE_PROFILE: acesso completo mas perfil incompleto
    if (user.profile_completed === false && user.first_access_completed === true) {
      return Response.json({
        success: true,
        state: 'COMPLETE_PROFILE',
        reason: 'First access completed but profile not yet filled',
        user_id: user.id,
        employee_id: employee?.id,
        workshop_id: workshopId,
      });
    }

    // READY: tudo resolvido
    return Response.json({
      success: true,
      state: 'READY',
      reason: 'User, employee and workshop resolved',
      user_id: user.id,
      employee_id: employee?.id,
      workshop_id: workshopId,
    });

  } catch (error) {
    return Response.json(
      { success: false, state: 'ERROR', reason: error.message },
      { status: 500 }
    );
  }
});
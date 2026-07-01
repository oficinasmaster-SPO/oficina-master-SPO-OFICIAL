import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth não obrigatória — endpoint chamado antes do cadastro
    // mas validamos o payload
    const body = await req.json();
    const rawEmail = body?.email;
    if (!rawEmail || typeof rawEmail !== 'string') {
      return Response.json({ success: false, error: 'Email obrigatório' }, { status: 400 });
    }

    const email = rawEmail.trim().toLowerCase();

    // 1. Buscar Users com esse email
    const users = await base44.asServiceRole.entities.User.filter({ email });
    const matchingUsers = (users || []).filter(u =>
      String(u.email || '').trim().toLowerCase() === email
    );

    if (matchingUsers.length > 0) {
      const user = matchingUsers[0];
      // Usuário bloqueado/inativo
      if (user.status === 'inativo' || user.status === 'bloqueado' ||
          user.user_status === 'inativo' || user.user_status === 'bloqueado' ||
          user.active === false || user.is_active === false) {
        return Response.json({ success: true, status: 'INACTIVE_OR_BLOCKED' });
      }
      // Usuário ativo existente
      return Response.json({ success: true, status: 'ALREADY_REGISTERED' });
    }

    // 2. Buscar EmployeeInvites com esse email
    const invitesRaw = await base44.asServiceRole.entities.EmployeeInvite.filter({ email });
    const invites = (invitesRaw || []).filter(inv =>
      String(inv.email || '').trim().toLowerCase() === email
    ).sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());

    const now = new Date();
    const validInvite = invites.find(inv => {
      const isPending = inv.status === 'pendente' || inv.status === 'enviado';
      const isExpired = inv.expires_at && new Date(inv.expires_at) < now;
      return isPending && !isExpired;
    });

    if (validInvite) {
      const profileId = validInvite.profile_id || validInvite.metadata?.profile_id || '';
      const redirectUrl = `/PrimeiroAcesso?token=${validInvite.invite_token}&profile_id=${profileId}`;
      return Response.json({
        success: true,
        status: 'INVITED',
        redirect_url: redirectUrl
      });
    }

    // 3. Buscar Employee com esse email sem user_id vinculado
    const employeesRaw = await base44.asServiceRole.entities.Employee.filter({ email });
    const employees = (employeesRaw || []).filter(emp =>
      String(emp.email || '').trim().toLowerCase() === email
    );

    if (employees.length > 0) {
      const unlinked = employees.find(emp => !emp.user_id);
      if (unlinked) {
        // Tem convite (qualquer status, mesmo expirado)?
        if (invites.length > 0) {
          return Response.json({ success: true, status: 'INVITED' });
        }
        return Response.json({ success: true, status: 'EMPLOYEE_EXISTS_NO_USER' });
      }
      // Employee já tem user_id — tratar como já registrado
      return Response.json({ success: true, status: 'ALREADY_REGISTERED' });
    }

    // 4. Email disponível
    return Response.json({ success: true, status: 'AVAILABLE' });

  } catch (error) {
    console.error('Erro ao validar email de cadastro:', error);
    return Response.json({
      success: false,
      error: error.message || 'Erro interno ao validar email'
    }, { status: 500 });
  }
});
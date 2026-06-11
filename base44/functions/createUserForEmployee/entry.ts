import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// R1 FIX (2026-06-11): Modo "novo" (user_data + email + full_name) estava criando Employee
// sem nunca chamar inviteUser() — User nunca nascia, Employee ficava órfão permanentemente.
// Solução: delegar para createUserDirectly que já implementa o fluxo canônico completo.
// Modo "antigo" (employee_data + workshop_id) mantido para compatibilidade retroativa.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { employee_data, workshop_id, user_data, email, full_name } = body;

    // Modo novo: criar usuário interno → delegar para createUserDirectly (fluxo canônico)
    if (user_data && email && full_name) {
      console.log("🔄 [createUserForEmployee] Delegando para createUserDirectly (fluxo canônico)...");
      console.log("   Email:", email, "| Profile ID:", user_data.profile_id);

      if (!user_data.profile_id) {
        return Response.json({
          success: false,
          error: 'Profile ID é obrigatório'
        }, { status: 400 });
      }

      // Delegar para createUserDirectly — é o fluxo canônico com inviteUser + Employee + email
      const result = await base44.functions.invoke('createUserDirectly', {
        name: full_name,
        email: email,
        telefone: user_data.telefone || '',
        position: user_data.position || 'Consultor',
        job_role: user_data.job_role || 'consultor',
        profile_id: user_data.profile_id,
        consulting_firm_id: user_data.consulting_firm_id || null,
        // sem workshop_id = usuário interno (isInternalUser = true em createUserDirectly)
        role: user_data.role || 'user'
      });

      if (!result.data?.success) {
        return Response.json({
          success: false,
          error: result.data?.error?.message || result.data?.error || 'Erro ao criar usuário interno'
        }, { status: 400 });
      }

      console.log("✅ [createUserForEmployee] Usuário interno criado via createUserDirectly:", result.data?.data?.user_id);

      return Response.json({
        success: true,
        employee: { id: result.data?.data?.employee_id },
        invite_url: result.data?.data?.invite_link,
        email: email,
        role: user_data.role || 'user',
        message: 'Usuário criado! Email de convite enviado.'
      });
    }

    // Modo antigo: vincular employee a workshop (mantido para retrocompatibilidade)
    if (!employee_data || !workshop_id) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    console.log("Criando/atualizando User para:", employee_data.email);

    let consulting_firm_id = null;
    try {
      const ws = await base44.asServiceRole.entities.Workshop.get(workshop_id);
      if (ws) consulting_firm_id = ws.consulting_firm_id || null;
    } catch (e) {
      console.warn("Aviso: Falha ao buscar oficina:", e.message);
    }

    const users = await base44.asServiceRole.entities.User.filter({ email: employee_data.email }, '-created_date', 1);
    const existingUser = users && users.length > 0 ? users[0] : null;

    if (existingUser) {
      console.log("User já existe, atualizando:", existingUser.id);
      const updatedUser = await base44.asServiceRole.entities.User.update(existingUser.id, {
        workshop_id: workshop_id,
        consulting_firm_id: consulting_firm_id,
        position: employee_data.position,
        job_role: employee_data.job_role || 'outros',
        area: employee_data.area || 'tecnico',
        telefone: employee_data.telefone || '',
        hire_date: employee_data.hire_date || new Date().toISOString().split('T')[0],
        user_status: 'ativo'
      });
      return Response.json({ success: true, user_id: updatedUser.id, message: 'User existente atualizado com sucesso' });
    }

    return Response.json({
      success: false,
      error: 'Usuário não encontrado. Use o fluxo de convite para criar novos usuários.'
    }, { status: 400 });

  } catch (error) {
    console.error("Erro em createUserForEmployee:", error);
    return Response.json({ success: false, error: error.message || 'Erro ao criar usuário' }, { status: 500 });
  }
});
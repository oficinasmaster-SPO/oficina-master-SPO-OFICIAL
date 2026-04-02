import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    // body.event and body.data are passed by entity automation
    const { event, data: createdUser } = body;
    
    if (!createdUser || !createdUser.email) {
      return Response.json({ error: 'Usuário sem e-mail' }, { status: 400 });
    }

    console.log(`[onUserCreated] Processando novo usuário: ${createdUser.email}`);

    // Buscar convite
    const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({ 
      email: createdUser.email
    }, '-created_date', 1);

    if (invites && invites.length > 0) {
      const invite = invites[0];
      const workshop_id = invite.workshop_id;
      
      // Buscar oficina
      const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id).catch(() => null);
      
      const workshopIdentifier = workshop?.identificador || workshop_id;
      const allUsers = await base44.asServiceRole.entities.User.filter({ workshop_id: workshop_id });
      const userCount = Array.isArray(allUsers) ? allUsers.length + 1 : 1;
      const generatedProfileId = `${workshopIdentifier}.${String(userCount).padStart(2, '0')}`;
      const finalProfileId = invite.profile_id || generatedProfileId;

      await base44.asServiceRole.entities.User.update(createdUser.id, {
        full_name: invite.name || createdUser.full_name,
        workshop_id: workshop_id,
        profile_id: finalProfileId,
        position: invite.position || 'Colaborador',
        job_role: invite.job_role || 'outros',
        area: invite.area || 'tecnico',
        telefone: invite.telefone || '',
        hire_date: new Date().toISOString().split('T')[0],
        user_status: 'pending',
        is_internal: true,
        admin_responsavel_id: invite.admin_responsavel_id,
        profile_picture_url: null
      });

      console.log(`[onUserCreated] Dados complementares inseridos com sucesso para ${createdUser.email}`);
    } else {
      console.log(`[onUserCreated] Nenhum EmployeeInvite encontrado para ${createdUser.email}`);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[onUserCreated] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
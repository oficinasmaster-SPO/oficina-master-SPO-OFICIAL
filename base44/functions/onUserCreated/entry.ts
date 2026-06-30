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

    // Buscar TODOS os convites do email e selecionar o mais adequado:
    // Prioridade: status 'enviado' + não expirado + mais recente.
    // Evita pegar convite de outro workshop por ordem de criação.
    const allInvites = await base44.asServiceRole.entities.EmployeeInvite.filter({ 
      email: createdUser.email
    }, '-created_date', 50);

    const now = new Date();
    const validInvite = allInvites
      ?.filter(inv => 
        inv.status === 'enviado' &&
        (!inv.expires_at || new Date(inv.expires_at) > now)
      )
      .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())[0] || null;

    if (validInvite) {
      const invite = validInvite;
      console.log(`[onUserCreated] Convite válido selecionado: ${invite.id} (workshop: ${invite.workshop_id})`);
      const workshop_id = invite.workshop_id;
      
      // Buscar oficina
      const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id).catch(() => null);
      
      // R2 FIX (2026-06-11): removida geração de generatedProfileId no formato "identificador.01"
      // (string não-UUID que contaminava User.profile_id). User.profile_id é campo [DEPRECATED 2026-06-10].
      // A autorização vem de Employee.profile_id — nunca de User.profile_id.
      // Se invite.profile_id existir, usamos; caso contrário, deixamos em branco.
      const finalProfileId = invite.profile_id || null;

      // R11: NÃO setar workshop_id aqui — o User só deve receber workshop_id após aceitar
      // o convite em /PrimeiroAcesso (completeInviteOnFirstAccess). Setar aqui causaria
      // o OnboardingGate a ignorar o convite pendente e liberar acesso sem aceite formal.
      await base44.asServiceRole.entities.User.update(createdUser.id, {
        full_name: invite.name || createdUser.full_name,
        position: invite.position || 'Colaborador',
        job_role: invite.job_role || 'outros',
        area: invite.area || 'tecnico',
        telefone: invite.telefone || '',
        hire_date: new Date().toISOString().split('T')[0],
        user_status: 'pending',
        is_internal: false,
        admin_responsavel_id: invite.admin_responsavel_id,
        profile_picture_url: null
      });

      console.log(`[onUserCreated] Dados complementares inseridos com sucesso para ${createdUser.email}`);
    } else {
      // R7 — Fallback: nenhum convite válido (sem convite, ou todos expirados/concluídos)
      // Registra telemetria para facilitar diagnóstico de usuários pendentes de workshop.
      console.log(`[onUserCreated] Nenhum EmployeeInvite encontrado para ${createdUser.email} — signup público`);

      try {
        // Emitir log estruturado para rastreamento
        console.log(JSON.stringify({
          level: 'TELEMETRY',
          event: 'public_signup_no_invite',
          user_id: createdUser.id,
          email: createdUser.email,
          has_workshop_id: !!createdUser.workshop_id,
          has_consulting_firm_id: !!createdUser.consulting_firm_id,
          role: createdUser.role,
          timestamp: new Date().toISOString()
        }));

        // R11: Marcar signup órfão explicitamente para o OnboardingGate rotear para /Cadastro
        await base44.asServiceRole.entities.User.update(createdUser.id, {
          signup_type: 'orphan',        // sem convite → deve cadastrar sua própria oficina
          first_access_completed: false // garante que OnboardingGate force rota de onboarding
        }).catch(e => console.warn('[onUserCreated] Falha ao marcar signup_type orphan:', e.message));

        // Criar notificação interna para admins se usuário ficou sem workshop após 
        // ser criado sem convite (estado: pendente de workshop)
        if (!createdUser.workshop_id) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: createdUser.id,
            type: 'pending_workshop',
            title: 'Cadastro pendente',
            message: 'Você ainda não está vinculado a uma oficina. Complete seu cadastro para acessar todas as funcionalidades.',
            is_read: false,
            metadata: {
              event: 'public_signup_no_invite',
              email: createdUser.email
            }
          }).catch(e => console.warn('[onUserCreated] Falha ao criar notificação de pending_workshop:', e.message));
        }
      } catch (telemetryError) {
        // Falha de telemetria não deve bloquear o fluxo
        console.warn('[onUserCreated] Erro na telemetria de signup público:', telemetryError.message);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[onUserCreated] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
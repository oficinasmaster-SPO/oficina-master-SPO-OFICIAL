import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { invite_token } = await req.json();

    if (!invite_token) {
      return Response.json({ error: 'invite_token obrigatório' }, { status: 400 });
    }

    // Obter usuário autenticado
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    console.log(`👤 Completando aceitação de convite para usuário: ${user.id} (${user.email})`);

    // Buscar convite pelo token
    const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({
      invite_token: invite_token
    });

    if (!invites || invites.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Convite não encontrado' 
      }, { status: 404 });
    }

    const invite = invites[0];

    // Validar email
    if (invite.email !== user.email) {
      console.error(`❌ Email mismatch: invite ${invite.email} vs user ${user.email}`);
      return Response.json({ 
        success: false, 
        error: 'Email do convite não corresponde ao usuário logado' 
      }, { status: 403 });
    }

    console.log(`✅ Convite validado para ${invite.email}`);

    // Atualizar status do EmployeeInvite para 'concluido' — marca aceite formal
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
      status: 'concluido',
      completed_at: now
    });
    console.log(`📝 EmployeeInvite status atualizado para 'concluido'`);

    // EXTRAÇÃO SEGURA DE DADOS (Fonte da verdade: Metadata)
    const secureProfileId = invite.metadata?.profile_id || invite.profile_id;
    const secureWorkshopId = invite.metadata?.workshop_id || invite.metadata?.company_id || invite.workshop_id;

    // Criar EmployeeInviteAcceptance para disparar automação
    console.log(`📝 Criando EmployeeInviteAcceptance...`);
    const acceptance = await base44.asServiceRole.entities.EmployeeInviteAcceptance.create({
      user_id: user.id,
      invite_id: invite.id,
      workshop_id: secureWorkshopId,
      profile_id: secureProfileId,
      email: invite.email,
      full_name: invite.name || user.full_name,
      processed: false
    });

    console.log(`✅ EmployeeInviteAcceptance criado: ${acceptance.id}`);

    // Atualizar User com dados de contexto — profile_id removido (2026-06-10)
    // Autorização vem exclusivamente de Employee.profile_id → UserProfile.roles
    const updateData = {};
    updateData.first_access_completed = true;
    updateData.profile_completed = false;

    // Gravar user_type canonicamente (R-UT-01, 2026-06-12)
    // internal = convite do tipo 'internal' (equipe OM); external = qualquer outro
    updateData.user_type = (invite.invite_type === 'internal') ? 'internal' : 'external';

    if (secureWorkshopId) {
      updateData.workshop_id = secureWorkshopId;
    }
    
    await base44.asServiceRole.entities.User.update(user.id, updateData);
    console.log(`✅ User atualizado com workshop e onboarding flags:`, updateData);

    // ═══════════════════════════════════════════════════════════════════
    // TenantMembership (Etapa 7.5) — associação canônica usuário–oficina.
    // Todo aceite de convite DEVE criar a membership; sem ela o usuário
    // dependeria para sempre do fallback legado do resolveTenant.
    // ═══════════════════════════════════════════════════════════════════
    if (secureWorkshopId) {
      try {
        const existingMemberships = await base44.asServiceRole.entities.TenantMembership.filter({
          user_id: user.id,
          workshop_id: secureWorkshopId,
          membership_type: 'employee'
        });
        if (!existingMemberships || existingMemberships.length === 0) {
          let membershipCompanyId = null;
          let membershipFirmId = invite.consulting_firm_id || null;
          try {
            const ws = await base44.asServiceRole.entities.Workshop.get(secureWorkshopId);
            membershipCompanyId = ws?.company_id || null;
            membershipFirmId = ws?.consulting_firm_id || membershipFirmId;
          } catch (_) { /* workshop pode não existir em dados legados */ }

          const defaults = await base44.asServiceRole.entities.TenantMembership.filter({
            user_id: user.id,
            is_default: true
          });

          await base44.asServiceRole.entities.TenantMembership.create({
            user_id: user.id,
            workshop_id: secureWorkshopId,
            company_id: membershipCompanyId,
            consulting_firm_id: membershipFirmId,
            employee_id: invite.employee_id || null,
            profile_id: secureProfileId || null,
            membership_type: 'employee',
            status: 'active',
            is_default: !defaults || defaults.length === 0,
            notes: 'invite-acceptance'
          });
          console.log(`✅ TenantMembership criada no aceite do convite (workshop ${secureWorkshopId})`);
        } else {
          console.log(`ℹ️ TenantMembership já existia para este usuário/oficina — não duplicada`);
        }
      } catch (e) {
        console.error('⚠️ Falha ao criar TenantMembership (não bloqueante):', e.message);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Fase B — provisionamento espelhado: novo usuário INTERNAL deve
    // "nascer" com TenantMembership consultant para todos os Workshops
    // ativos, assim como provisionWorkshopTenant faz o inverso (workshop
    // novo → membership para todos os internals). Sem isso, o novo
    // consultor fica invisível no TenantSelector até um reparo manual.
    // ═══════════════════════════════════════════════════════════════════
    if (updateData.user_type === 'internal') {
      try {
        const existentes = await base44.asServiceRole.entities.TenantMembership.filter({
          user_id: user.id,
          membership_type: 'consultant',
          status: 'active'
        }, 'created_date', 500);
        const jaTem = new Set(existentes.map((m) => m.workshop_id));

        let skip = 0;
        let criadas = 0;
        while (true) {
          const batch = await base44.asServiceRole.entities.Workshop.filter({}, 'created_date', 200, skip);
          if (!batch || batch.length === 0) break;
          for (const ws of batch) {
            if (jaTem.has(ws.id)) continue;
            await base44.asServiceRole.entities.TenantMembership.create({
              user_id: user.id,
              workshop_id: ws.id,
              company_id: ws.company_id || null,
              consulting_firm_id: ws.consulting_firm_id || null,
              membership_type: 'consultant',
              status: 'active',
              is_default: false,
              notes: 'provision-internal-consultant'
            });
            jaTem.add(ws.id);
            criadas++;
          }
          if (batch.length < 200) break;
          skip += 200;
        }
        console.log(`✅ Provisionamento internal→consultant: ${criadas} memberships criadas para ${user.email}`);
      } catch (e) {
        console.error('⚠️ Falha ao provisionar consultant memberships para internal (não bloqueante):', e.message);
      }
    }

    return Response.json({
      success: true,
      message: 'Convite aceito com sucesso',
      user_id: user.id,
      workshop_id: invite.workshop_id,
      profile_id: invite.profile_id
    });

  } catch (error) {
    console.error('❌ Erro ao completar convite:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});
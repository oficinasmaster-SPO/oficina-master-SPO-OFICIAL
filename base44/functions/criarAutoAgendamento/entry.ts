import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const TENANT_FALLBACK_EVENT = 'TENANT_RESOLVE_FALLBACK';

// ── CÓPIA FIEL de shared/tenantResolver.resolveTenantCore — manter sincronizada ──
async function resolveTenantCore(sr, authUser, params = {}) {
  const { workshop_id, admin_workshop_id, impersonated_user_id, sync_user_field } = params;
  const isAdmin = authUser.role === 'admin';

  let effectiveUser = authUser;
  let isImpersonating = false;
  if (impersonated_user_id && impersonated_user_id !== authUser.id) {
    if (!isAdmin) return { status: 403, error: 'Apenas administradores podem impersonar usuários' };
    const target = await sr.entities.User.get(impersonated_user_id).catch(() => null);
    if (!target) return { status: 404, error: 'Usuário impersonado não encontrado' };
    effectiveUser = target;
    isImpersonating = true;
  }

  let memberships = await sr.entities.TenantMembership.filter(
    { user_id: effectiveUser.id, status: 'active' }, 'created_date', 500
  );

  let fallbackUsed = false;
  if (memberships.length === 0) {
    const legacyWid = effectiveUser.workshop_id || effectiveUser.data?.workshop_id || null;
    console.warn(`[resolveTenant] BACKFILL PENDENTE: user ${effectiveUser.id} (${effectiveUser.email}) sem TenantMembership — fallback user.workshop_id=${legacyWid}`);
    try {
      await sr.entities.SystemEventLog.create({
        event_type: TENANT_FALLBACK_EVENT,
        entity_type: 'TenantMembership',
        entity_id: effectiveUser.id,
        workshop_id: legacyWid,
        triggered_by: 'system',
        status: 'warning',
        timestamp: new Date().toISOString(),
        details: { user_id: effectiveUser.id, email: effectiveUser.email, legacy_workshop_id: legacyWid },
      });
    } catch (_) {}
    if (legacyWid) {
      fallbackUsed = true;
      memberships = [{
        id: null, user_id: effectiveUser.id, workshop_id: legacyWid,
        membership_type: 'employee', status: 'active', is_default: true,
        notes: 'fallback-user-field',
      }];
    }
  }

  let effectiveMembership = null;
  if (admin_workshop_id) {
    if (!isAdmin) return { status: 403, error: 'admin_workshop_id é restrito a administradores' };
    effectiveMembership = memberships.find((m) => m.workshop_id === admin_workshop_id) || {
      id: null, user_id: effectiveUser.id, workshop_id: admin_workshop_id,
      membership_type: 'admin_support', status: 'active', is_default: false,
      notes: 'admin-override',
    };
  } else if (workshop_id) {
    effectiveMembership = memberships.find((m) => m.workshop_id === workshop_id);
    if (!effectiveMembership) return { status: 403, error: 'Sem membership ativa para o workshop solicitado' };
  } else {
    effectiveMembership = memberships.find((m) => m.is_default) || (memberships.length === 1 ? memberships[0] : null);
    if (!effectiveMembership && memberships.length > 1) {
      const preferido = effectiveUser.workshop_id || effectiveUser.data?.workshop_id;
      effectiveMembership = memberships.find((m) => m.workshop_id === preferido) || memberships[0];
    }
    if (!effectiveMembership) return { status: 404, error: 'Nenhum tenant disponível para o usuário' };
  }

  const workshop = await sr.entities.Workshop.get(effectiveMembership.workshop_id).catch(() => null);
  if (!workshop) return { status: 404, error: 'Workshop do tenant não encontrado' };

  if (sync_user_field && !isImpersonating && effectiveMembership.notes !== 'admin-override' &&
      (effectiveUser.tenant_workshop_id || null) !== effectiveMembership.workshop_id) {
    try { await sr.entities.User.update(effectiveUser.id, { tenant_workshop_id: effectiveMembership.workshop_id }); } catch (_) {}
  }

  return {
    status: 200,
    data: {
      effective_user_id: effectiveUser.id,
      membership: effectiveMembership,
      workshop: {
        id: workshop.id, name: workshop.name, status: workshop.status,
        segment: workshop.segment || workshop.segment_auto || null,
        city: workshop.city || null, company_id: workshop.company_id || null,
        consulting_firm_id: workshop.consulting_firm_id || null,
        planStatus: workshop.planStatus || null,
      },
      company_id: effectiveMembership.company_id || workshop.company_id || null,
      consulting_firm_id: effectiveMembership.consulting_firm_id || workshop.consulting_firm_id || null,
      profile_id: effectiveMembership.profile_id || null,
      membership_type: effectiveMembership.membership_type || null,
      isAdmin,
      isImpersonating,
      fallback_used: fallbackUsed,
      memberships,
    },
  };
}
// ── Fim da cópia fiel ──

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { workshop_id, tipo_atendimento_id } = await req.json();

    if (!workshop_id || !tipo_atendimento_id) {
      return Response.json({ 
        error: 'workshop_id e tipo_atendimento_id são obrigatórios' 
      }, { status: 400 });
    }

    // ── Validação de tenant EXCLUSIVAMENTE via resolveTenantCore (membership-first).
    // Nenhum asServiceRole de dados de negócio antes da resolução de membership.
    const tenant = await resolveTenantCore(
      base44.asServiceRole, user,
      user.role === 'admin' ? { admin_workshop_id: workshop_id } : { workshop_id }
    );
    if (tenant.status !== 200) {
      return Response.json({ error: tenant.error }, { status: tenant.status });
    }
    const effectiveWorkshopId = tenant.data.workshop.id;

    // Workshop completo (após membership validada)
    const workshop = await base44.asServiceRole.entities.Workshop.get(effectiveWorkshopId).catch(() => null);
    if (!workshop) {
      return Response.json({ error: 'Oficina não encontrada' }, { status: 404 });
    }

    // ── Buscar regra de agendamento para o plano da oficina ──
    const regraAgendamento = await base44.entities.RegraAgendamento.filter({
      $or: [
        { plan_id: workshop.planoAtual },
        { plan_id: null } // Regra genérica
      ],
      ativo: true
    });

    if (!regraAgendamento || regraAgendamento.length === 0) {
      return Response.json({ 
        error: 'Nenhuma regra de agendamento configurada para este plano' 
      }, { status: 400 });
    }

    const regra = regraAgendamento[0]; // Tomar a primeira regra disponível

    // ── Validar se o tipo_atendimento_id está na sequência ──
    const itemSequencia = regra.sequencia?.find(s => s.tipo_atendimento_id === tipo_atendimento_id);
    if (!itemSequencia) {
      return Response.json({ 
        error: 'Este tipo de atendimento não está permitido para o seu plano' 
      }, { status: 400 });
    }

    // ── Buscar atendimentos já realizados da mesma sequência ──
    const atendimentosRealizados = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter({
      workshop_id: effectiveWorkshopId,
      tipo_atendimento: itemSequencia.nome,
      status: { $in: ['realizado', 'concluido'] }
    });

    const ordemAtendimentos = atendimentosRealizados.length + 1;

    // ── Validar intervalo mínimo de dias (se aplicável) ──
    if (itemSequencia.intervalo_minimo_dias > 0 && atendimentosRealizados.length > 0) {
      const ultimoAtendimento = atendimentosRealizados[atendimentosRealizados.length - 1];
      const diasDesdeUltimo = Math.floor(
        (new Date() - new Date(ultimoAtendimento.data_realizada || ultimoAtendimento.data_agendada)) / 
        (1000 * 60 * 60 * 24)
      );

      if (diasDesdeUltimo < itemSequencia.intervalo_minimo_dias) {
        return Response.json({
          error: `Você precisa aguardar ${itemSequencia.intervalo_minimo_dias - diasDesdeUltimo} dias antes de agendar novamente`,
          bloqueado: true,
          dias_restantes: itemSequencia.intervalo_minimo_dias - diasDesdeUltimo
        }, { status: 409 });
      }
    }

    // ── FASE 2: Atribuir consultor automaticamente ──
    // Buscar o melhor consultor com base em tipo + disponibilidade + prioridade
    let slotEncontrado = null;

    try {
      const atribuicaoResponse = await base44.functions.invoke('atribuirConsultorAutomatico', {
        tipo_atendimento_id,
        workshop_id: effectiveWorkshopId,
        data_preferida: null, // Cliente não especificou preferência
        data_fim_limite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      if (atribuicaoResponse.data?.success && atribuicaoResponse.data.consultor_id) {
        slotEncontrado = {
          consultor_id: atribuicaoResponse.data.consultor_id,
          consultor_nome: atribuicaoResponse.data.consultor_nome,
          data: atribuicaoResponse.data.data,
          hora: atribuicaoResponse.data.hora,
          prioridade: atribuicaoResponse.data.prioridade
        };
      }
    } catch (e) {
      console.warn('Aviso em atribuirConsultorAutomatico:', e.message);
    }

    if (!slotEncontrado) {
      // ── Nenhum horário disponível — criar solicitação na fila ──
      const solicitacao = await base44.entities.AgendamentoSolicitacao.create({
        workshop_id: effectiveWorkshopId,
        workshop_nome: workshop.name,
        tipo_atendimento_id,
        tipo_atendimento_nome: itemSequencia.nome,
        status: 'aguardando_vaga',
        data_sugerida_cliente: null,
        hora_sugerida_cliente: null,
        mensagem_cliente: null,
        notificado_vaga_disponivel: false
      });

      return Response.json({
        success: true,
        agendado: false,
        motivo: 'Nenhum horário disponível no período solicitado',
        solicitacao_id: solicitacao.id,
        message: 'Sua solicitação foi adicionada à fila de espera. Você será notificado quando um horário ficar disponível.'
      });
    }

    // ── Criar atendimento com o slot encontrado ──
    const dataAgendada = new Date(`${slotEncontrado.data}T${slotEncontrado.hora}:00`);

    const atendimento = await base44.asServiceRole.entities.ConsultoriaAtendimento.create({
      workshop_id: effectiveWorkshopId,
      consultor_id: slotEncontrado.consultor_id,
      consultor_nome: slotEncontrado.consultor_nome,
      tipo_atendimento: itemSequencia.nome,
      data_agendada: dataAgendada.toISOString(),
      status: 'agendado',
      duracao_minutos: 60,
      fase_oficina: workshop.maturity_level || 1,
      plano_cliente: workshop.planoAtual,
      registro_meta: {
        criado_por_id: user.id,
        criado_por_nome: user.full_name,
        criado_por_cargo: 'cliente',
        criado_para_id: slotEncontrado.consultor_id,
        criado_para_nome: slotEncontrado.consultor_nome,
        origem_tela: 'auto_agendamento',
        criado_em: new Date().toISOString(),
        criado_por_terceiro: false
      }
    });

    return Response.json({
      success: true,
      agendado: true,
      atendimento_id: atendimento.id,
      data_agendada: dataAgendada.toISOString(),
      consultor: slotEncontrado.consultor_nome,
      tipo_atendimento: itemSequencia.nome,
      message: `Atendimento agendado com sucesso para ${slotEncontrado.data} às ${slotEncontrado.hora}`
    });
  } catch (error) {
    console.error('Erro em criarAutoAgendamento:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
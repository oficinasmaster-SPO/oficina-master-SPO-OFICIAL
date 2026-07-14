import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const TENANT_FALLBACK_EVENT = 'TENANT_RESOLVE_FALLBACK';

// CÓPIA ADAPTADA de shared/tenantResolver.resolveTenantCore (retorno reduzido — só validação).
const TENANT_RESOLVER_COPY_VERSION = '1.1.0-adapted';
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
  let memberships = await sr.entities.TenantMembership.filter({ user_id: effectiveUser.id, status: 'active' }, 'created_date', 500);
  let fallbackUsed = false;
  if (memberships.length === 0) {
    const legacyWid = effectiveUser.workshop_id || effectiveUser.data?.workshop_id || null;
    console.warn(`[resolveTenant] BACKFILL PENDENTE: user ${effectiveUser.id} (${effectiveUser.email}) sem TenantMembership — fallback user.workshop_id=${legacyWid}`);
    try { await sr.entities.SystemEventLog.create({ event_type: TENANT_FALLBACK_EVENT, entity_type: 'TenantMembership', entity_id: effectiveUser.id, workshop_id: legacyWid, triggered_by: 'system', status: 'warning', timestamp: new Date().toISOString(), details: { user_id: effectiveUser.id, email: effectiveUser.email, legacy_workshop_id: legacyWid } }); } catch (_) {}
    if (legacyWid) {
      fallbackUsed = true;
      memberships = [{ id: null, user_id: effectiveUser.id, workshop_id: legacyWid, membership_type: 'employee', status: 'active', is_default: true, notes: 'fallback-user-field' }];
    }
  }
  let effectiveMembership = null;
  if (admin_workshop_id) {
    if (!isAdmin) return { status: 403, error: 'admin_workshop_id é restrito a administradores' };
    effectiveMembership = memberships.find((m) => m.workshop_id === admin_workshop_id) || { id: null, user_id: effectiveUser.id, workshop_id: admin_workshop_id, membership_type: 'admin_support', status: 'active', is_default: false, notes: 'admin-override' };
  } else if (workshop_id) {
    effectiveMembership = memberships.find((m) => m.workshop_id === workshop_id);
    if (!effectiveMembership) return { status: 403, error: 'Sem membership ativa para o workshop solicitado' };
  } else {
    effectiveMembership = memberships.find((m) => m.is_default) || (memberships.length === 1 ? memberships[0] : null);
    if (!effectiveMembership && memberships.length > 1) {
      const preferred = effectiveUser.workshop_id || effectiveUser.data?.workshop_id;
      effectiveMembership = memberships.find((m) => m.workshop_id === preferred) || memberships[0];
    }
    if (!effectiveMembership) return { status: 404, error: 'Nenhum tenant disponível para o usuário' };
  }
  const workshop = await sr.entities.Workshop.get(effectiveMembership.workshop_id).catch(() => null);
  if (!workshop) return { status: 404, error: 'Workshop do tenant não encontrado' };
  if (sync_user_field && !isImpersonating && effectiveMembership.notes !== 'admin-override' && (effectiveUser.tenant_workshop_id || null) !== effectiveMembership.workshop_id) {
    try { await sr.entities.User.update(effectiveUser.id, { tenant_workshop_id: effectiveMembership.workshop_id }); } catch (_) {}
  }
  return { status: 200, data: { effective_user_id: effectiveUser.id, membership: effectiveMembership, workshop, isAdmin, isImpersonating, fallback_used: fallbackUsed, memberships } };
}

/**
 * generateFullCronograma — ÚNICA SOURCE DE CRIAÇÃO ESTRUTURAL DO CRONOGRAMA
 *
 * Engine híbrida:
 * - v2: usa CronogramaTemplateItem (prazo dinâmico, fase, ordem, dependências)
 * - v1 fallback: usa arrays legados de PlanFeature + PlanAttendanceRule
 *
 * NÃO deve ser chamado pela UI diretamente.
 * Disparado por: adminUpdateWorkshopPlan, processKiwifyPaymentWebhook
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const { workshop_id, contract_id, plan_id: planIdParam } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    // Resolve membership antes de qualquer leitura/escrita de negócio com service role.
    const tenant = await resolveTenantCore(
      base44.asServiceRole,
      user,
      user.role === 'admin' ? { admin_workshop_id: workshop_id } : { workshop_id }
    );
    if (tenant.status !== 200) {
      return Response.json({ error: tenant.error }, { status: tenant.status });
    }
    const workshop = tenant.data.workshop;

    const planId = (planIdParam || workshop.planoAtual || 'FREE').toUpperCase().trim();

    const dataInicio = new Date();
    const itemsCriados = [];
    let engineUsed = 'legacy_v1';

    // Inferir fluxo de criação pelo contexto da chamada
    const flowLabel = contract_id ? 'auto_plan_activation' : 'admin_manual';

    // ── Tentar engine v2: CronogramaTemplateItem ──────────────────────────────
    const templateItems = await base44.asServiceRole.entities.CronogramaTemplateItem.filter({
      plan_id: planId,
      ativo: true
    });

    if (templateItems && templateItems.length > 0) {
      engineUsed = 'template_v2';
      console.log(`[generateFullCronograma] Engine v2 ativada — ${templateItems.length} template items para plano ${planId}`);

      for (const tpl of templateItems) {
        const existing = await base44.asServiceRole.entities.CronogramaImplementacao.filter({
          workshop_id,
          item_id: tpl.item_id || tpl.id,
          item_tipo: tpl.item_tipo
        });

        if (existing && existing.length > 0) continue;

        const diasInicio = tpl.dias_para_inicio || 0;
        const diasPrazo = tpl.prazo_conclusao_dias || tpl.metadata?.frequency_days * (tpl.metadata?.total_allowed || 1) || 7;

        const dataInicioItem = new Date(dataInicio);
        dataInicioItem.setDate(dataInicioItem.getDate() + diasInicio);

        const dataTermino = new Date(dataInicioItem);
        dataTermino.setDate(dataTermino.getDate() + diasPrazo);

        const item = await base44.asServiceRole.entities.CronogramaImplementacao.create({
          workshop_id,
          item_tipo: tpl.item_tipo,
          item_id: tpl.item_id || tpl.id,
          item_nome: tpl.titulo,
          item_categoria: tpl.fase || '',
          fase: tpl.fase || '',
          ordem: tpl.ordem || 0,
          obrigatorio: tpl.obrigatorio || false,
          template_item_id: tpl.id,
          engine_version: 'template_v2',
          engine_source: 'generateFullCronograma',
          created_by_flow: flowLabel,
          status: 'a_fazer',
          data_inicio_real: dataInicioItem.toISOString(),
          data_termino_previsto: dataTermino.toISOString(),
          dependencias: tpl.depends_on_item_ids || [],
          sessoes_total: tpl.metadata?.total_allowed || 0,
          sessoes_realizadas: 0,
          progresso_percentual: 0,
          total_visualizacoes: 0
        });

        itemsCriados.push(item);

        // ContractAttendances para atendimentos por frequência
        if (
          contract_id &&
          tpl.item_tipo === 'atendimento' &&
          tpl.metadata?.scheduling_type === 'frequency' &&
          tpl.metadata?.frequency_days &&
          tpl.metadata?.total_allowed
        ) {
          for (let j = 0; j < tpl.metadata.total_allowed; j++) {
            const scheduledDate = new Date(dataInicio);
            scheduledDate.setDate(scheduledDate.getDate() + (tpl.metadata.frequency_days * j));
            await base44.asServiceRole.entities.ContractAttendance.create({
              contract_id,
              workshop_id,
              plan_id: planId,
              attendance_type_id: tpl.item_id,
              attendance_type_name: tpl.titulo,
              scheduled_date: scheduledDate.toISOString(),
              status: 'pendente',
              generated_by: 'system',
              sequence_number: j + 1
            });
          }
        }
      }

    } else {
      // ── Fallback engine v1: arrays legados de PlanFeature ─────────────────
      console.log(`[generateFullCronograma] Nenhum CronogramaTemplateItem para ${planId} — usando fallback legacy_v1`);

      const planFeatures = await base44.asServiceRole.entities.PlanFeature.filter({ plan_id: planId });
      const planConfig = planFeatures[0];

      if (!planConfig) {
        return Response.json({ error: `Plano "${planId}" não configurado e sem CronogramaTemplateItem` }, { status: 404 });
      }

      const attendanceRules = await base44.asServiceRole.entities.PlanAttendanceRule.filter({
        plan_id: planId,
        is_active: true
      });

      const allLegacyItems = [
        ...(planConfig.cronograma_features || []).map((f, i) => ({ tipo: 'funcionalidade', id: f, nome: f.replace(/_/g, ' ').toUpperCase(), i, total: (planConfig.cronograma_features || []).length })),
        ...(planConfig.cronograma_modules || []).map((m, i) => ({ tipo: 'modulo', id: m, nome: m, i, total: (planConfig.cronograma_modules || []).length }))
      ];

      for (const entry of allLegacyItems) {
        const existing = await base44.asServiceRole.entities.CronogramaImplementacao.filter({
          workshop_id,
          item_id: entry.id,
          item_tipo: entry.tipo
        });
        if (existing && existing.length > 0) continue;

        // Prazo dinâmico: distribuir linearmente, mínimo 7 dias por item
        const diasPorItem = Math.max(7, Math.floor(60 / entry.total));
        const dataInicioItem = new Date(dataInicio);
        dataInicioItem.setDate(dataInicioItem.getDate() + diasPorItem * entry.i);
        const dataTermino = new Date(dataInicioItem);
        dataTermino.setDate(dataTermino.getDate() + diasPorItem);

        const item = await base44.asServiceRole.entities.CronogramaImplementacao.create({
          workshop_id,
          item_tipo: entry.tipo,
          item_id: entry.id,
          item_nome: entry.nome,
          item_categoria: entry.tipo === 'funcionalidade' ? 'funcionalidades' : 'modulos',
          engine_version: 'legacy_v1',
          engine_source: 'generateFullCronograma',
          created_by_flow: flowLabel,
          status: 'a_fazer',
          data_inicio_real: dataInicioItem.toISOString(),
          data_termino_previsto: dataTermino.toISOString(),
          progresso_percentual: 0,
          total_visualizacoes: 0
        });
        itemsCriados.push(item);
      }

      // Atendimentos via PlanAttendanceRule
      for (let i = 0; i < (attendanceRules || []).length; i++) {
        const rule = attendanceRules[i];

        const existing = await base44.asServiceRole.entities.CronogramaImplementacao.filter({
          workshop_id,
          item_id: rule.attendance_type_id,
          item_tipo: 'atendimento'
        });
        if (existing && existing.length > 0) continue;

        let attendanceTypeName = rule.attendance_type_name || rule.attendance_type_id;
        try {
          const at = await base44.asServiceRole.entities.TipoAtendimentoConsultoria.get(rule.attendance_type_id);
          if (at?.name) attendanceTypeName = at.name;
        } catch (_) { /* continua com cache */ }

        // Prazo real: frequency_days × total_allowed (nunca hardcoded)
        const prazo = rule.frequency_days && rule.total_allowed
          ? rule.frequency_days * rule.total_allowed
          : Math.max(7, 30);

        const dataInicioItem = new Date(dataInicio);
        dataInicioItem.setDate(dataInicioItem.getDate() + Math.floor((30 / (attendanceRules.length || 1)) * i));
        const dataTermino = new Date(dataInicioItem);
        dataTermino.setDate(dataTermino.getDate() + prazo);

        const item = await base44.asServiceRole.entities.CronogramaImplementacao.create({
          workshop_id,
          item_tipo: 'atendimento',
          item_id: rule.attendance_type_id,
          item_nome: `${attendanceTypeName} (${rule.total_allowed}x)`,
          item_categoria: 'atendimentos',
          engine_version: 'legacy_v1',
          engine_source: 'generateFullCronograma',
          created_by_flow: flowLabel,
          status: 'a_fazer',
          data_inicio_real: dataInicioItem.toISOString(),
          data_termino_previsto: dataTermino.toISOString(),
          sessoes_total: rule.total_allowed || 0,
          sessoes_realizadas: 0,
          progresso_percentual: 0,
          total_visualizacoes: 0
        });
        itemsCriados.push(item);

        if (contract_id && rule.scheduling_type === 'frequency' && rule.frequency_days) {
          for (let j = 0; j < rule.total_allowed; j++) {
            const scheduledDate = new Date(dataInicio);
            scheduledDate.setDate(scheduledDate.getDate() + (rule.frequency_days * j));
            await base44.asServiceRole.entities.ContractAttendance.create({
              contract_id,
              workshop_id,
              plan_id: planId,
              attendance_type_id: rule.attendance_type_id,
              attendance_type_name: attendanceTypeName,
              scheduled_date: scheduledDate.toISOString(),
              status: 'pendente',
              generated_by: 'system',
              sequence_number: j + 1
            });
          }
        }
      }
    }

    return Response.json({
      success: true,
      engine: engineUsed,
      plan_id: planId,
      items_created: itemsCriados.length,
      message: `Cronograma gerado: ${itemsCriados.length} itens (engine: ${engineUsed})`
    });

  } catch (error) {
    console.error('[generateFullCronograma] Erro:', error);
    return Response.json({
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});
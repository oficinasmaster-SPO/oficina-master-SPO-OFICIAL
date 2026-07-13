import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { format } from 'npm:date-fns@3';
import { ptBR } from 'npm:date-fns@3/locale/pt-BR';

const MENSAGEM_POLITICA = `Ficou alinhado que, após a reunião ser confirmada e agendada, qualquer solicitação de cancelamento ou remarcação deverá ser realizada com no mínimo 48 horas de antecedência. Caso o aviso não seja feito dentro desse prazo, a reunião será considerada como realizada e contabilizada normalmente dentro do plano contratado como reunião concluída.`;

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
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { atendimento_id, workshop_id } = await req.json();
  if (!atendimento_id) return Response.json({ error: 'atendimento_id obrigatório' }, { status: 400 });

  // Validação de tenant EXCLUSIVAMENTE via resolveTenantCore (membership-first).
  // Sem workshop_id explícito, resolve o tenant default do usuário.
  const tenantParams = workshop_id
    ? (user.role === 'admin' ? { admin_workshop_id: workshop_id } : { workshop_id })
    : {};
  const tenant = await resolveTenantCore(base44.asServiceRole, user, tenantParams);
  if (tenant.status !== 200) {
    return Response.json({ error: tenant.error }, { status: tenant.status });
  }
  const effectiveWorkshopId = tenant.data.workshop.id;

  // Buscar atendimento SEMPRE escopado ao workshop do tenant resolvido
  let atendimento = null;
  try {
    const lista = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter(
      { workshop_id: effectiveWorkshopId }, '-data_agendada', 500
    );
    atendimento = lista?.find(a => a.id === atendimento_id) || null;
  } catch (_) {}

  if (!atendimento) return Response.json({ error: 'Atendimento não encontrado' }, { status: 404 });

  // ✅ Validar janela de 24h (até 24h ANTES do atendimento)
  const dataAtendimento = new Date(atendimento.data_agendada);
  const agora = new Date();
  const horas24Antes = new Date(dataAtendimento.getTime() - 24 * 60 * 60 * 1000);

  if (agora > dataAtendimento) {
    return Response.json({ 
      error: 'Não é possível confirmar um atendimento que já passou',
      status: 400
    });
  }

  if (agora < horas24Antes) {
    const diasFaltando = Math.ceil((horas24Antes - agora) / (1000 * 60 * 60 * 24));
    return Response.json({ 
      error: 'Confirmação de presença só é aceita até 24 horas antes do atendimento',
      dias_faltando: diasFaltando,
      status: 400
    });
  }

  // Idempotência: só confirma se ainda estiver agendado
  if (atendimento.status !== 'agendado') {
    return Response.json({ success: true, message: 'Já confirmado anteriormente', enviados: [] });
  }

  // Atualizar status para confirmado (membership já validada acima)
  await base44.asServiceRole.entities.ConsultoriaAtendimento.update(atendimento_id, { status: 'confirmado' });

  // Buscar workshop para dados do cliente
  let workshopName = '';
  let clienteEmail = '';
  try {
    const workshop = await base44.asServiceRole.entities.Workshop.get(atendimento.workshop_id);
    workshopName = workshop?.name || '';
    clienteEmail = workshop?.email || '';
  } catch (_) {}

  // Buscar email do consultor
  let consultorEmail = '';
  try {
    const consultorUser = await base44.asServiceRole.entities.User.get(atendimento.consultor_id);
    consultorEmail = consultorUser?.email || '';
  } catch (_) {}

  const dataFormatada = format(new Date(atendimento.data_agendada), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  const assunto = `✅ Presença Confirmada — ${atendimento.tipo_atendimento || 'Reunião'} em ${dataFormatada}`;

  const corpo = `
<p>Olá,</p>
<p>A presença para a reunião abaixo foi <strong>confirmada pelo cliente</strong>:</p>
<ul>
  <li><strong>Tipo:</strong> ${atendimento.tipo_atendimento || '—'}</li>
  <li><strong>Data:</strong> ${dataFormatada}</li>
  <li><strong>Consultor:</strong> ${atendimento.consultor_nome || '—'}</li>
  <li><strong>Cliente:</strong> ${workshopName || '—'}</li>
  ${atendimento.google_meet_link ? `<li><strong>Link Meet:</strong> <a href="${atendimento.google_meet_link}">${atendimento.google_meet_link}</a></li>` : ''}
</ul>
<hr/>
<p><strong>⚠️ Política de cancelamento e remarcação:</strong></p>
<p>${MENSAGEM_POLITICA}</p>
<br/>
<p>Atenciosamente,<br/>Equipe Oficinas Master</p>
  `.trim();

  const destinatarios = [consultorEmail, clienteEmail].filter(Boolean);
  for (const email of destinatarios) {
    try {
      await base44.integrations.Core.SendEmail({ to: email, subject: assunto, body: corpo });
    } catch (_) {}
  }

  return Response.json({ success: true, enviados: destinatarios });
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function getEmailById(base44, userId) {
  try {
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    return users?.[0]?.email || null;
  } catch { return null; }
}

async function sendEmail(base44, to, subject, html) {
  if (!to) return;
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body: html });
  } catch (e) {
    console.error(`Erro ao enviar e-mail para ${to}:`, e.message);
  }
}

async function createNotification(base44, userId, titulo, mensagem, pedidoId) {
  try {
    await base44.asServiceRole.entities.Notification.create({
      user_id: userId,
      type: 'pedido_interno',
      title: titulo,
      message: mensagem,
      is_read: false,
      metadata: { pedido_id: pedidoId }
    });
  } catch (e) {
    console.error('Erro ao criar notificação:', e.message);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Pedidos não concluídos e não recusados
    const pedidos = await base44.asServiceRole.entities.PedidoInterno.list();
    const pedidosAtivos = pedidos.filter(p => !['concluido', 'recusado'].includes(p.status));

    let emailsEnviados = 0;
    let notificacoesInApp = 0;

    const link = `${Deno.env.get('APP_URL') || 'https://app.oficinasmaster.com.br'}/ControleAceleracao`;

    for (const pedido of pedidosAtivos) {
      if (!pedido.prazo || !pedido.assignee_id) continue;

      const prazo = new Date(pedido.prazo);
      prazo.setHours(0, 0, 0, 0);

      const diasAtraso = Math.round((hoje - prazo) / (1000 * 60 * 60 * 24));
      const diasParaPrazo = Math.round((prazo - hoje) / (1000 * 60 * 60 * 24));

      const responsavelEmail = await getEmailById(base44, pedido.assignee_id);
      const solicitanteEmail = pedido.requester_id ? await getEmailById(base44, pedido.requester_id) : null;

      const ctx = pedido.workshop_nome ? `[${pedido.workshop_nome}] ` : '';

      // ── D-1: lembrete ao responsável ─────────────────────────────────────────
      if (diasParaPrazo === 1 && !pedido.notificacao_lembrete_enviada) {
        const subject = `⏰ Pedido Interno vence amanhã: ${pedido.titulo}`;
        const html = `<p>Olá ${pedido.assignee_name || ''},</p>
<p>O pedido interno <strong>${ctx}${pedido.titulo}</strong> vence <strong>amanhã (${pedido.prazo})</strong>.</p>
<p>Solicitante: ${pedido.requester_name || 'não informado'}</p>
<p><a href="${link}">→ Ver pedido no sistema</a></p>`;

        await sendEmail(base44, responsavelEmail, subject, html);
        await createNotification(base44, pedido.assignee_id, subject, `${ctx}${pedido.titulo} vence amanhã`, pedido.id);
        await base44.asServiceRole.entities.PedidoInterno.update(pedido.id, { notificacao_lembrete_enviada: true });
        emailsEnviados++;
        notificacoesInApp++;
      }

      // ── D0: vencimento ───────────────────────────────────────────────────────
      if (diasAtraso === 0 && !pedido.notificacao_vencimento_enviada) {
        const subject = `🔴 Pedido Interno vence hoje: ${pedido.titulo}`;
        const html = `<p>Atenção ${pedido.assignee_name || ''},</p>
<p>O pedido interno <strong>${ctx}${pedido.titulo}</strong> vence <strong>hoje (${pedido.prazo})</strong>.</p>
<p><a href="${link}">→ Responder agora</a></p>`;

        await sendEmail(base44, responsavelEmail, subject, html);
        await createNotification(base44, pedido.assignee_id, `🔴 Vence hoje: ${pedido.titulo}`, `${ctx}${pedido.titulo} vence hoje`, pedido.id);
        await base44.asServiceRole.entities.PedidoInterno.update(pedido.id, { notificacao_vencimento_enviada: true, vencido: true });
        emailsEnviados++;
        notificacoesInApp++;
      }

      // ── D+1: escalonamento ao solicitante ────────────────────────────────────
      if (diasAtraso === 1 && !pedido.notificacao_escalamento_d1_enviada) {
        const subject = `🚨 Pedido Interno atrasado 1 dia: ${pedido.titulo}`;
        const html = `<p>O pedido interno <strong>${ctx}${pedido.titulo}</strong> está <strong>1 dia atrasado</strong> (prazo era ${pedido.prazo}).</p>
<p>Responsável: ${pedido.assignee_name || 'não informado'}</p>
<p><a href="${link}">→ Ver pedido no sistema</a></p>`;

        await sendEmail(base44, responsavelEmail, subject, html);
        if (solicitanteEmail && solicitanteEmail !== responsavelEmail) {
          await sendEmail(base44, solicitanteEmail, `[Escalonamento] ${subject}`, html);
          emailsEnviados++;
          await createNotification(base44, pedido.requester_id, subject, `${ctx}${pedido.titulo} está 1 dia atrasado`, pedido.id);
          notificacoesInApp++;
        }
        await base44.asServiceRole.entities.PedidoInterno.update(pedido.id, { notificacao_escalamento_d1_enviada: true });
        emailsEnviados++;
        notificacoesInApp++;
      }

      // ── D+3: escalonamento crítico ───────────────────────────────────────────
      if (diasAtraso === 3 && !pedido.notificacao_escalamento_d3_enviada) {
        const subject = `🚨🚨 Pedido Interno atrasado 3 dias: ${pedido.titulo}`;
        const html = `<p><strong>ESCALONAMENTO CRÍTICO</strong></p>
<p>O pedido interno <strong>${ctx}${pedido.titulo}</strong> está <strong>3 dias atrasado</strong> (prazo era ${pedido.prazo}).</p>
<p>Responsável: ${pedido.assignee_name || 'não informado'} | Prioridade: ${pedido.prioridade}</p>
<p><a href="${link}">→ Ver pedido no sistema</a></p>`;

        await sendEmail(base44, responsavelEmail, subject, html);
        if (solicitanteEmail && solicitanteEmail !== responsavelEmail) {
          await sendEmail(base44, solicitanteEmail, subject, html);
          emailsEnviados++;
          await createNotification(base44, pedido.requester_id, subject, `${ctx}${pedido.titulo} está 3 dias atrasado`, pedido.id);
          notificacoesInApp++;
        }
        await base44.asServiceRole.entities.PedidoInterno.update(pedido.id, { notificacao_escalamento_d3_enviada: true });
        emailsEnviados++;
        notificacoesInApp++;
      }
    }

    return Response.json({
      ok: true,
      verificados: pedidosAtivos.length,
      emails_enviados: emailsEnviados,
      notificacoes_inapp: notificacoesInApp
    });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
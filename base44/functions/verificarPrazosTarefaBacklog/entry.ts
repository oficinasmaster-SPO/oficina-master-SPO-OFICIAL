import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Helper: busca email do usuário por ID
async function getEmailById(base44, userId) {
  try {
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    return users?.[0]?.email || null;
  } catch { return null; }
}

// Helper: envia e-mail via Resend
async function sendEmail(base44, to, subject, html) {
  if (!to) return;
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body: html });
  } catch (e) {
    console.error(`Erro ao enviar e-mail para ${to}:`, e.message);
  }
}

// Helper: cria notificação in-app
async function createNotification(base44, userId, titulo, mensagem, tarefaId) {
  try {
    await base44.asServiceRole.entities.Notification.create({
      user_id: userId,
      titulo,
      message: mensagem,
      is_read: false,
      metadata: { tarefa_id: tarefaId }
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

    const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
    const d1Vencido = new Date(hoje); d1Vencido.setDate(d1Vencido.getDate() - 1);
    const d3Vencido = new Date(hoje); d3Vencido.setDate(d3Vencido.getDate() - 3);

    const tarefas = await base44.asServiceRole.entities.TarefaBacklog.list();
    const tarefasAbertas = tarefas.filter(t => t.status !== 'concluida');

    let emailsEnviados = 0;
    let notificacoesInApp = 0;

    for (const tarefa of tarefasAbertas) {
      if (!tarefa.prazo) continue;

      const prazo = new Date(tarefa.prazo);
      prazo.setHours(0, 0, 0, 0);

      const diasAtraso = Math.round((hoje - prazo) / (1000 * 60 * 60 * 24));
      const diasParaPrazo = Math.round((prazo - hoje) / (1000 * 60 * 60 * 24));

      const responsavelEmail = tarefa.consultor_id ? await getEmailById(base44, tarefa.consultor_id) : null;
      const criadorEmail = tarefa.criado_por_id ? await getEmailById(base44, tarefa.criado_por_id) : null;

      const ctx = tarefa.cliente_nome ? `[${tarefa.cliente_nome}] ` : '';
      const link = `${Deno.env.get('APP_URL') || 'https://app.oficinasmaster.com.br'}/ControleAceleracao`;

      // ── D-1: lembrete pro responsável ───────────────────────────────────────
      if (diasParaPrazo === 1 && !tarefa.notificacao_prazo_proximo_enviada) {
        const subject = `⏰ Tarefa vence amanhã: ${tarefa.titulo}`;
        const html = `<p>Olá,</p>
<p>A tarefa <strong>${ctx}${tarefa.titulo}</strong> vence <strong>amanhã (${tarefa.prazo})</strong>.</p>
<p><a href="${link}">→ Ver tarefa no sistema</a></p>`;

        await sendEmail(base44, responsavelEmail, subject, html);
        await createNotification(base44, tarefa.consultor_id, subject, `${ctx}${tarefa.titulo} vence amanhã`, tarefa.id);
        await base44.asServiceRole.entities.TarefaBacklog.update(tarefa.id, { notificacao_prazo_proximo_enviada: true });
        emailsEnviados++;
        notificacoesInApp++;
      }

      // ── D0: vencimento ───────────────────────────────────────────────────────
      if (diasAtraso === 0 && !tarefa.notificacao_vencimento_enviada) {
        const subject = `🔴 Tarefa vence hoje: ${tarefa.titulo}`;
        const html = `<p>Atenção,</p>
<p>A tarefa <strong>${ctx}${tarefa.titulo}</strong> vence <strong>hoje (${tarefa.prazo})</strong>. Conclua ou atualize o status.</p>
<p><a href="${link}">→ Ver tarefa no sistema</a></p>`;

        await sendEmail(base44, responsavelEmail, subject, html);
        await createNotification(base44, tarefa.consultor_id, `🔴 Vence hoje: ${tarefa.titulo}`, `${ctx}${tarefa.titulo} vence hoje`, tarefa.id);
        await base44.asServiceRole.entities.TarefaBacklog.update(tarefa.id, { notificacao_vencimento_enviada: true });
        emailsEnviados++;
        notificacoesInApp++;
      }

      // ── D+1: escalonamento ───────────────────────────────────────────────────
      if (diasAtraso === 1 && !tarefa.notificacao_escalamento_d1_enviada) {
        const subject = `🚨 Tarefa atrasada 1 dia: ${tarefa.titulo}`;
        const html = `<p>Atenção,</p>
<p>A tarefa <strong>${ctx}${tarefa.titulo}</strong> está <strong>1 dia atrasada</strong> (prazo era ${tarefa.prazo}).</p>
<p>Responsável: ${tarefa.consultor_nome || 'não informado'}</p>
<p><a href="${link}">→ Ver tarefa no sistema</a></p>`;

        // Vai para responsável E criador
        await sendEmail(base44, responsavelEmail, subject, html);
        if (criadorEmail && criadorEmail !== responsavelEmail) {
          await sendEmail(base44, criadorEmail, `[Escalonamento] ${subject}`, html);
          emailsEnviados++;
        }
        if (tarefa.criado_por_id && tarefa.criado_por_id !== tarefa.consultor_id) {
          await createNotification(base44, tarefa.criado_por_id, subject, `${ctx}${tarefa.titulo} está 1 dia atrasada`, tarefa.id);
          notificacoesInApp++;
        }
        await base44.asServiceRole.entities.TarefaBacklog.update(tarefa.id, { notificacao_escalamento_d1_enviada: true });
        emailsEnviados++;
        notificacoesInApp++;
      }

      // ── D+3: escalonamento crítico ───────────────────────────────────────────
      if (diasAtraso === 3 && !tarefa.notificacao_escalamento_d3_enviada) {
        const subject = `🚨🚨 Tarefa atrasada 3 dias: ${tarefa.titulo}`;
        const html = `<p><strong>ATENÇÃO — ESCALONAMENTO CRÍTICO</strong></p>
<p>A tarefa <strong>${ctx}${tarefa.titulo}</strong> está <strong>3 dias atrasada</strong> (prazo era ${tarefa.prazo}).</p>
<p>Responsável: ${tarefa.consultor_nome || 'não informado'}</p>
<p>Prioridade: ${tarefa.prioridade}</p>
<p><a href="${link}">→ Ver tarefa no sistema</a></p>`;

        await sendEmail(base44, responsavelEmail, subject, html);
        if (criadorEmail && criadorEmail !== responsavelEmail) {
          await sendEmail(base44, criadorEmail, subject, html);
          emailsEnviados++;
        }
        if (tarefa.criado_por_id && tarefa.criado_por_id !== tarefa.consultor_id) {
          await createNotification(base44, tarefa.criado_por_id, subject, `${ctx}${tarefa.titulo} está 3 dias atrasada`, tarefa.id);
          notificacoesInApp++;
        }
        await base44.asServiceRole.entities.TarefaBacklog.update(tarefa.id, { notificacao_escalamento_d3_enviada: true });
        emailsEnviados++;
        notificacoesInApp++;
      }
    }

    return Response.json({
      ok: true,
      verificadas: tarefasAbertas.length,
      emails_enviados: emailsEnviados,
      notificacoes_inapp: notificacoesInApp
    });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
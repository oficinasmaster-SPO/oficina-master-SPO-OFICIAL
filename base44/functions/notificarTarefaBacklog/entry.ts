import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;
    const eventType = event?.type;
    const tarefaId = data?.id || event?.entity_id;
    const now = new Date();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const notificacoes = [];

    // ✅ CRIAÇÃO: Notifica o responsável
    if (eventType === 'create') {
      if (!data.notificacao_criacao_enviada && data.consultor_id) {
        notificacoes.push({
          user_id: data.consultor_id,
          tipo: 'tarefa_criada',
          titulo: `Nova tarefa: ${data.titulo}`,
          mensagem: `${data.cliente_nome ? `[${data.cliente_nome}] ` : ''}${data.titulo}. Prazo: ${data.prazo}`,
          tarefa_id: tarefaId,
          link: `/backlog/${tarefaId}`
        });

        // Marca como notificado
        await base44.asServiceRole.entities.TarefaBacklog.update(tarefaId, {
          notificacao_criacao_enviada: true
        });
      }
    }

    // ✅ ATRIBUIÇÃO: Notifica o novo responsável
    if (eventType === 'update' && old_data && old_data.consultor_id !== data?.consultor_id) {
      if (data.consultor_id && !data.notificacao_atribuicao_enviada) {
        notificacoes.push({
          user_id: data.consultor_id,
          tipo: 'tarefa_atribuida',
          titulo: `Tarefa atribuída a você: ${data.titulo}`,
          mensagem: `${data.cliente_nome ? `[${data.cliente_nome}] ` : ''}${data.titulo}. Prazo: ${data.prazo}`,
          tarefa_id: tarefaId,
          link: `/backlog/${tarefaId}`
        });

        await base44.asServiceRole.entities.TarefaBacklog.update(tarefaId, {
          notificacao_atribuicao_enviada: true
        });
      }
    }

    // ✅ MUDANÇA DE STATUS: Notifica o criador (com debounce)
    if (eventType === 'update' && old_data && old_data.status !== data?.status) {
      if (data.criado_por_id && data.criado_por_id !== data.consultor_id) {
        const ultimaNotificacao = data.ultima_notificacao_status_em
          ? new Date(data.ultima_notificacao_status_em)
          : null;
        const minutosDesdeLasta = ultimaNotificacao
          ? (now - ultimaNotificacao) / (1000 * 60)
          : Infinity;

        // Debounce: só notifica se passou 30 minutos desde última
        if (minutosDesdeLasta >= 30 || !ultimaNotificacao) {
          notificacoes.push({
            user_id: data.criado_por_id,
            tipo: 'status_alterado',
            titulo: `Status alterado: ${data.titulo}`,
            mensagem: `${data.cliente_nome ? `[${data.cliente_nome}] ` : ''}${data.titulo}. Novo status: ${data.status}`,
            tarefa_id: tarefaId,
            link: `/backlog/${tarefaId}`
          });

          await base44.asServiceRole.entities.TarefaBacklog.update(tarefaId, {
            ultima_notificacao_status_em: now.toISOString()
          });
        }
      }
    }

    // ✅ BLOQUEIO: Alerta forte ao criador
    if (eventType === 'update' && old_data && old_data.status !== 'bloqueada' && data?.status === 'bloqueada') {
      if (data.criado_por_id) {
        notificacoes.push({
          user_id: data.criado_por_id,
          tipo: 'tarefa_bloqueada',
          titulo: `⚠️ Tarefa bloqueada: ${data.titulo}`,
          mensagem: `${data.cliente_nome ? `[${data.cliente_nome}] ` : ''}${data.titulo} foi bloqueada. Motivo: ${data.motivo_bloqueio || 'Não especificado'}`,
          tarefa_id: tarefaId,
          link: `/backlog/${tarefaId}`
        });

        await base44.asServiceRole.entities.TarefaBacklog.update(tarefaId, {
          notificacao_bloqueio_enviada: true
        });
      }
    }

    // ✅ CONCLUSÃO: Notifica o criador
    if (eventType === 'update' && old_data && old_data.status !== 'concluida' && data?.status === 'concluida') {
      if (data.criado_por_id) {
        notificacoes.push({
          user_id: data.criado_por_id,
          tipo: 'tarefa_concluida',
          titulo: `✅ Tarefa concluída: ${data.titulo}`,
          mensagem: `${data.cliente_nome ? `[${data.cliente_nome}] ` : ''}${data.titulo} foi concluída`,
          tarefa_id: tarefaId,
          link: `/backlog/${tarefaId}`
        });

        await base44.asServiceRole.entities.TarefaBacklog.update(tarefaId, {
          notificacao_conclusao_enviada: true
        });
      }
    }

    // Persiste notificações in-app + dispara e-mail nos eventos de criação/atribuição
    for (const notif of notificacoes) {
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_id: notif.user_id,
          tipo: notif.tipo,
          title: notif.titulo,
          message: notif.mensagem,
          is_read: false,
          email_sent: false,
          metadata: {
            tarefa_id: notif.tarefa_id,
            link: notif.link
          }
        });
      } catch (e) {
        console.error('Erro ao criar notificação:', e.message);
      }

      // Envia e-mail apenas nos eventos de criação e atribuição
      if (notif.tipo === 'tarefa_criada' || notif.tipo === 'tarefa_atribuida') {
        try {
          // Busca o e-mail do responsável
          const users = await base44.asServiceRole.entities.User.filter({ id: notif.user_id });
          const responsavel = users?.[0];
          if (responsavel?.email) {
            const prioridade = data?.prioridade || 'media';
            const prazo = data?.prazo || '';
            const clienteNome = data?.cliente_nome || '';
            const descricao = data?.descricao || '';

            const prioridadeLabel = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: '🔴 Crítica' }[prioridade] || prioridade;
            const acao = notif.tipo === 'tarefa_criada' ? 'criada e atribuída' : 'atribuída';

            const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #dc2626; padding: 24px 32px;">
      <h1 style="color: #fff; margin: 0; font-size: 18px;">📋 Nova Tarefa ${acao} a você</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #111; font-size: 20px; margin: 0 0 8px 0;">${data.titulo}</h2>
      ${clienteNome ? `<p style="color: #6b7280; margin: 0 0 20px 0; font-size: 14px;">🏢 Cliente: <strong>${clienteNome}</strong></p>` : ''}
      ${descricao ? `
      <div style="background: #f9fafb; border-left: 4px solid #dc2626; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
        <p style="color: #374151; margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-line;">${descricao}</p>
      </div>` : ''}
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; width: 40%;">Prioridade</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111; font-size: 14px; font-weight: 600;">${prioridadeLabel}</td>
        </tr>
        ${prazo ? `<tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Prazo</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111; font-size: 14px; font-weight: 600;">${prazo}</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Criado por</td>
          <td style="padding: 8px 0; color: #111; font-size: 14px;">${data?.consultor_nome || 'Sistema'}</td>
        </tr>
      </table>
      <p style="color: #6b7280; font-size: 13px; margin: 0;">Acesse a plataforma Oficinas Master para ver todos os detalhes e gerenciar esta tarefa.</p>
    </div>
  </div>
</body>
</html>`;

            await base44.asServiceRole.integrations.Core.SendEmail({
              to: responsavel.email,
              subject: `[Backlog] Nova tarefa: ${data.titulo}${clienteNome ? ` — ${clienteNome}` : ''}`,
              body: htmlBody
            });
          }
        } catch (emailErr) {
          console.error('Erro ao enviar e-mail de tarefa:', emailErr.message);
        }
      }
    }

    return Response.json({ ok: true, notificacoes: notificacoes.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
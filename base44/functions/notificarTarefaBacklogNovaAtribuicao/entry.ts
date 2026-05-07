import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { data } = payload;

    if (!data?.id || !data?.atribuido_para_id) {
      return Response.json({ ok: true, skipped: 'missing_data' });
    }

    const titulo = data.titulo || 'Tarefa sem título';
    const prioridade = data.prioridade || 'média';
    const prazo = data.prazo ? new Date(data.prazo).toLocaleDateString('pt-BR') : 'sem prazo';

    const message = `Nova tarefa atribuída para você: ${titulo} | Prioridade: ${prioridade} | Prazo: ${prazo}`;

    // Criar notificação in-app
    await base44.asServiceRole.entities.Notification.create({
      user_id: data.atribuido_para_id,
      type: 'nova_tarefa_atribuida',
      title: 'Nova Tarefa Atribuída',
      message: message,
      metadata: {
        tarefa_id: data.id,
        titulo: titulo,
        prioridade: prioridade
      }
    });

    // Enviar email se possível (usando integração)
    try {
      const user = await base44.asServiceRole.entities.User.filter({ id: data.atribuido_para_id }, '', 1);
      if (user && user[0]?.email) {
        await base44.integrations.Core.SendEmail({
          to: user[0].email,
          subject: `Nova tarefa: ${titulo}`,
          body: `${message}\n\nAcesse a plataforma para visualizar detalhes.`
        });
      }
    } catch (err) {
      console.log('Email não enviado:', err.message);
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Erro ao notificar nova atribuição:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
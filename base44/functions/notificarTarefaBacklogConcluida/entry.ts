import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { data, old_data } = payload;

    // Verificar se a tarefa foi concluída
    if (!data?.id || data.status !== 'concluida' || old_data?.status === 'concluida') {
      return Response.json({ ok: true, skipped: 'nao_concluida' });
    }

    const titulo = data.titulo || 'Tarefa sem título';
    const message = `✅ Tarefa concluída: ${titulo}`;

    // Notificar quem criou a tarefa
    if (data.criado_por_id) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: data.criado_por_id,
        type: 'tarefa_concluida',
        title: 'Tarefa Concluída',
        message: message,
        metadata: {
          tarefa_id: data.id,
          titulo: titulo,
          data_conclusao: data.data_conclusao || new Date().toISOString()
        }
      });

      // Enviar email
      try {
        const user = await base44.asServiceRole.entities.User.filter({ id: data.criado_por_id }, '', 1);
        if (user && user[0]?.email) {
          await base44.integrations.Core.SendEmail({
            to: user[0].email,
            subject: `Tarefa concluída: ${titulo}`,
            body: message
          });
        }
      } catch (err) {
        console.log('Email não enviado:', err.message);
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Erro ao notificar conclusão:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
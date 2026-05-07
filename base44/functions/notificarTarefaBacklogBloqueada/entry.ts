import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { data, old_data } = payload;

    // Verificar se a tarefa foi bloqueada
    if (!data?.id || data.status !== 'bloqueada' || old_data?.status === 'bloqueada') {
      return Response.json({ ok: true, skipped: 'nao_bloqueada' });
    }

    const titulo = data.titulo || 'Tarefa sem título';
    const motivo = data.motivo_bloqueio || 'Motivo não informado';
    const message = `🚫 Tarefa bloqueada: ${titulo} | Motivo: ${motivo}`;

    // Notificar quem criou a tarefa
    if (data.criado_por_id) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: data.criado_por_id,
        type: 'tarefa_bloqueada',
        title: 'Tarefa Bloqueada',
        message: message,
        metadata: {
          tarefa_id: data.id,
          titulo: titulo,
          motivo_bloqueio: motivo
        }
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Erro ao notificar bloqueio:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
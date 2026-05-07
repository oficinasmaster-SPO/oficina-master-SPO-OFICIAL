import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { data, old_data } = payload;

    // Verificar se houve mudança de status
    if (!data?.id || data.status === old_data?.status) {
      return Response.json({ ok: true, skipped: 'sem_mudanca_status' });
    }

    const titulo = data.titulo || 'Tarefa sem título';
    const novoStatus = {
      aberta: 'Aberta',
      em_execucao: 'Em Execução',
      bloqueada: 'Bloqueada',
      concluida: 'Concluída'
    }[data.status] || data.status;

    const message = `A tarefa '${titulo}' mudou para: ${novoStatus}`;

    // Notificar quem criou a tarefa
    if (data.criado_por_id) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: data.criado_por_id,
        type: 'tarefa_mudanca_status',
        title: 'Tarefa com Status Alterado',
        message: message,
        metadata: {
          tarefa_id: data.id,
          titulo: titulo,
          status_anterior: old_data?.status,
          status_novo: data.status
        }
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Erro ao notificar mudança de status:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Data limite: 30 dias atrás
    const dataLimite = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dataLimiteStr = dataLimite.toISOString();

    // Buscar notificações lidas > 30 dias
    const antigasLidas = await base44.asServiceRole.entities.Notification.filter({
      is_read: true,
      created_date: { $lt: dataLimiteStr }
    }, null, 1000);

    let deletadas = 0;

    for (const notif of antigasLidas) {
      try {
        await base44.asServiceRole.entities.Notification.delete(notif.id);
        deletadas++;
      } catch (err) {
        console.log(`Erro ao deletar notificação ${notif.id}:`, err.message);
      }
    }

    return Response.json({
      success: true,
      deletadas,
      dataLimite: dataLimiteStr,
      message: `${deletadas} notificações lidas > 30 dias removidas`
    });
  } catch (error) {
    console.error('Erro ao limpar notificações:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
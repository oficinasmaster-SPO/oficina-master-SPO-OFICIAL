import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { workshop_id, processo_titulo, concluido_por_id, progresso_id } = body;

    if (!workshop_id || !processo_titulo) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Buscar quem concluiu
    const conclusor = concluido_por_id ? await base44.asServiceRole.entities.User.get(concluido_por_id) : null;
    const nomeConcllusor = conclusor?.full_name || 'Um usuário';

    // Buscar todos colaboradores da oficina (exceto quem concluiu)
    const colaboradores = await base44.asServiceRole.entities.Employee.filter({
      workshop_id: workshop_id,
      status: 'ativo'
    });

    let notificacoesCriadas = 0;

    for (const colab of colaboradores) {
      if (!colab.user_id || colab.user_id === concluido_por_id) continue;

      // Verificar preferências do usuário
      const prefs = await base44.asServiceRole.entities.Notification.filter({
        user_id: colab.user_id,
        type: 'config_preferencias'
      });

      const notificarConclusoes = prefs.length === 0 || prefs[0]?.metadata?.notificar_conclusoes !== false;

      if (notificarConclusoes) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: colab.user_id,
          workshop_id: workshop_id,
          processo_id: progresso_id,
          type: 'processo_concluido',
          title: '✅ Processo Concluído',
          message: `${nomeConcllusor} concluiu o processo "${processo_titulo}".`,
          is_read: false,
          email_sent: false
        });
        notificacoesCriadas++;
      }
    }

    return Response.json({ 
      success: true, 
      notificacoes_criadas: notificacoesCriadas
    });

  } catch (error) {
    console.error("Erro ao notificar conclusão:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
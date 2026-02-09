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
    const conclusor = concluido_por_id ? await base44.asServiceRole.entities.User.get(concluido_por_id) ;
    const nomeConcllusor = conclusor?.full_name || 'Um usuário';

    // Buscar todos colaboradores da oficina (exceto quem concluiu)
    const colaboradores = await base44.asServiceRole.entities.Employee.filter({
      workshop_id,
      status: 'ativo'
    });

    let notificacoesCriadas = 0;

    for (const colab of colaboradores) {
      if (!colab.user_id || colab.user_id === concluido_por_id) continue;

      // Verificar preferências do usuário
      const prefs = await base44.asServiceRole.entities.Notification.filter({
        user_id.user_id,
        type: 'config_preferencias'
      });

      const notificarConclusoes = prefs.length === 0 || prefs[0]?.metadata?.notificar_conclusoes !== false;

      if (notificarConclusoes) {
        const prefs = await base44.asServiceRole.entities.Notification.filter({
          user_id.user_id,
          type: 'config_preferencias'
        });
        const emailEnabled = prefs.length === 0 || prefs[0]?.metadata?.email_enabled !== false;

        const notifCriada = await base44.asServiceRole.entities.Notification.create({
          user_id.user_id,
          workshop_id,
          processo_id,
          type: 'processo_concluido',
          title: '✅ Processo Concluído',
          message: `${nomeConcllusor} concluiu o processo "${processo_titulo}".`,
          is_read,
          email_sent
        });
        notificacoesCriadas++;

        // Enviar e-mail se habilitado
        if (emailEnabled) {
          try {
            const user = await base44.asServiceRole.entities.User.get(colab.user_id);
            if (user?.email) {
              await base44.asServiceRole.integrations.Core.SendEmail({
                from_name: 'Oficinas Master',
                to.email,
                subject: '✅ Processo Concluído',
                body: `
                  ✅ Processo Concluído</h2>
                  ${nomeConcllusor} concluiu o processo "${processo_titulo}"</strong>.</p>
                  
                  Acesse a plataforma para visualizar os detalhes.</p>
                `
              });
              await base44.asServiceRole.entities.Notification.update(notifCriada.id, { email_sent });
            }
          } catch (emailError) {
            console.error('Erro ao enviar e-mail:', emailError);
          }
        }
      }
    }

    return Response.json({ 
      success, 
      notificacoes_criadas
    });

  } catch (error) {
    console.error("Erro ao notificar conclusão:", error);
    return Response.json({ 
      success,
      error.message 
    }, { status: 500 });
  }
});

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { workshop_id, ata_codigo, ata_tipo, criado_por_id } = body;

    if (!workshop_id || !ata_codigo) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Buscar quem criou
    const criador = criado_por_id ? await base44.asServiceRole.entities.User.get(criado_por_id) ;
    const nomeCriador = criador?.full_name || 'Um consultor';

    const tipoTexto = ata_tipo === 'evidencia_implementacao' 
      ? 'ATA de Evidência de Implementação' 
      : 'Nova ATA de Atendimento';

    // Buscar todos colaboradores da oficina (exceto quem criou)
    const colaboradores = await base44.asServiceRole.entities.Employee.filter({
      workshop_id,
      status: 'ativo'
    });

    let notificacoesCriadas = 0;

    for (const colab of colaboradores) {
      if (!colab.user_id || colab.user_id === criado_por_id) continue;

      // Verificar preferências
      const prefs = await base44.asServiceRole.entities.Notification.filter({
        user_id.user_id,
        type: 'config_preferencias'
      });

      const notificarAtas = prefs.length === 0 || prefs[0]?.metadata?.notificar_atas !== false;

      if (notificarAtas) {
        const emailEnabled = prefs.length === 0 || prefs[0]?.metadata?.email_enabled !== false;

        const notifCriada = await base44.asServiceRole.entities.Notification.create({
          user_id.user_id,
          workshop_id,
          type: 'nova_ata',
          title: '📋 ' + tipoTexto,
          message: `${nomeCriador} gerou a ${ata_codigo}. Acesse para visualizar.`,
          is_read,
          email_sent,
          metadata: { ata_codigo }
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
                subject: '📋 ' + tipoTexto,
                body: `
                  📋 ${tipoTexto}</h2>
                  ${nomeCriador} gerou a ${ata_codigo}</strong>.</p>
                  
                  Acesse a plataforma para visualizar o documento completo.</p>
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
    console.error("Erro ao notificar nova ATA:", error);
    return Response.json({ 
      success,
      error.message 
    }, { status: 500 });
  }
});

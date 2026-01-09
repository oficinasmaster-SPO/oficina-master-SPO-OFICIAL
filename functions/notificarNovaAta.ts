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
    const criador = criado_por_id ? await base44.asServiceRole.entities.User.get(criado_por_id) : null;
    const nomeCriador = criador?.full_name || 'Um consultor';

    const tipoTexto = ata_tipo === 'evidencia_implementacao' 
      ? 'ATA de Evidência de Implementação' 
      : 'Nova ATA de Atendimento';

    // Buscar todos colaboradores da oficina (exceto quem criou)
    const colaboradores = await base44.asServiceRole.entities.Employee.filter({
      workshop_id: workshop_id,
      status: 'ativo'
    });

    let notificacoesCriadas = 0;

    for (const colab of colaboradores) {
      if (!colab.user_id || colab.user_id === criado_por_id) continue;

      // Verificar preferências
      const prefs = await base44.asServiceRole.entities.Notification.filter({
        user_id: colab.user_id,
        type: 'config_preferencias'
      });

      const notificarAtas = prefs.length === 0 || prefs[0]?.metadata?.notificar_atas !== false;

      if (notificarAtas) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: colab.user_id,
          workshop_id: workshop_id,
          type: 'nova_ata',
          title: '📋 ' + tipoTexto,
          message: `${nomeCriador} gerou a ${ata_codigo}. Acesse para visualizar.`,
          is_read: false,
          email_sent: false,
          metadata: { ata_codigo }
        });
        notificacoesCriadas++;
      }
    }

    return Response.json({ 
      success: true, 
      notificacoes_criadas: notificacoesCriadas
    });

  } catch (error) {
    console.error("Erro ao notificar nova ATA:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
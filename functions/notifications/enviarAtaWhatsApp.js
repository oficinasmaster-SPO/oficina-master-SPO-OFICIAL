import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { atendimento_id } = await req.json();

    const atendimentos = await base44.entities.ConsultoriaAtendimento.filter({ id });
    const atendimento = atendimentos[0];

    if (!atendimento) {
      return Response.json({ error: 'Atendimento não encontrado' }, { status: 404 });
    }

    // Buscar workshop
    const workshops = await base44.entities.Workshop.filter({ id.workshop_id });
    const workshop = workshops[0];

    // Buscar owner
    const users = await base44.asServiceRole.entities.User.filter({ id.owner_id });
    const owner = users[0];

    // Gerar mensagem WhatsApp
    const mensagem = `
Olá ${owner.full_name || 'Parceiro'}!

Segue a ata da nossa reunião realizada em ${new Date(atendimento.data_realizada || atendimento.data_agendada).toLocaleDateString('pt-BR')}:

📋 Tipo: ${atendimento.tipo_atendimento}
⏰ Duração: ${atendimento.duracao_real_minutos || atendimento.duracao_minutos} minutos

${atendimento.ata_ia || atendimento.observacoes_consultor || 'Ata em preparação'}

Próximos Passos:
${atendimento.proximos_passos || 'A definir'}

Qualquer dúvida, estamos à disposição!
    `.trim();

    // Marcar como enviado
    await base44.entities.ConsultoriaAtendimento.update(atendimento_id, {
      ata_enviada_whatsapp
    });

    return Response.json({
      success,
      message: 'Preparado para WhatsApp',
      whatsapp_message,
      phone.telefone || workshop.telefone || ''
    });

  } catch (error) {
    return Response.json({ error.message }, { status: 500 });
  }
});

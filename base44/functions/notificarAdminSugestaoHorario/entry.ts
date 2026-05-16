import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Notifica o admin quando um cliente sugere um novo horário
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const {
      atendimento_id,
      workshop_id,
      data_sugerida,
      hora_sugerida,
      mensagem_cliente,
      consultor_nome,
      slot_disponivel,
      alternativas
    } = await req.json();

    if (!atendimento_id || !workshop_id) {
      return Response.json({
        error: 'atendimento_id e workshop_id são obrigatórios'
      }, { status: 400 });
    }

    // ── Buscar workshop ──
    const workshop = await base44.entities.Workshop.get(workshop_id);
    if (!workshop) {
      return Response.json({ error: 'Oficina não encontrada' }, { status: 404 });
    }

    // ── Buscar usuários admin da consultoria ──
    const admins = await base44.entities.User.filter({
      role: 'admin',
      'data.consulting_firm_id': workshop.consulting_firm_id
    });

    if (!admins || admins.length === 0) {
      return Response.json({
        success: true,
        message: 'Nenhum admin encontrado para notificação'
      });
    }

    const dataSugeridaFormatada = new Date(`${data_sugerida}T00:00:00`).toLocaleDateString('pt-BR', {
     weekday: 'long',
     day: '2-digit',
     month: '2-digit',
     year: 'numeric'
    });

    // ── Preparar conteúdo da notificação ──
    const assunto = `Nova Sugestão de Horário - ${workshop.name}`;
    
    const corpo = `
<h3>Nova Sugestão de Horário Recebida</h3>

<p><strong>Oficina:</strong> ${workshop.name}</p>
<p><strong>Consultor Atual:</strong> ${consultor_nome}</p>
<p><strong>Data Sugerida:</strong> ${dataSugeridaFormatada} às ${hora_sugerida}</p>

${mensagem_cliente ? `<p><strong>Mensagem do Cliente:</strong></p><blockquote>${mensagem_cliente}</blockquote>` : ''}

<p><strong>Status:</strong> ${slot_disponivel ? '✅ Slot livre - Pode confirmar direto' : '⏳ Slot ocupado - Apresentar alternativas'}</p>

${alternativas && alternativas.length > 0 ? `
<p><strong>Alternativas de Consultores:</strong></p>
<ul>
  ${alternativas.map(alt => `
    <li>
      ${alt.consultor_nome} - ${alt.data} às ${alt.hora}
      ${alt.distancia_dias > 0 ? `(+${alt.distancia_dias} dias)` : '(mesma data)'}
    </li>
  `).join('')}
</ul>
` : ''}

<p>
  <a href="https://seu-app.com/ControleAceleracao?tab=atendimentos&filter=pendente_aprovacao" 
     style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
    Ver Detalhes
  </a>
</p>
    `.trim();

    // ── Enviar notificações por email aos admins ──
    const emailPromises = admins.map(admin =>
      base44.integrations.Core.SendEmail({
        to: admin.email,
        subject: assunto,
        body: corpo,
        from_name: 'Sistema de Agendamentos'
      }).catch(e => {
        console.warn(`Erro ao enviar email para ${admin.email}:`, e.message);
        return null;
      })
    );

    const emailResults = await Promise.all(emailPromises);
    const emailsEnviados = emailResults.filter(r => r !== null).length;

    // ── Criar notificação in-app para admins ──
    const notificacoes = admins.map(admin => ({
      user_id: admin.id,
      tipo: 'sugestao_horario',
      titulo: `Nova Sugestão de Horário - ${workshop.name}`,
      mensagem: `${workshop.name} sugeriu novo horário: ${dataSugeridaFormatada} às ${hora_sugerida}`,
      data_criacao: new Date().toISOString(),
      is_read: false,
      referencia_id: atendimento_id,
      referencia_tipo: 'atendimento'
    }));

    try {
      await base44.entities.Notification.bulkCreate(notificacoes);
    } catch (e) {
      console.warn('Erro ao criar notificações in-app:', e.message);
    }

    console.log(`✅ Notificação de sugestão enviada para ${emailsEnviados} admin(s)`);

    return Response.json({
      success: true,
      emailsEnviados,
      notificacoesInApp: notificacoes.length
    });

  } catch (error) {
    console.error('Erro em notificarAdminSugestaoHorario:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
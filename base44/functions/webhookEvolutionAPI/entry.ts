import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Webhook para Evolution API (WhatsApp não-oficial)
 * Recebe mensagens do WhatsApp e cria leads automaticamente
 * 
 * IMPORTANTE: Viola termos do WhatsApp - use por sua conta e risco
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    if (req.method !== 'POST') {
      return Response.json({ error: 'Método não suportado' }, { status: 405 });
    }

    const body = await req.json();

    // Estrutura típica da Evolution API
    const { event, instance, data } = body;

    // Filtrar apenas mensagens recebidas (não enviadas)
    if (event !== 'messages.upsert' || data?.key?.fromMe) {
      return Response.json({ message: 'Ignorado' }, { status: 200 });
    }

    const message = data?.message?.conversation || 
                    data?.message?.extendedTextMessage?.text || '';
    
    const phone = data?.key?.remoteJid?.replace('@s.whatsapp.net', '');
    const pushName = data?.pushName || 'Desconhecido';

    // Palavras-chave para capturar lead
    const keywords = [
      'trabalhar',
      'vaga',
      'emprego',
      'contratar',
      'curriculo',
      'currículo',
      'oportunidade'
    ];

    const isLeadMessage = keywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (!isLeadMessage) {
      return Response.json({ message: 'Não é lead' }, { status: 200 });
    }

    // Identificar workshop pela instância
    const workshops = await base44.asServiceRole.entities.Workshop.list();
    const workshop = workshops.find(w => w.whatsapp_instance === instance) || workshops[0];

    if (!workshop) {
      return Response.json({ error: 'Workshop não encontrado' }, { status: 404 });
    }

    // Verificar se já existe candidato com esse telefone
    const existingCandidates = await base44.asServiceRole.entities.Candidate.filter({
      workshop_id: workshop.id,
      phone: phone
    });

    if (existingCandidates.length > 0) {
      // Atualizar timeline
      const candidate = existingCandidates[0];
      const updatedTimeline = [
        ...(candidate.timeline || []),
        {
          timestamp: new Date().toISOString(),
          action: 'nova_mensagem_whatsapp',
          user_id: 'system',
          details: message
        }
      ];

      await base44.asServiceRole.entities.Candidate.update(candidate.id, {
        timeline: updatedTimeline
      });

      return Response.json({ 
        message: 'Candidato já existe, timeline atualizada',
        candidate_id: candidate.id
      });
    }

    // Criar novo candidato
    const candidateData = {
      workshop_id: workshop.id,
      full_name: pushName,
      phone: phone,
      desired_position: 'A definir',
      origin_channel: 'cadastro_manual',
      campaign_name: 'WhatsApp Orgânico',
      status: 'novo_lead',
      expectations: message, // Primeira mensagem como expectativa
      timeline: [{
        timestamp: new Date().toISOString(),
        action: 'lead_criado_whatsapp',
        user_id: 'system',
        details: `Mensagem recebida: "${message}"`
      }]
    };

    const newCandidate = await base44.asServiceRole.entities.Candidate.create(candidateData);

    // Enviar mensagem automática (opcional)
    // Você pode integrar com Evolution API para responder
    /*
    try {
      await fetch('https://sua-evolution-api.com/message/sendText', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instance: instance,
          number: phone,
          text: `Olá ${pushName}! 😊\n\nRecebemos sua mensagem sobre oportunidades de trabalho.\n\nEm breve nossa equipe de RH entrará em contato!`
        })
      });
    } catch (sendError) {
      console.error('Erro ao enviar resposta automática:', sendError);
    }
    */

    // Notificar RH
    try {
      const rhUsers = await base44.asServiceRole.entities.Employee.filter({ 
        workshop_id: workshop.id,
        job_role: 'rh'
      });

      if (rhUsers.length > 0) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: rhUsers[0].user_id,
          type: 'nova_subtarefa',
          title: '💬 Novo Lead pelo WhatsApp!',
          message: `${pushName} enviou: "${message.substring(0, 50)}..."`,
          is_read: false
        });
      }
    } catch (notifError) {
    }

    return Response.json({ 
      success: true, 
      candidate_id: newCandidate.id 
    });

  } catch (error) {
    return Response.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
});
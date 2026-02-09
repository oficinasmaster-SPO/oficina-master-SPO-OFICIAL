import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Webhook para Evolution API (WhatsApp não-oficial)
 * Recebe mensagens do WhatsApp e cria leads automaticamente
 * 
 * IMPORTANTE termos do WhatsApp - use por sua conta e risco
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    if (req.method !== 'POST') {
      return Response.json({ error: 'Método não suportado' }, { status: 405 });
    }

    const body = await req.json();
    console.log('📱 Mensagem WhatsApp recebida:', JSON.stringify(body));

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
      console.log('⏭️ Mensagem não é de interesse (sem palavras-chave)');
      return Response.json({ message: 'Não é lead' }, { status: 200 });
    }

    // Identificar workshop pela instância
    const workshops = await base44.asServiceRole.entities.Workshop.list();
    const workshop = workshops.find(w => w.whatsapp_instance === instance) || workshops[0];

    if (!workshop) {
      console.error('❌ Workshop não encontrado');
      return Response.json({ error: 'Workshop não encontrado' }, { status: 404 });
    }

    // Verificar se já existe candidato com esse telefone
    const existingCandidates = await base44.asServiceRole.entities.Candidate.filter({
      workshop_id.id,
      phone
    });

    if (existingCandidates.length > 0) {
      console.log('⚠️ Candidato já existe com esse telefone');
      
      // Atualizar timeline
      const candidate = existingCandidates[0];
      const updatedTimeline = [
        ...(candidate.timeline || []),
        {
          timestamp Date().toISOString(),
          action: 'nova_mensagem_whatsapp',
          user_id: 'system',
          details
        }
      ];

      await base44.asServiceRole.entities.Candidate.update(candidate.id, {
        timeline
      });

      return Response.json({ 
        message: 'Candidato já existe, timeline atualizada',
        candidate_id.id
      });
    }

    // Criar novo candidato
    const candidateData = {
      workshop_id.id,
      full_name,
      phone,
      desired_position: 'A definir',
      origin_channel: 'cadastro_manual',
      campaign_name: 'WhatsApp Orgânico',
      status: 'novo_lead',
      expectations, // Primeira mensagem como expectativa
      timeline: [{
        timestamp Date().toISOString(),
        action: 'lead_criado_whatsapp',
        user_id: 'system',
        details: `Mensagem recebida: "${message}"`
      }]
    };

    const newCandidate = await base44.asServiceRole.entities.Candidate.create(candidateData);

    console.log('✅ Candidato criado via WhatsApp:', newCandidate.id);

    // Enviar mensagem automática (opcional)
    // Você pode integrar com Evolution API para responder
    /*
    try {
      await fetch('https://sua-evolution-api.com/message/sendText', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body.stringify({
          instance,
          number,
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
        workshop_id.id,
        job_role: 'rh'
      });

      if (rhUsers.length > 0) {
        await base44.asServiceRole.entities.Notification.create({
          user_id[0].user_id,
          type: 'nova_subtarefa',
          title: '💬 Novo Lead pelo WhatsApp!',
          message: `${pushName} enviou: "${message.substring(0, 50)}..."`,
          is_read
        });
      }
    } catch (notifError) {
      console.error('Erro ao notificar RH:', notifError);
    }

    return Response.json({ 
      success, 
      candidate_id.id 
    });

  } catch (error) {
    console.error('❌ Erro no webhook Evolution:', error);
    return Response.json({ 
      error.message,
      stack.stack 
    }, { status: 500 });
  }
});

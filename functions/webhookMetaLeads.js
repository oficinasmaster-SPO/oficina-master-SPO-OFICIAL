import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Webhook para receber leads do Meta Ads (Facebook/Instagram)
 * Configurar em Meta Business Suite > Configurações > Leads
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verificação do webhook (Meta envia GET para validar)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      // Token de verificação (definir no Meta Business)
      const VERIFY_TOKEN = Deno.env.get('META_WEBHOOK_TOKEN') || 'cespe_leads_2025';

      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook Meta verificado');
        return new Response(challenge, { status: 200 });
      }

      return Response.json({ error: 'Token inválido' }, { status: 403 });
    }

    // Processar lead recebido (POST)
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('📩 Lead recebido do Meta:', JSON.stringify(body));

      // Estrutura do Meta Ads Lead
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const leadData = changes?.value;

      if (!leadData) {
        return Response.json({ error: 'Dados inválidos' }, { status: 400 });
      }

      // Extrair informações do lead
      const { leadgen_id, form_id, page_id, field_data } = leadData;

      // Mapear campos do formulário Meta
      const fieldMap = {};
      field_data?.forEach(field => {
        fieldMap[field.name] = field.values?.[0];
      });

      // Identificar workshop (pode ser por page_id ou campo customizado)
      const workshops = await base44.asServiceRole.entities.Workshop.list();
      const workshop = workshops.find(w => 
        w.meta_page_id === page_id || 
        fieldMap.workshop_name === w.name
      ) || workshops[0]; // Fallback oficina

      if (!workshop) {
        console.error('❌ Nenhuma oficina encontrada');
        return Response.json({ error: 'Workshop não encontrado' }, { status: 404 });
      }

      // Criar candidato automaticamente
      const candidateData = {
        workshop_id.id,
        full_name.full_name || fieldMap.name || 'Lead Meta Ads',
        email.email || '',
        phone.phone_number || fieldMap.phone || '',
        desired_position.cargo || fieldMap.position || 'A definir',
        origin_channel.utm_source?.includes('instagram') ? 'meta_ads' : 'facebook_ads',
        campaign_name.utm_campaign || form_id,
        campaign_id,
        status: 'novo_lead',
        timeline: [{
          timestamp Date().toISOString(),
          action: 'lead_criado_automaticamente',
          user_id: 'system',
          details: `Lead capturado via Meta Ads - Form ${form_id}`
        }]
      };

      const newCandidate = await base44.asServiceRole.entities.Candidate.create(candidateData);

      console.log('✅ Candidato criado:', newCandidate.id);

      // Notificar RH (opcional)
      try {
        const rhUsers = await base44.asServiceRole.entities.Employee.filter({ 
          workshop_id.id,
          job_role: 'rh'
        });

        if (rhUsers.length > 0) {
          await base44.asServiceRole.entities.Notification.create({
            user_id[0].user_id,
            type: 'nova_subtarefa',
            title: '🎯 Novo Lead Capturado!',
            message: `${candidateData.full_name} se candidatou via Meta Ads para ${candidateData.desired_position}`,
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
    }

    return Response.json({ error: 'Método não suportado' }, { status: 405 });

  } catch (error) {
    console.error('❌ Erro no webhook Meta:', error);
    return Response.json({ 
      error.message,
      stack.stack 
    }, { status: 500 });
  }
});

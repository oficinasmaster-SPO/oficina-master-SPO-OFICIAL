import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const apiUrl = Deno.env.get("ACTIVECAMPAIGN_API_URL");
    const apiKey = Deno.env.get("ACTIVECAMPAIGN_API_KEY");

    if (!apiUrl || !apiKey) {
      return Response.json({
        success: false,
        error: "Credenciais do ActiveCampaign não configuradas"
      });
    }

    const results = {
      tag_created: false,
      list_created: false,
      campaign_created: false,
      list_id: null,
      tag_id: null
    };

    // 1. Criar Tag "academia_acesso"
    try {
      const tagResponse = await fetch(`${apiUrl}/api/3/tags`, {
        method: 'POST',
        headers: {
          'Api-Token': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tag: {
            tag: 'academia_acesso',
            tagType: 'contact',
            description: 'Clientes com acesso à Academia de Treinamento'
          }
        })
      });

      const tagData = await tagResponse.json();
      results.tag_id = tagData.tag?.id;
      results.tag_created = !!tagData.tag?.id;
    } catch (error) {
      console.log("Tag pode já existir:", error.message);
    }

    // 2. Criar Lista "Academia de Treinamento"
    try {
      const listResponse = await fetch(`${apiUrl}/api/3/lists`, {
        method: 'POST',
        headers: {
          'Api-Token': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          list: {
            name: 'Academia de Treinamento - Oficinas Master',
            stringid: 'academia-oficinas-master',
            sender_url: 'https://oficinasmaster.com',
            sender_reminder: 'Você está recebendo este email porque tem acesso à Academia de Treinamento'
          }
        })
      });

      const listData = await listResponse.json();
      results.list_id = listData.list?.id;
      results.list_created = !!listData.list?.id;
    } catch (error) {
      console.log("Lista pode já existir:", error.message);
    }

    // 3. Criar Campanha de Boas-Vindas
    if (results.list_id) {
      try {
        const campaignResponse = await fetch(`${apiUrl}/api/3/campaigns`, {
          method: 'POST',
          headers: {
            'Api-Token': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            campaign: {
              type: 'single',
              name: 'Boas-vindas Academia - Oficinas Master',
              sdate: new Date().toISOString(),
              status: 0, // Rascunho
              public: 0,
              tracklinks: 'all',
              trackreads: 1,
              htmlconstructor: 'editor',
              lists: [results.list_id]
            }
          })
        });

        const campaignData = await campaignResponse.json();
        results.campaign_created = !!campaignData.campaign?.id;

        // Criar mensagem da campanha
        if (campaignData.campaign?.id) {
          await fetch(`${apiUrl}/api/3/messages`, {
            method: 'POST',
            headers: {
              'Api-Token': apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: {
                campaign: campaignData.campaign.id,
                subject: '🎓 Bem-vindo à Academia de Treinamento!',
                fromemail: user.email,
                fromname: 'Oficinas Master',
                htmlcontent: `
                  <h1 style="color: #2563eb;">Bem-vindo à Academia de Treinamento!</h1>
                  <p>Olá, <strong>%FIRSTNAME%</strong>!</p>
                  <p>Você agora tem acesso à nossa Academia de Treinamento exclusiva.</p>
                  <h2>O que você vai encontrar:</h2>
                  <ul>
                    <li>✅ Cursos de Vendas & Negociação</li>
                    <li>✅ Treinamento Técnico Avançado</li>
                    <li>✅ Gestão & Liderança</li>
                    <li>✅ Marketing & Comercial</li>
                  </ul>
                  <p style="margin-top: 20px;">
                    <a href="${Deno.env.get('BASE44_APP_URL') || 'https://app.oficinasmaster.com'}/AcademiaTreinamento" 
                       style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Acessar Academia Agora
                    </a>
                  </p>
                  <p style="margin-top: 30px; color: #666;">
                    Bons estudos!<br>
                    Equipe Oficinas Master
                  </p>
                `
              }
            })
          });
        }
      } catch (error) {
        console.error("Erro ao criar campanha:", error);
      }
    }

    return Response.json({
      success: true,
      results: results,
      message: "Configuração do ActiveCampaign concluída. Verifique os rascunhos na plataforma."
    });

  } catch (error) {
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
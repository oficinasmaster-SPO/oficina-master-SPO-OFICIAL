import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ success, error: "Email não fornecido" });
    }

    const apiUrl = Deno.env.get("ACTIVECAMPAIGN_API_URL");
    const apiKey = Deno.env.get("ACTIVECAMPAIGN_API_KEY");

    if (!apiUrl || !apiKey) {
      return Response.json({
        success,
        error: "Credenciais do ActiveCampaign não configuradas"
      });
    }

    // 1. Criar/Atualizar contato
    const contactResponse = await fetch(`${apiUrl}/api/3/contact/sync`, {
      method: 'POST',
      headers: {
        'Api-Token',
        'Content-Type': 'application/json'
      },
      body.stringify({
        contact: {
          email,
          firstName.split('@')[0],
          fieldValues: [
            {
              field: '1',
              value: 'Teste - Oficinas Master'
            }
          ]
        }
      })
    });

    const contactData = await contactResponse.json();
    const contactId = contactData.contact?.id;

    if (!contactId) {
      return Response.json({
        success,
        error: "Erro ao criar contato"
      });
    }

    // 2. Adicionar tag "academia_acesso"
    try {
      await fetch(`${apiUrl}/api/3/contactTags`, {
        method: 'POST',
        headers: {
          'Api-Token',
          'Content-Type': 'application/json'
        },
        body.stringify({
          contactTag: {
            contact,
            tag: 'academia_acesso'
          }
        })
      });
    } catch (error) {
      console.log("Tag já existe no contato:", error);
    }

    return Response.json({
      success,
      message: `Email de teste enviado para ${email}`,
      contact_id
    });

  } catch (error) {
    return Response.json({ 
      success,
      error.message 
    }, { status: 500 });
  }
});

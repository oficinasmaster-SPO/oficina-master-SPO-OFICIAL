import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admin' }, { status: 403 });
    }

    const body = await req.json();
    const { email, name, workshop_id } = body;

    console.log("🧪 Testando fluxo de convite para:", email);

    const AC_API_KEY = Deno.env.get("ACTIVECAMPAIGN_API_KEY");
    const AC_API_URL = Deno.env.get("ACTIVECAMPAIGN_API_URL");

    if (!AC_API_KEY || !AC_API_URL) {
      return Response.json({ 
        error: 'ActiveCampaign não configurado',
        credentials: { AC_API_KEY: !!AC_API_KEY, AC_API_URL: !!AC_API_URL }
      }, { status: 400 });
    }

    // Buscar workshop
    const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);

    // 1. Criar contato
    const contactData = {
      contact: {
        email,
        firstName.split(' ')[0],
        lastName.split(' ').slice(1).join(' ') || '',
        fieldValues: [
          {
            field: '1',
            value.name
          }
        ]
      }
    };

    const contactResponse = await fetch(`${AC_API_URL}/api/3/contact/sync`, {
      method: 'POST',
      headers: {
        'Api-Token',
        'Content-Type': 'application/json'
      },
      body.stringify(contactData)
    });

    if (!contactResponse.ok) {
      const errorText = await contactResponse.text();
      return Response.json({ 
        error: 'Erro ao criar contato',
        details,
        status.status
      }, { status: 500 });
    }

    const contactResult = await contactResponse.json();
    console.log("✅ Contato criado:", contactResult.contact.id);

    // 2. Adicionar tag
    const tagData = {
      contactTag: {
        contact.contact.id,
        tag: 'convite-colaborador'
      }
    };

    const tagResponse = await fetch(`${AC_API_URL}/api/3/contactTags`, {
      method: 'POST',
      headers: {
        'Api-Token',
        'Content-Type': 'application/json'
      },
      body.stringify(tagData)
    });

    const tagResult = tagResponse.ok ? await tagResponse.json() ;

    // 3. Adicionar nota
    const inviteLink = `${new URL(req.url).origin}/PrimeiroAcesso?token=TESTE123`;
    const noteData = {
      note: {
        note: `🔑 TESTE - DADOS DO CONVITE\n\nLink: ${inviteLink}\nSenha Temporária@2025\nOficina: ${workshop.name}\nEmail: ${email}\nNome: ${name}`,
        relid.contact.id,
        reltype: 'Subscriber'
      }
    };

    const noteResponse = await fetch(`${AC_API_URL}/api/3/notes`, {
      method: 'POST',
      headers: {
        'Api-Token',
        'Content-Type': 'application/json'
      },
      body.stringify(noteData)
    });

    return Response.json({
      success,
      message: 'Teste concluído! Verifique no ActiveCampaign se:',
      steps: [
        '1. O contato foi criado',
        '2. A tag "convite-colaborador" foi adicionada',
        '3. A nota com o link foi salva',
        '4. A automação foi disparada (verifique em Automations > Automation Reports)'
      ],
      contact_id.contact.id,
      tag_added.ok,
      note_added.ok,
      next_steps: [
        'Vá para ActiveCampaign > Automations',
        'Procure pela automação com trigger "convite-colaborador"',
        'Verifique se ela está ATIVA',
        'Confira o Report para ver se foi executada'
      ]
    });

  } catch (error) {
    console.error("❌ Erro no teste:", error);
    return Response.json({ 
      error.message,
      stack.stack
    }, { status: 500 });
  }
});

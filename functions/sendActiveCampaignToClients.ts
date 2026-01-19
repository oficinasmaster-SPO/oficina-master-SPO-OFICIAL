import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    // Buscar todos os usuários ativos
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    // Buscar progresso dos cursos para identificar quem tem acesso
    const allProgress = await base44.asServiceRole.entities.CourseProgress.list();
    
    // Identificar usuários com acesso (que já iniciaram algum curso)
    const usersWithAccess = allUsers.filter(u => 
      allProgress.some(p => p.user_id === u.id)
    );

    let sentCount = 0;
    const errors = [];

    for (const client of usersWithAccess) {
      try {
        // Verificar se contato já existe no ActiveCampaign
        const searchResponse = await fetch(
          `${apiUrl}/api/3/contacts?email=${encodeURIComponent(client.email)}`,
          {
            headers: {
              'Api-Token': apiKey,
              'Content-Type': 'application/json'
            }
          }
        );

        const searchData = await searchResponse.json();
        let contactId = null;

        if (searchData.contacts && searchData.contacts.length > 0) {
          // Contato já existe
          contactId = searchData.contacts[0].id;
        } else {
          // Criar novo contato
          const createResponse = await fetch(`${apiUrl}/api/3/contacts`, {
            method: 'POST',
            headers: {
              'Api-Token': apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contact: {
                email: client.email,
                firstName: client.full_name?.split(' ')[0] || '',
                lastName: client.full_name?.split(' ').slice(1).join(' ') || ''
              }
            })
          });

          const createData = await createResponse.json();
          contactId = createData.contact?.id;
        }

        if (contactId) {
          // Adicionar tag "academia_acesso"
          await fetch(`${apiUrl}/api/3/contactTags`, {
            method: 'POST',
            headers: {
              'Api-Token': apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contactTag: {
                contact: contactId,
                tag: 'academia_acesso'
              }
            })
          });

          sentCount++;
        }

      } catch (error) {
        console.error(`Erro ao processar ${client.email}:`, error);
        errors.push({ email: client.email, error: error.message });
      }
    }

    return Response.json({
      success: true,
      sent_count: sentCount,
      total_clients: usersWithAccess.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
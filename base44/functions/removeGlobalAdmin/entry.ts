import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // IDs dos usuários que perderão o admin global (mantendo acesso como admin de suas oficinas)
    const usersToRemoveAdmin = [
      '6a1d93ba34d2a1ddf4b0554f', // rasselanclaudio@gmail.com
      '6a1a0adf5921e972144cf742', // rh@francosautocenter.com.br
      '69cd7ba394a362513647ddc7', // aoficinamsg@gmail.com (Priscila Zacarias)
      '69cd60b762bf218c34b6d023', // renovacao.automotivo@gmail.com
      '69cd1712ab7232e7795b8ec7', // alemaomotoseresgate@gmail.com
      '69cacf41f17def79a168dc41', // admcarbanleandrocosta@gmail.com
      '69ca6a257232d630eea0ab1a', // oficinaconexao.cta@gmail.com
      '69c2d6e32736187c525de5f1', // feer.rodsil@gmail.com
      '69bd7165c4db882dd251f590', // conorb@base44.com (Conor Boyle - Platform)
      // +1 usuário com dados truncados - precisaríamos do ID completo
    ];

    const results = [];
    const errors = [];

    for (const userId of usersToRemoveAdmin) {
      try {
        // Atualizar role de "admin" para "user"
        await base44.asServiceRole.entities.User.update(userId, {
          role: 'user',
          data: {
            role: 'user'
          }
        });

        results.push({
          userId,
          status: 'success',
          message: 'Admin global removido com sucesso'
        });
      } catch (error) {
        errors.push({
          userId,
          status: 'error',
          message: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: `Processo concluído: ${results.length} usuários atualizados, ${errors.length} erros`,
      results,
      errors
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
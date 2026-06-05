import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // IDs confirmados via consulta direta — admins de oficina que devem ser rebaixados para "user"
    const usersToRemoveAdmin = [
      '69bc114601e0c4f5c72f1d78', // adm@autoeletricamateuzzo.com.br
      '69b32a18b35052f707a0652f', // gilcar.autocenter@gmail.com
      '69a5c33f37458da0bdd58be5', // peralta.jur@gmail.com
      '69a1f813c9263408caad87c7', // eulerdurigueto123@gmail.com
      '69a1ec0ac8437822124df48b', // chiquinhodabateria@hotmail.com
      '69a19b8ddd6e6650b356ba37', // gtcentroautomotivocfs@gmail.com
      '69a09b1562dadb12ad50e9ee', // luna301280@gmail.com
      '699f027bd007d61ca23974e1', // andrefrancodiretor@gmail.com
      '699c987a93c6d5d16d2cfc54', // rafaelaspl@hotmail.com
    ];

    const results = [];
    const errors = [];

    for (const userId of usersToRemoveAdmin) {
      try {
        await base44.asServiceRole.entities.User.update(userId, { role: 'user' });
        results.push({ userId, status: 'success', message: 'Admin global removido com sucesso' });
      } catch (error) {
        errors.push({ userId, status: 'error', message: error.message });
      }
    }

    return Response.json({
      success: true,
      message: `Processo concluído: ${results.length} atualizados, ${errors.length} erros`,
      results,
      errors
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
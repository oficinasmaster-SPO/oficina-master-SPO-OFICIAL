import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Lista de employees órfãos para reparar
    const targets = [
      { label: 'Fernando', email: 'fhferreiralima@gmail.com',     employee_id: '69b0560521b754dde545675b', workshop_id: '69a1ec60' },
      { label: 'Iago',     email: 'administracao@p1pneus.com.br', employee_id: '69ab049d77e0401717299da2', workshop_id: '69ab0437' },
      { label: 'Clecio',   email: 'cleciocristiane0@gmail.com',   employee_id: '69a1b376a66f7f7813d6b527', workshop_id: '697b9828' },
      { label: 'Yago',     email: 'oficinadoyago39@gmail.com',    employee_id: '69a1ad791b2c27519123d8a2', workshop_id: '697b9828' },
    ];

    const results = [];

    for (const { label, email, employee_id, workshop_id } of targets) {
      try {
        // 1. Convidar usuário — cria novo User e envia email de acesso
        const inviteResult = await base44.auth.inviteUser(email, 'user');
        const newUserId = inviteResult?.id;

        if (!newUserId) {
          results.push({ label, email, success: false, error: 'inviteUser retornou sem id', raw: JSON.stringify(inviteResult) });
          continue;
        }

        // 2. Atualizar o Employee existente com o novo user_id (sem criar Employee novo)
        await base44.asServiceRole.entities.Employee.update(employee_id, {
          user_id: newUserId,
          user_status: 'pending'
        });

        // 3. Atualizar o User com workshop_id e outros dados essenciais
        const emp = await base44.asServiceRole.entities.Employee.get(employee_id);
        if (emp) {
          await base44.asServiceRole.entities.User.update(newUserId, {
            workshop_id: workshop_id,
            profile_id: emp.profile_id || null,
            position: emp.position || null,
            job_role: emp.job_role || null,
            user_status: 'pending'
          });
        }

        results.push({ label, email, success: true, new_user_id: newUserId, employee_id });
      } catch (e) {
        results.push({ label, email, success: false, error: e.message });
      }
    }

    return Response.json({ success: true, results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
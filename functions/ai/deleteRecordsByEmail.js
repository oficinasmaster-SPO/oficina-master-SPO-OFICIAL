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
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log(`🗑️ Deletando TODOS os registros de: ${email}`);

    const results = {
      employee: 0,
      employee_invite: 0,
      employee_invite_acceptance: 0
    };

    // 1. Deletar Employee
    try {
      const employees = await base44.asServiceRole.entities.Employee.filter({ email });
      for (const emp of employees) {
        await base44.asServiceRole.entities.Employee.delete(emp.id);
        results.employee++;
      }
      console.log(`✅ ${results.employee} Employee deletados`);
    } catch (e) {
      console.error('Erro ao deletar Employee:', e);
    }

    // 2. Deletar EmployeeInvite
    try {
      const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({ email });
      for (const inv of invites) {
        await base44.asServiceRole.entities.EmployeeInvite.delete(inv.id);
        results.employee_invite++;
      }
      console.log(`✅ ${results.employee_invite} EmployeeInvite deletados`);
    } catch (e) {
      console.error('Erro ao deletar EmployeeInvite:', e);
    }

    // 3. Deletar EmployeeInviteAcceptance
    try {
      const acceptances = await base44.asServiceRole.entities.EmployeeInviteAcceptance.filter({ email });
      for (const acc of acceptances) {
        await base44.asServiceRole.entities.EmployeeInviteAcceptance.delete(acc.id);
        results.employee_invite_acceptance++;
      }
      console.log(`✅ ${results.employee_invite_acceptance} EmployeeInviteAcceptance deletados`);
    } catch (e) {
      console.error('Erro ao deletar EmployeeInviteAcceptance:', e);
    }

    const totalDeleted = results.employee + results.employee_invite + results.employee_invite_acceptance;

    return Response.json({ 
      success, 
      total_deleted,
      details,
      message: `${totalDeleted} registros deletados para ${email}`
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error.message }, { status: 500 });
  }
});

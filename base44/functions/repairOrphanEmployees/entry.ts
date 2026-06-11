import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * repairOrphanEmployees — Repara Employees sem user_id via re-invite
 *
 * Aceita lista dinâmica de targets via body, ou usa lista hardcoded como fallback.
 *
 * Body:
 * {
 *   targets: [
 *     { label, email, employee_id, workshop_id }
 *   ]
 * }
 *
 * Para gerar a lista de targets, usar auditOrphanEmployees primeiro
 * e filtrar grupos B (expirado) ou C (sem convite).
 */

// Lista de casos conhecidos (fallback hardcoded)
const HARDCODED_TARGETS = [
  { label: 'Fernando', email: 'fhferreiralima@gmail.com',     employee_id: '69b0560521b754dde545675b', workshop_id: '69a1ec60' },
  { label: 'Iago',     email: 'administracao@p1pneus.com.br', employee_id: '69ab049d77e0401717299da2', workshop_id: '69ab0437' },
  { label: 'Clecio',   email: 'cleciocristiane0@gmail.com',   employee_id: '69a1b376a66f7f7813d6b527', workshop_id: '697b9828' },
  { label: 'Yago',     email: 'oficinadoyago39@gmail.com',    employee_id: '69a1ad791b2c27519123d8a2', workshop_id: '697b9828' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const isInternalCall = req.headers.get('x-internal-call') === 'true';
    if (!isInternalCall && (!user || user.role !== 'admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const targets = (body.targets && Array.isArray(body.targets) && body.targets.length > 0)
      ? body.targets
      : HARDCODED_TARGETS;

    console.log(`🔧 repairOrphanEmployees — ${targets.length} targets`);

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

        // 2. Atualizar o Employee existente com o novo user_id
        await base44.asServiceRole.entities.Employee.update(employee_id, {
          user_id: newUserId,
          user_status: 'pending'
        });

        // 3. Atualizar o User com workshop_id e outros dados essenciais do Employee
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
        console.log(`✅ Reparado: ${email} → user_id=${newUserId}`);
      } catch (e) {
        results.push({ label, email, success: false, error: e.message });
        console.error(`❌ Erro ao reparar ${email}:`, e.message);
      }
    }

    return Response.json({
      success: true,
      total: targets.length,
      repaired: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
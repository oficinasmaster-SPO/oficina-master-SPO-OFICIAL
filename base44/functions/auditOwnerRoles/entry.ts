import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    
    if (!caller || caller.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { fix } = await req.json();

    // Buscar todos os employees com job_role socio ou is_partner true
    const socios = await base44.asServiceRole.entities.Employee.filter({ job_role: 'socio' });
    const partners = await base44.asServiceRole.entities.Employee.filter({ is_partner: true });
    
    // Combinar e deduplicar
    const allMap = new Map();
    for (const emp of [...socios, ...partners]) {
      if (emp.user_id) allMap.set(emp.user_id, emp);
    }

    // Buscar owners de workshops
    const workshops = await base44.asServiceRole.entities.Workshop.list('-created_date', 200);
    const ownerIds = new Set();
    for (const ws of workshops) {
      if (ws.owner_id) ownerIds.add(ws.owner_id);
      if (ws.partner_ids) {
        for (const pid of ws.partner_ids) ownerIds.add(pid);
      }
    }

    // Combinar todos os user_ids que deveriam ser admin
    const shouldBeAdmin = new Set([...allMap.keys(), ...ownerIds]);

    // Verificar role de cada user
    const problems = [];
    const alreadyOk = [];
    const fixedUsers = [];

    for (const userId of shouldBeAdmin) {
      try {
        const user = await base44.asServiceRole.entities.User.get(userId);
        if (!user) continue;
        
        const emp = allMap.get(userId);
        const isOwner = ownerIds.has(userId);
        
        if (user.role !== 'admin') {
          const info = {
            userId: user.id,
            email: user.email,
            fullName: user.full_name,
            currentRole: user.role,
            reason: [],
          };
          if (emp) info.reason.push(`Employee socio/partner (${emp.full_name})`);
          if (isOwner) info.reason.push('Workshop owner/partner');
          
          problems.push(info);

          // Fix if requested
          if (fix) {
            await base44.asServiceRole.entities.User.update(userId, { role: 'admin' });
            info.fixed = true;
            fixedUsers.push(info);
          }
        } else {
          alreadyOk.push({
            userId: user.id,
            email: user.email,
            fullName: user.full_name,
          });
        }
      } catch (e) {
        // User might not exist
        console.warn(`User ${userId} not found:`, e.message);
      }
    }

    return Response.json({
      summary: {
        totalSociosOwners: shouldBeAdmin.size,
        alreadyAdmin: alreadyOk.length,
        needsFix: problems.length,
        fixed: fixedUsers.length,
      },
      problems,
      alreadyOk,
      fixedUsers,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    
    if (!caller || caller.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const fixes = [];

    // 1. Fix: User sem workshop_id — buscar workshops onde é owner e preencher
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 200);
    
    for (const user of allUsers) {
      const userWsId = user.workshop_id || user.data?.workshop_id;
      
      if (!userWsId && user.role === 'admin') {
        // Buscar workshop onde é owner
        const owned = await base44.asServiceRole.entities.Workshop.filter({ owner_id: user.id });
        if (owned.length > 0) {
          await base44.asServiceRole.entities.User.update(user.id, { workshop_id: owned[0].id });
          fixes.push({
            type: 'USER_WORKSHOP_FIXED',
            userId: user.id,
            email: user.email,
            workshopId: owned[0].id,
            workshopName: owned[0].name,
          });
        } else {
          // Talvez é partner
          const partnered = await base44.asServiceRole.entities.Workshop.filter({ partner_ids: user.id });
          if (partnered.length > 0) {
            await base44.asServiceRole.entities.User.update(user.id, { workshop_id: partnered[0].id });
            fixes.push({
              type: 'USER_WORKSHOP_FIXED_PARTNER',
              userId: user.id,
              email: user.email,
              workshopId: partnered[0].id,
              workshopName: partnered[0].name,
            });
          }
        }
      }
    }

    // 2. Fix: Owner sem Employee record — criar Employee
    const workshops = await base44.asServiceRole.entities.Workshop.list('-created_date', 200);
    
    for (const ws of workshops) {
      if (!ws.owner_id) continue;
      
      // Verificar se owner existe
      let owner = null;
      try {
        owner = await base44.asServiceRole.entities.User.get(ws.owner_id);
      } catch (e) {
        continue; // User deletado, nada a fazer
      }
      
      // Verificar se tem Employee
      const emps = await base44.asServiceRole.entities.Employee.filter({ 
        user_id: ws.owner_id, 
        workshop_id: ws.id 
      });
      
      if (emps.length === 0) {
        // Tentar por email
        const empsByEmail = await base44.asServiceRole.entities.Employee.filter({
          email: owner.email,
          workshop_id: ws.id
        });
        
        if (empsByEmail.length > 0) {
          // Vincular user_id ao employee existente
          await base44.asServiceRole.entities.Employee.update(empsByEmail[0].id, {
            user_id: ws.owner_id
          });
          fixes.push({
            type: 'EMPLOYEE_LINKED',
            userId: ws.owner_id,
            email: owner.email,
            employeeId: empsByEmail[0].id,
            workshopName: ws.name,
          });
        } else {
          // Criar Employee
          const newEmp = await base44.asServiceRole.entities.Employee.create({
            full_name: owner.full_name || owner.email,
            email: owner.email,
            user_id: ws.owner_id,
            workshop_id: ws.id,
            owner_id: ws.owner_id,
            position: 'Proprietário',
            job_role: 'socio',
            is_partner: true,
            status: 'ativo',
            user_status: 'ativo',
          });
          fixes.push({
            type: 'EMPLOYEE_CREATED',
            userId: ws.owner_id,
            email: owner.email,
            employeeId: newEmp.id,
            workshopName: ws.name,
          });
        }
      }
    }

    return Response.json({
      totalFixes: fixes.length,
      fixes,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
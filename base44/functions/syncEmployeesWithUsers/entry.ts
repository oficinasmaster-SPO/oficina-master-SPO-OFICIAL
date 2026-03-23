import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Autenticar admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { target_email } = await req.json();

    if (!target_email) {
      return Response.json({ error: 'Email obrigatório' }, { status: 400 });
    }

    console.log("🔍 Buscando usuário:", target_email);

    // Buscar usuário pelo email
    const users = await base44.asServiceRole.entities.User.filter({ email: target_email });
    
    if (!users || users.length === 0) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const targetUser = users[0];
    console.log("✅ Usuário encontrado:", targetUser.id);

    // Buscar workshop do usuário
    let workshop = null;
    if (targetUser.workshop_id) {
      workshop = await base44.asServiceRole.entities.Workshop.get(targetUser.workshop_id);
    } else {
      const ownedWorkshops = await base44.asServiceRole.entities.Workshop.filter({ 
        owner_id: targetUser.id 
      });
      if (ownedWorkshops && ownedWorkshops.length > 0) {
        workshop = ownedWorkshops[0];
      }
    }

    if (!workshop) {
      return Response.json({ error: 'Workshop não encontrado' }, { status: 404 });
    }

    console.log("🏢 Workshop encontrado:", workshop.name);

    // Buscar todos os colaboradores da oficina
    const allEmployees = await base44.asServiceRole.entities.Employee.filter({ 
      workshop_id: workshop.id 
    });

    console.log(`📋 Total de colaboradores: ${allEmployees.length}`);

    const results = {
      total: allEmployees.length,
      linked: 0,
      unlinked: 0,
      errors: [],
      details: []
    };

    for (const employee of allEmployees) {
      const detail = {
        name: employee.name,
        email: employee.email,
        has_user_id: !!employee.user_id,
        action: 'none'
      };

      // Se já tem user_id, pular
      if (employee.user_id) {
        results.linked++;
        detail.action = 'already_linked';
        results.details.push(detail);
        continue;
      }

      // Buscar User pelo email
      try {
        const employeeUsers = await base44.asServiceRole.entities.User.filter({ 
          email: employee.email 
        });

        if (employeeUsers && employeeUsers.length > 0) {
          const employeeUser = employeeUsers[0];
          
          // Vincular Employee ao User
          await base44.asServiceRole.entities.Employee.update(employee.id, {
            user_id: employeeUser.id
          });

          // Atualizar User com workshop_id se necessário
          if (!employeeUser.workshop_id) {
            await base44.asServiceRole.entities.User.update(employeeUser.id, {
              workshop_id: workshop.id
            });
          }

          results.linked++;
          detail.action = 'linked';
          detail.user_id = employeeUser.id;
          console.log(`✅ Vinculado: ${employee.name} -> ${employeeUser.id}`);
        } else {
          results.unlinked++;
          detail.action = 'no_user_found';
          console.log(`⚠️ Sem User: ${employee.name}`);
        }
      } catch (error) {
        results.errors.push({
          employee: employee.name,
          error: error.message
        });
        detail.action = 'error';
        detail.error = error.message;
        console.error(`❌ Erro ao vincular ${employee.name}:`, error);
      }

      results.details.push(detail);
    }

    return Response.json({
      success: true,
      workshop: {
        id: workshop.id,
        name: workshop.name
      },
      results
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});
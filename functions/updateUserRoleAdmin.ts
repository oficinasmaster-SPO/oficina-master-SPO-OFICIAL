import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const userId = "698b3434bf896f59ccaaac94";
    const userEmail = "andrehenri9@gmail.com";

    console.log(`🔄 Gerenciando acesso administrativo para: ${userEmail}`);

    // 1. Buscar User para pegar workshop_id
    const user = await base44.asServiceRole.entities.User.get(userId);
    if (!user) return Response.json({ error: "Usuário base não encontrado" }, { status: 404 });

    // 2. Buscar ou Criar Employee
    let employees = await base44.asServiceRole.entities.Employee.filter({ email: userEmail });
    let employee;

    if (!employees || employees.length === 0) {
        console.log("⚠️ Employee não encontrado. Criando...");
        
        // Tentar pegar workshop_id de algum lugar se o user não tiver
        let workshopId = user.workshop_id;
        if (!workshopId) {
             const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({ email: userEmail });
             workshopId = invites?.[0]?.workshop_id;
        }
        
        if (!workshopId) return Response.json({ error: "Workshop ID não encontrado para criar employee" }, { status: 400 });

        employee = await base44.asServiceRole.entities.Employee.create({
            workshop_id: workshopId,
            user_id: userId,
            full_name: user.full_name || "André Henri",
            email: userEmail,
            position: "Administrativo",
            area: "administrativo",
            job_role: "administrativo",
            status: "ativo",
            user_status: "ativo",
            is_internal: true
        });
    } else {
        employee = employees[0];
        console.log("✅ Employee encontrado:", employee.id);
        
        // Atualizar
        await base44.asServiceRole.entities.Employee.update(employee.id, {
            job_role: "administrativo",
            area: "administrativo",
            position: "Administrativo",
            user_status: "ativo"
        });
    }

    return Response.json({
        success: true,
        message: "Função atualizada para Administrativo",
        employee
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
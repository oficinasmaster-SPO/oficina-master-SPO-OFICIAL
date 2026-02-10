import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const userId = "698b3434bf896f59ccaaac94"; // ID do usuário andrehenri9@gmail.com

    console.log(`🔄 Atualizando função para administrativo: UserID ${userId}`);

    // 1. Buscar Employee pelo user_id
    const employees = await base44.asServiceRole.entities.Employee.filter({ user_id: userId });
    
    if (!employees || employees.length === 0) {
        // Tentar buscar por email como fallback
        const byEmail = await base44.asServiceRole.entities.Employee.filter({ email: "andrehenri9@gmail.com" });
        if (!byEmail || byEmail.length === 0) {
             return Response.json({ error: "Colaborador não encontrado por ID nem email" }, { status: 404 });
        }
        console.log("✅ Colaborador encontrado por EMAIL:", byEmail[0].id);
        var employee = byEmail[0];
    } else {
        var employee = employees[0];
        console.log("✅ Colaborador encontrado por UserID:", employee.id);
    }

    // 2. Atualizar dados para Administrativo
    const updateData = {
      job_role: "administrativo",
      area: "administrativo",
      position: "Administrativo", 
      user_status: "ativo"
    };

    await base44.asServiceRole.entities.Employee.update(employee.id, updateData);
    console.log("✅ Dados atualizados:", updateData);

    return Response.json({
        success: true,
        message: "Função do usuário atualizada para Administrativo",
        employee_id: employee.id,
        new_role: "administrativo"
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
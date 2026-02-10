import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const userEmail = "andrehenri9@gmail.com";

    console.log(`🔄 Atualizando função para administrativo: ${userEmail}`);

    // 1. Buscar Employee
    const employees = await base44.asServiceRole.entities.Employee.filter({ email: userEmail });
    
    if (!employees || employees.length === 0) {
      return Response.json({ error: "Colaborador não encontrado com este email" }, { status: 404 });
    }

    const employee = employees[0];
    console.log("✅ Colaborador encontrado:", employee.full_name, employee.id);

    // 2. Atualizar dados para Administrativo
    const updateData = {
      job_role: "administrativo",
      area: "administrativo",
      position: "Assistente Administrativo", // Atualizando cargo para refletir a mudança
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
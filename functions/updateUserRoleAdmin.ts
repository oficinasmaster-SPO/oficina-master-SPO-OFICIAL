import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const userEmail = "andrehenri9@gmail.com";
    const administrativeProfileId = "69593151faf2794306bd2f41"; // ID do perfil 'Financeiro / Administrativo'

    console.log(`🔄 Reparando perfil para: ${userEmail}`);

    // 1. Buscar Employee
    let employees = await base44.asServiceRole.entities.Employee.filter({ email: userEmail });
    
    if (!employees || employees.length === 0) {
        return Response.json({ error: "Employee não encontrado para este email" }, { status: 404 });
    }

    const employee = employees[0];
    console.log("✅ Employee encontrado:", employee.id, "Profile ID atual:", employee.profile_id);

    // 2. Atualizar com o profile_id correto
    const updated = await base44.asServiceRole.entities.Employee.update(employee.id, {
        job_role: "administrativo",
        area: "administrativo",
        position: "Administrativo",
        profile_id: administrativeProfileId,
        user_status: "ativo"
    });

    return Response.json({
        success: true,
        message: "Perfil atualizado com sucesso",
        previous_profile_id: employee.profile_id,
        new_profile_id: updated.profile_id,
        employee: updated
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
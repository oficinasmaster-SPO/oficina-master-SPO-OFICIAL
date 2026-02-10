import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const userId = "698b3434bf896f59ccaaac94";
    const userEmail = "andrehenri9@gmail.com";

    console.log(`🔧 Iniciando reparo para usuário: ${userId} (${userEmail})`);

    // 1. Buscar Usuário
    const user = await base44.asServiceRole.entities.User.get(userId);
    if (!user) {
      return Response.json({ error: "Usuário não encontrado" });
    }
    console.log("✅ Usuário encontrado:", user);

    // 2. Buscar Employee
    let employees = await base44.asServiceRole.entities.Employee.filter({ email: userEmail });
    let employee = employees && employees.length > 0 ? employees[0] : null;

    if (!employee) {
      console.log("⚠️ Employee não encontrado pelo email. Tentando criar...");
      // Buscar um workshop_id (do user ou do primeiro disponível)
      let workshopId = user.workshop_id;
      if (!workshopId) {
        // Tentar achar um workshop qualquer para associar (perigoso, mas necessário para teste)
        // Melhor: verificar se existe convite
        const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({ email: userEmail });
        if (invites && invites.length > 0) {
          workshopId = invites[0].workshop_id;
        }
      }
      
      if (!workshopId) {
         return Response.json({ error: "Não foi possível identificar a oficina do usuário." });
      }

      // Criar Employee
      employee = await base44.asServiceRole.entities.Employee.create({
        workshop_id: workshopId,
        user_id: userId,
        full_name: user.full_name || "André Henri",
        email: userEmail,
        position: "Colaborador",
        job_role: "outros",
        status: "ativo",
        user_status: "ativo"
      });
      console.log("✅ Novo Employee criado:", employee.id);
    } else {
      console.log("✅ Employee encontrado:", employee.id);
    }

    // 3. Buscar Perfil Válido
    // Tentar achar o perfil original do convite, ou um padrão
    let profileId = employee.profile_id || user.profile_id;
    
    if (!profileId) {
        // Buscar um perfil 'externo' ou 'cliente' ativo
        const profiles = await base44.asServiceRole.entities.UserProfile.filter({ status: 'ativo' });
        const validProfile = profiles.find(p => p.type === 'externo' || p.type === 'cliente') || profiles[0];
        
        if (validProfile) {
            profileId = validProfile.id;
            console.log("✅ Perfil encontrado para vincular:", validProfile.name, profileId);
        } else {
            console.error("❌ Nenhum perfil ativo encontrado no sistema");
        }
    }

    // 4. Atualizar Employee
    const employeeUpdate = {
        user_id: userId,
        user_status: 'ativo',
        status: 'ativo'
    };
    if (profileId && !employee.profile_id) employeeUpdate.profile_id = profileId;
    
    await base44.asServiceRole.entities.Employee.update(employee.id, employeeUpdate);
    console.log("✅ Employee atualizado");

    // 5. Atualizar User
    const userUpdate = {
        workshop_id: employee.workshop_id,
        user_status: 'active'
    };
    if (profileId && !user.profile_id) userUpdate.profile_id = profileId;
    
    await base44.asServiceRole.entities.User.update(userId, userUpdate);
    console.log("✅ User atualizado");

    return Response.json({
        success: true,
        message: "Usuário reparado com sucesso",
        user_id: userId,
        employee_id: employee.id,
        profile_id: profileId
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
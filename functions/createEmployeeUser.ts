import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, position, area, job_role, profile_id, workshop_id } = body;
    
    if (!name || !email || !workshop_id) {
      return Response.json({ error: 'Nome, email e oficina obrigatórios' }, { status: 400 });
    }

    console.log("👤 Criando colaborador:", email);

    // 1. Verificar se já existe Employee com este email
    const existingEmployees = await base44.asServiceRole.entities.Employee.filter({ 
      email: email, 
      workshop_id: workshop_id 
    });

    if (existingEmployees && existingEmployees.length > 0) {
      return Response.json({ 
        error: 'Já existe um colaborador com este email nesta oficina' 
      }, { status: 400 });
    }

    // 2. Criar Employee
    const employee = await base44.asServiceRole.entities.Employee.create({
      full_name: name,
      email: email,
      position: position || 'Colaborador',
      area: area || 'tecnico',
      job_role: job_role || 'outros',
      status: 'ativo',
      tipo_vinculo: 'cliente',
      workshop_id: workshop_id,
      profile_id: profile_id || null,
      user_status: 'ativo',
      hire_date: new Date().toISOString().split('T')[0]
    });

    console.log("✅ Employee criado:", employee.id);

    // 3. Convidar usuário Base44
    const temporaryPassword = "Oficina@2025";
    
    try {
      await base44.users.inviteUser(email, "user");
      console.log("✅ Usuário convidado:", email);
    } catch (inviteError) {
      console.error("⚠️ Erro ao convidar usuário:", inviteError.message);
      // Continua mesmo se falhar o convite
    }

    // 4. Criar registro de convite no sistema
    try {
      const inviteToken = Math.random().toString(36).substring(2, 15) + 
                         Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

      await base44.asServiceRole.entities.EmployeeInvite.create({
        workshop_id: workshop_id,
        employee_id: employee.id,
        name: name,
        email: email,
        position: position || 'Colaborador',
        area: area || 'tecnico',
        job_role: job_role || 'outros',
        profile_id: profile_id || null,
        invite_token: inviteToken,
        invite_type: 'workshop',
        expires_at: expiresAt.toISOString(),
        status: "enviado"
      });

      console.log("✅ Convite criado no sistema");
    } catch (inviteDbError) {
      console.error("⚠️ Erro ao criar convite no banco:", inviteDbError.message);
    }

    // 5. Enviar email de convite
    try {
      console.log("📧 Chamando sendEmployeeInvite com payload:", {
        name: name,
        email: email,
        workshop_id: workshop_id,
        employee_id: employee.id
      });
      
      const emailResult = await base44.functions.invoke('sendEmployeeInvite', {
        name: name,
        email: email,
        workshop_id: workshop_id,
        employee_id: employee.id
      });

      console.log("✅ Status da resposta:", emailResult.status);
      console.log("✅ Response body:", JSON.stringify(emailResult.data, null, 2));

      if (!emailResult.data?.success) {
        console.error("⚠️ Email NÃO foi enviado:", emailResult.data?.error);
        throw new Error("Falha ao enviar email: " + (emailResult.data?.error || "Erro desconhecido"));
      }
    } catch (emailError) {
      console.error("❌ Erro ao enviar email:", emailError);
      console.error("❌ Stack:", emailError.stack);
      // Não continua - email é crítico
      throw new Error("Erro ao enviar email de convite: " + emailError.message);
    }

    // 6. Retornar sucesso
    return Response.json({ 
      success: true,
      message: 'Colaborador criado com sucesso!',
      email: email,
      temporary_password: temporaryPassword,
      employee_id: employee.id
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
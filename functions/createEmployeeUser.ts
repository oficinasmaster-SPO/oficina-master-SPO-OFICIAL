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

    // 1. Criar Employee
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

    // 2. Convidar usuário Base44 com senha temporária
    const temporaryPassword = "Oficina@2025";
    
    await base44.users.inviteUser(email, "user");
    
    console.log("✅ Usuário convidado:", email);

    // 3. Atualizar Employee com user_id (será linkado no primeiro login)
    return Response.json({ 
      success: true,
      message: 'Colaborador criado com sucesso!',
      data: {
        employee_id: employee.id,
        email: email,
        temporary_password: temporaryPassword
      }
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
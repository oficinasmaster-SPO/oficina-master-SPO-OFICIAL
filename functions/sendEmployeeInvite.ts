import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, position, area, job_role, initial_permission, workshop_id, workshop_name, origin, employee_id, invite_type = 'workshop' } = body;

    if (!name || !email) {
      return Response.json({ error: 'Campos obrigatórios: nome e email' }, { status: 400 });
    }

    if (invite_type === 'workshop' && !workshop_id) {
      return Response.json({ error: 'Workshop obrigatório para colaboradores de oficina' }, { status: 400 });
    }

    console.log("📧 Iniciando convite para:", email);

    // Buscar ou criar Employee
    let finalEmployeeId = employee_id;
    let employee;
    
    if (!finalEmployeeId) {
      const filterQuery = invite_type === 'internal'
        ? { email: email, tipo_vinculo: 'interno' }
        : { email: email, workshop_id: workshop_id };
        
      const employees = await base44.asServiceRole.entities.Employee.filter(filterQuery);
      
      if (employees && employees.length > 0) {
        employee = employees[0];
        finalEmployeeId = employee.id;
        console.log("✅ Employee já existe:", finalEmployeeId);
      } else {
        const createData = {
          full_name: name,
          email: email,
          position: position || 'Colaborador',
          area: area || (invite_type === 'internal' ? 'administrativo' : 'tecnico'),
          job_role: job_role || (invite_type === 'internal' ? 'consultor' : 'outros'),
          status: 'ativo',
          tipo_vinculo: invite_type === 'internal' ? 'interno' : 'cliente',
          is_internal: invite_type === 'internal',
          hire_date: new Date().toISOString().split('T')[0]
        };

        if (invite_type === 'workshop') {
          const workshops = await base44.asServiceRole.entities.Workshop.filter({ id: workshop_id });
          const workshop = workshops[0];
          createData.workshop_id = workshop_id;
          createData.owner_id = workshop?.owner_id || null;
        }
        
        employee = await base44.asServiceRole.entities.Employee.create(createData);
        finalEmployeeId = employee.id;
        console.log("✅ Employee criado:", finalEmployeeId);
      }
    }

    // Gerar token
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Verificar convites existentes
    const inviteFilter = invite_type === 'internal'
      ? { email: email, invite_type: 'internal' }
      : { email: email, workshop_id: workshop_id };
      
    const existingInvites = await base44.asServiceRole.entities.EmployeeInvite.filter(inviteFilter);

    let inviteId;

    if (existingInvites && existingInvites.length > 0) {
      const existing = existingInvites[0];
      inviteId = existing.id;

      await base44.asServiceRole.entities.EmployeeInvite.update(existing.id, {
        invite_token: token,
        expires_at: expiresAt,
        employee_id: finalEmployeeId,
        resent_count: (existing.resent_count || 0) + 1,
        last_resent_at: new Date().toISOString(),
        status: 'enviado'
      });
      console.log("🔄 Convite atualizado:", inviteId);
    } else {
      const newInvite = await base44.asServiceRole.entities.EmployeeInvite.create({
        name,
        email,
        position: position || 'Colaborador',
        area: area || (invite_type === 'internal' ? 'administrativo' : 'tecnico'),
        job_role: job_role || (invite_type === 'internal' ? 'consultor' : 'outros'),
        initial_permission: initial_permission || 'colaborador',
        workshop_id: invite_type === 'workshop' ? workshop_id : null,
        invite_type,
        employee_id: finalEmployeeId,
        invite_token: token,
        expires_at: expiresAt,
        status: 'enviado'
      });
      inviteId = newInvite.id;
      console.log("✅ Convite criado:", inviteId);
    }

    // Usa o domínio de origem da requisição (oficinasmastergtr.com em produção)
    const baseUrl = origin || req.headers.get('origin') || 'https://oficinasmastergtr.com';
    const inviteUrl = `${baseUrl}/PrimeiroAcesso?token=${token}`;

    console.log("✅ Link de convite gerado:", inviteUrl);
    console.log("📧 IMPORTANTE: Compartilhe este link com o colaborador:", email);

    return Response.json({ 
      success: true, 
      message: 'Convite criado com sucesso! Compartilhe o link com o colaborador.',
      invite_id: inviteId,
      invite_url: inviteUrl,
      employee_id: finalEmployeeId,
      instructions: `Envie este link para ${name} (${email}): ${inviteUrl}`
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ 
      success: false,
      error: 'Erro ao criar convite',
      details: error.message 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();
    if (!currentUser || !currentUser.id) {
        return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch(e) {
      return Response.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Payload inválido' } }, { status: 400 });
    }

    const { employeeId, email, workshopId } = body;

    if (!employeeId || typeof employeeId !== 'string' || !email || typeof email !== 'string' || !workshopId || typeof workshopId !== 'string') {
      return Response.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'employeeId, email e workshopId são obrigatórios e devem ser texto' } }, { status: 400 });
    }

    if (currentUser.data?.workshop_id && currentUser.data?.workshop_id !== workshopId) {
      return Response.json({ success: false, error: { code: 'FORBIDDEN', message: 'Acesso cross-tenant negado' } }, { status: 403 });
    }

    // 1. Encontrar o registro de Employee
    const employee = await base44.entities.Employee.get(employeeId);
    
    if (!employee || employee.workshop_id !== workshopId) {
      return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Colaborador não encontrado ou não pertence a esta oficina' } }, { status: 404 });
    }

    // 2. Encontrar o registro de User correspondente ao e-mail
    const users = await base44.entities.User.filter({ email: email });
    
    if (!users || users.length === 0) {
      return Response.json({ success: false, error: { code: 'NOT_FOUND', message: `Nenhum usuário encontrado com o e-mail: ${email}.` } }, { status: 404 });
    }
    
    const user = users[0];

    // 3. Vincular o User ao Employee e atualizar o Employee
    if (employee.user_id !== user.id) {
      await base44.entities.Employee.update(employeeId, {
        user_id: user.id,
        user_status: 'ativo',
      });
    }

    // Opcional: tentar atualizar o role do User se necessário
    if (employee.profile_id) {
        const userProfile = await base44.entities.UserProfile.get(employee.profile_id);
        if (userProfile && userProfile.roles && userProfile.roles.includes('admin') && user.role !== 'admin') {
             try {
                await base44.users.inviteUser(user.email, 'admin');
             } catch (e) {
                 console.log("Erro ao tentar elevar user para admin:", e);
             }
        }
    }

    return Response.json({ 
      success: true, 
      data: {
        message: 'Colaborador vinculado ao usuário com sucesso!'
      }
    });

  } catch (error) {
    console.error("Erro:", error);
    return Response.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno no servidor' } }, { status: 500 });
  }
});
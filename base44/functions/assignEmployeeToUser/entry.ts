import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { employeeId, email, workshopId } = body;

    if (!employeeId || !email || !workshopId) {
      return Response.json({ error: 'employeeId, email, and workshopId são obrigatórios' }, { status: 400 });
    }

    const currentUser = await base44.auth.me();
    if (!currentUser) {
        return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 1. Encontrar o registro de Employee
    const employee = await base44.asServiceRole.entities.Employee.get(employeeId);
    
    if (!employee || employee.workshop_id !== workshopId) {
      return Response.json({ error: 'Colaborador não encontrado ou não pertence a esta oficina' }, { status: 404 });
    }

    // 2. Encontrar o registro de User correspondente ao e-mail
    const users = await base44.asServiceRole.entities.User.filter({ email: email });
    
    if (!users || users.length === 0) {
      return Response.json({ error: `Nenhum usuário encontrado com o e-mail: ${email}.` }, { status: 404 });
    }
    
    const user = users[0];

    // 3. Vincular o User ao Employee e atualizar o Employee
    if (employee.user_id !== user.id) {
      await base44.asServiceRole.entities.Employee.update(employeeId, {
        user_id: user.id,
        user_status: 'ativo',
      });
    }

    // Opcional: tentar atualizar o role do User se necessário
    if (employee.profile_id) {
        const userProfile = await base44.asServiceRole.entities.UserProfile.get(employee.profile_id);
        if (userProfile && userProfile.roles && userProfile.roles.includes('admin') && user.role !== 'admin') {
             try {
                await base44.asServiceRole.users.inviteUser(user.email, 'admin');
             } catch (e) {
                 console.log("Erro ao tentar elevar user para admin:", e);
             }
        }
    }

    return Response.json({ 
      success: true, 
      message: 'Colaborador vinculado ao usuário com sucesso!',
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
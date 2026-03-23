import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Buscar o usuário pelo email
    const users = await base44.asServiceRole.entities.User.filter({ email });

    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const userToDelete = users[0];

    // Deletar o usuário
    await base44.asServiceRole.entities.User.delete(userToDelete.id);

    return Response.json({ 
      success: true, 
      message: `Usuário ${email} deletado com sucesso`,
      deleted_user_id: userToDelete.id
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
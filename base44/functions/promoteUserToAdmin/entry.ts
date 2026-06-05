import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admins podem promover usuários' }, { status: 403 });
    }

    const targetUserId = '697b9833a0dba46b3f8d8114';
    
    const targetUser = await base44.entities.User.get(targetUserId);
    if (!targetUser) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    await base44.entities.User.update(targetUserId, { role: 'admin' });
    
    const updatedUser = await base44.entities.User.get(targetUserId);
    
    return Response.json({ 
      success: true,
      message: `Usuário ${updatedUser.full_name} promovido para admin`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        role: updatedUser.role
      }
    });
    
  } catch (error) {
    console.error("❌ Erro ao promover user:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
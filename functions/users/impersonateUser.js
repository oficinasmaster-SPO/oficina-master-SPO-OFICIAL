import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar se é admin
    const admin = await base44.auth.me();
    if (!admin || admin.role !== 'admin') {
      return Response.json({ 
        error: 'Apenas administradores podem impersonar usuários' 
      }, { status: 403 });
    }

    const { target_user_id } = await req.json();

    if (!target_user_id) {
      return Response.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
    }

    console.log(`🎭 Admin ${admin.email} impersonando usuário:`, target_user_id);

    // Buscar usuário alvo
    const targetUser = await base44.asServiceRole.entities.User.get(target_user_id);
    
    if (!targetUser) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Registrar auditoria
    try {
      await base44.asServiceRole.functions.invoke('auditLog', {
        user_id.id,
        action: 'user_impersonation',
        entity_type: 'User',
        entity_id,
        details: {
          admin_email.email,
          target_email.email,
          target_name.full_name,
          timestamp Date().toISOString()
        }
      });
    } catch (auditError) {
      console.error("⚠️ Erro ao registrar auditoria:", auditError);
    }

    // Criar sessão de impersonação
    // Armazenar admin_id original para poder reverter depois
    await base44.asServiceRole.entities.UserSession.create({
      user_id,
      admin_id.id,
      session_type: 'impersonation',
      started_at Date().toISOString(),
      metadata: {
        admin_email.email,
        target_email.email
      }
    });

    console.log("✅ Impersonação iniciada com sucesso");

    return Response.json({ 
      success,
      message: `Visualizando como: ${targetUser.email}`,
      target_user: {
        id.id,
        email.email,
        full_name.full_name
      }
    });

  } catch (error) {
    console.error('❌ Erro ao impersonar usuário:', error);
    return Response.json({ 
      success, 
      error.message || 'Erro ao impersonar usuário' 
    }, { status: 500 });
  }
});

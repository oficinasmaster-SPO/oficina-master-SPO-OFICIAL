import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { 
      user_id, 
      action, 
      entity_type, 
      entity_id, 
      details, 
      ip_address, 
      user_agent 
    } = await req.json();

    if (!user_id || !action) {
      return Response.json({ 
        success: false, 
        error: 'user_id e action são obrigatórios' 
      }, { status: 400 });
    }

    // Buscar informações do usuário que executou a ação
    let performedBy = null;
    try {
      const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
      performedBy = users[0];
    } catch (e) {
      console.log('Aviso: não foi possível buscar usuário');
    }

    // Criar registro no UserActivityLog (se a entidade existir)
    try {
      const logEntry = await base44.asServiceRole.entities.UserActivityLog.create({
        user_id,
        user_email: performedBy?.email || 'unknown',
        user_name: performedBy?.full_name || 'unknown',
        action,
        entity_type: entity_type || null,
        entity_id: entity_id || null,
        details: details || {},
        ip_address: ip_address || null,
        user_agent: user_agent || null,
        timestamp: new Date().toISOString()
      });

      console.log("✅ Log de auditoria criado:", logEntry.id);

      return Response.json({ 
        success: true, 
        log_id: logEntry.id 
      });
    } catch (logError) {
      // Se a entidade UserActivityLog não existe, apenas logar no console
      console.log("⚠️ UserActivityLog não configurado (ignorando):", logError.message);
      return Response.json({ 
        success: true,
        warning: 'Log de auditoria não disponível'
      });
    }

  } catch (error) {
    console.error('❌ Erro ao criar log de auditoria:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Apenas administradores podem configurar
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado. Apenas administradores podem configurar.' }, { status: 403 });
    }

    const { client_id, account_id, default_success_redirect_url, default_failure_redirect_url, plan_mappings, is_active } = await req.json();

    // Validações básicas
    if (!client_id || !account_id) {
      return Response.json({ error: 'Client ID e Account ID são obrigatórios.' }, { status: 400 });
    }

    // Buscar configurações existentes
    const existingSettings = await base44.asServiceRole.entities.KiwifySettings.list();
    let settings;

    if (existingSettings && existingSettings.length > 0) {
      // Atualizar configurações existentes
      settings = await base44.asServiceRole.entities.KiwifySettings.update(existingSettings[0].id, {
        client_id,
        account_id,
        default_success_redirect_url,
        default_failure_redirect_url,
        plan_mappings || [],
        is_active !== undefined ? is_active 
      });
    } else {
      // Criar novas configurações
      settings = await base44.asServiceRole.entities.KiwifySettings.create({
        client_id,
        account_id,
        default_success_redirect_url,
        default_failure_redirect_url,
        plan_mappings || [],
        is_active !== undefined ? is_active 
      });
    }

    return Response.json({ 
      success, 
      message: 'Configurações Kiwify salvas com sucesso', 
      settings 
    });
  } catch (error) {
    console.error('Erro ao salvar configurações Kiwify:', error);
    return Response.json({ error.message }, { status: 500 });
  }
});

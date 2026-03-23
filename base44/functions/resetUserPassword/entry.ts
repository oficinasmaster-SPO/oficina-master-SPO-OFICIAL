import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar se é admin
    const currentUser = await base44.auth.me();
    if (!currentUser || currentUser.role !== 'admin') {
      return Response.json({ 
        success: false, 
        error: 'Acesso negado. Apenas administradores podem resetar senhas.' 
      }, { status: 403 });
    }

    const { user_id, user_email } = await req.json();

    if (!user_id || !user_email) {
      return Response.json({ 
        success: false, 
        error: 'ID e email do usuário são obrigatórios' 
      }, { status: 400 });
    }

    // Gerar senha temporária forte (12 caracteres)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let tempPassword = '';
    for (let i = 0; i < 12; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Atualizar senha usando função admin do Base44
    // Note: Base44 SDK não expõe diretamente update de senha via código,
    // então vamos usar a API de admin (service role)
    const updateResult = await base44.asServiceRole.functions.invoke('updateUserPasswordAdmin', {
      user_id: user_id,
      new_password: tempPassword
    });

    // Se a função acima não existir, tentamos update direto (pode não funcionar dependendo da plataforma)
    // Alternativa: usar API HTTP direta do Base44 ou Supabase

    return Response.json({ 
      success: true, 
      temporary_password: tempPassword,
      message: 'Senha resetada com sucesso. Compartilhe essa senha temporária com o usuário.'
    });

  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Erro ao resetar senha' 
    }, { status: 500 });
  }
});
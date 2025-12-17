import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { phone, email, password, login_url, full_name } = await req.json();

    if (!phone || !email || !password || !login_url) {
      return Response.json({ 
        success: false,
        error: 'Dados incompletos' 
      }, { status: 400 });
    }

    // Formatar telefone (remover caracteres especiais)
    const phoneNumber = phone.replace(/\D/g, '');
    
    if (!phoneNumber || phoneNumber.length < 10) {
      return Response.json({ 
        success: false,
        error: 'Número de telefone inválido' 
      }, { status: 400 });
    }

    // Mensagem personalizada
    const message = `🎉 *Bem-vindo à Oficinas Master!*

Olá ${full_name}! 

Suas credenciais de acesso foram criadas:

📧 *Email:* ${email}
🔑 *Senha Temporária:* ${password}

🔗 *Acesse o sistema:*
${login_url}

⚠️ *Importante:*
• Altere sua senha no primeiro acesso
• Guarde suas credenciais em local seguro
• Em caso de dúvidas, contate o suporte

Bem-vindo à equipe! 🚀`;

    // Evolution API Integration
    const WHATSAPP_API_URL = Deno.env.get('WHATSAPP_API_URL');
    const WHATSAPP_API_KEY = Deno.env.get('WHATSAPP_API_KEY');
    const WHATSAPP_INSTANCE = Deno.env.get('WHATSAPP_INSTANCE_NAME');

    if (WHATSAPP_API_URL && WHATSAPP_API_KEY && WHATSAPP_INSTANCE) {
      console.log("📱 Enviando WhatsApp via Evolution API...");
      
      // Formatar número no padrão internacional (55 + DDD + número)
      let formattedPhone = phoneNumber;
      if (!phoneNumber.startsWith('55')) {
        formattedPhone = '55' + phoneNumber;
      }

      const response = await fetch(`${WHATSAPP_API_URL}/message/sendText/${WHATSAPP_INSTANCE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': WHATSAPP_API_KEY
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: message,
          delay: 1000
        })
      });

      const result = await response.json();

      if (response.ok) {
        console.log("✅ WhatsApp enviado com sucesso para:", formattedPhone);
        return Response.json({
          success: true,
          message: 'Credenciais enviadas via WhatsApp',
          phone: formattedPhone,
          whatsapp_response: result
        });
      } else {
        console.error("❌ Erro Evolution API:", result);
        throw new Error(result.message || 'Erro ao enviar WhatsApp');
      }
    }

    // OPÇÃO 2: Fallback - enviar por email se WhatsApp não estiver configurado
    console.log("⚠️ WhatsApp API não configurada, enviando por email...");
    
    await base44.integrations.Core.SendEmail({
      to: email,
      subject: '🎉 Suas Credenciais de Acesso - Oficinas Master',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Bem-vindo à Oficinas Master!</h2>
          <p>Olá <strong>${full_name}</strong>!</p>
          <p>Suas credenciais de acesso foram criadas:</p>
          
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>📧 Email:</strong> ${email}</p>
            <p style="margin: 10px 0;"><strong>🔑 Senha Temporária:</strong> <code style="background: white; padding: 5px 10px; border-radius: 4px;">${password}</code></p>
          </div>

          <p style="margin: 20px 0;">
            <a href="${login_url}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              🔗 Acessar Sistema
            </a>
          </p>

          <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400E;"><strong>⚠️ Importante:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px; color: #92400E;">
              <li>Altere sua senha no primeiro acesso</li>
              <li>Guarde suas credenciais em local seguro</li>
              <li>Em caso de dúvidas, contate o suporte</li>
            </ul>
          </div>

          <p>Bem-vindo à equipe! 🚀</p>
        </div>
      `
    });

    return Response.json({
      success: true,
      message: 'Credenciais enviadas por email (WhatsApp não configurado)',
      fallback: 'email'
    });

  } catch (error) {
    console.error("Erro ao enviar credenciais:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
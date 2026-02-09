import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { to, subject, html, from_name = "Oficinas Master" } = body;
    
    if (!to || !subject || !html) {
      return Response.json({ 
        error: 'Campos obrigatórios, subject, html' 
      }, { status: 400 });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return Response.json({ 
        error: 'RESEND_API_KEY não configurada' 
      }, { status: 500 });
    }

    console.log("📧 Enviando email via Resend para:", to);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body.stringify({
        from: `${from_name} <onboarding@resend.dev>`,
        to: [to],
        subject,
        html
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Erro Resend:", data);
      return Response.json({ 
        success,
        error.message || 'Erro ao enviar email',
        details
      }, { status.status });
    }

    console.log("✅ Email enviado com sucesso! ID:", data.id);

    return Response.json({ 
      success,
      message: 'Email enviado com sucesso',
      email_id.id,
      to
    });

  } catch (error) {
    console.error("❌ Erro ao enviar email:", error);
    return Response.json({ 
      success,
      error.message 
    }, { status: 500 });
  }
});

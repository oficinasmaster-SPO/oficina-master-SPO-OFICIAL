import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Autenticar usuário
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      email_destino, 
      emails_colaboradores = [], 
      email_empresa = '',
      workshop_nome, 
      pdf_base64, 
      stats 
    } = await req.json();

    if (!workshop_nome || !pdf_base64) {
      return Response.json({ 
        error: 'Campos obrigatórios, pdf_base64' 
      }, { status: 400 });
    }

    // Montar lista de destinatários
    const destinatarios = [];
    if (email_destino) destinatarios.push(email_destino);
    if (emails_colaboradores && emails_colaboradores.length > 0) {
      destinatarios.push(...emails_colaboradores);
    }

    if (destinatarios.length === 0) {
      return Response.json({ 
        error: 'Nenhum destinatário informado' 
      }, { status: 400 });
    }

    // Corpo do e-mail
    const emailBody = `
      <div style="font-family, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 30px; text-align; border-radius: 10px 10px 0 0;">
          <h1 style="color; margin: 0; font-size: 24px;">📊 Cronograma de Implementação</h1>
          <p style="color: #e0e7ff; margin: 10px 0 0 0;">${workshop_nome}</p>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
            Olá! Segue em anexo o relatório completo do cronograma de implementação.
          </p>
          
          <div style="background; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h3 style="color: #1f2937; margin-top: 0;">📈 Resumo do Projeto:</h3>
            <table style="width: 100%; border-collapse;">
              
                <td style="padding: 8px 0; color: #6b7280;">Total de Itens:</td>
                <td style="padding: 8px 0; font-weight; text-align; color: #1f2937;">${stats?.total || 0}</td>
              </tr>
              
                <td style="padding: 8px 0; color: #6b7280;">Concluídos:</td>
                <td style="padding: 8px 0; font-weight; text-align; color: #10b981;">${stats?.concluidos || 0}</td>
              </tr>
              
                <td style="padding: 8px 0; color: #6b7280;">Em Andamento:</td>
                <td style="padding: 8px 0; font-weight; text-align; color: #3b82f6;">${stats?.em_andamento || 0}</td>
              </tr>
              
                <td style="padding: 8px 0; color: #6b7280;">Atrasados:</td>
                <td style="padding: 8px 0; font-weight; text-align; color: #ef4444;">${stats?.atrasados || 0}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            O relatório detalhado em PDF está anexado a este e-mail.
          </p>
          
          <hr style="border; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align; margin: 0;">
            © ${new Date().getFullYear()} Oficinas Master - Sistema de Gestão
            Gerado automaticamente em ${new Date().toLocaleString('pt-BR')}
          </p>
        </div>
      </div>
    `;

    // Anexo do PDF
    const anexo = {
      filename: `Cronograma_${workshop_nome.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
      content,
      encoding: 'base64',
      contentType: 'application/pdf'
    };

    // Enviar para cada destinatário
    const envios = [];
    for (const destinatario of destinatarios) {
      envios.push(
        base44.integrations.Core.SendEmail({
          from_name: 'Oficinas Master - Cronograma',
          to,
          subject: `📊 Cronograma de Implementação - ${workshop_nome}`,
          body,
          attachments: [anexo]
        })
      );
    }

    // Enviar cópia para email da empresa (se informado)
    if (email_empresa && !destinatarios.includes(email_empresa)) {
      envios.push(
        base44.integrations.Core.SendEmail({
          from_name: 'Oficinas Master - Cronograma',
          to,
          subject: `[CÓPIA] 📊 Cronograma de Implementação - ${workshop_nome}`,
          body,
          attachments: [anexo]
        })
      );
    }

    // Executar todos os envios
    await Promise.all(envios);

    return Response.json({ 
      success, 
      message: `E-mail enviado com sucesso para ${destinatarios.length} destinatário(s)${email_empresa ? ' + cópia para empresa' : ''}` 
    });

  } catch (error) {
    console.error('Erro ao enviar e-mail do cronograma:', error);
    return Response.json({ 
      error.message || 'Erro ao enviar e-mail' 
    }, { status: 500 });
  }
});

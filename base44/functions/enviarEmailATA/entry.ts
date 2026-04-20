import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ata_id, atendimento_id, email_override } = await req.json();

    if (!ata_id) {
      return Response.json({ error: 'ata_id é obrigatório' }, { status: 400 });
    }

    // Buscar ATA
    const ata = await base44.entities.MeetingMinutes.get(ata_id);
    if (!ata) {
      return Response.json({ error: 'ATA não encontrada' }, { status: 404 });
    }

    // Buscar workshop
    const workshop = await base44.entities.Workshop.get(ata.workshop_id);
    if (!workshop) {
      return Response.json({ error: 'Oficina não encontrada' }, { status: 404 });
    }

    // Buscar atendimento (opcional)
    let atendimento = null;
    if (atendimento_id) {
      const atendimentos = await base44.entities.ConsultoriaAtendimento.filter({
        id: atendimento_id,
      });
      atendimento = atendimentos?.[0] || null;
    }

    // Determinar email de destino
    let emailDestino = email_override;
    if (!emailDestino && workshop.owner_id) {
      const ownerList = await base44.entities.User.filter({
        id: workshop.owner_id,
      });
      emailDestino = ownerList?.[0]?.email;
    }

    if (!emailDestino) {
      return Response.json(
        { error: 'Email do destinatário não encontrado' },
        { status: 400 }
      );
    }

    // Montar dados para o email
    const dataFormatada = new Date(ata.meeting_date || new Date()).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const nomeOficina = workshop?.name || 'Oficina Cliente';
    const nomeArquivo = `${nomeOficina
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')}_${dataFormatada.replace(/\//g, '')}.pdf`;

    // Próximos passos formatados
    const proximosPassos = (atendimento?.proximos_passos_list || [])
      .filter((p) => p.descricao)
      .slice(0, 5)
      .map(
        (p) => `
        <li style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151">
          <span style="min-width:20px;height:20px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;color:#166534;font-weight:700;margin-top:1px">✓</span>
          <span>${p.descricao}${p.responsavel ? ` <span style="color:#9ca3af">· ${p.responsavel}</span>` : ''}</span>
        </li>
      `
      )
      .join('');

    // Montar HTML do email
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ATA de Atendimento</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:640px;margin:24px auto;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;background:#fff">

    <!-- HEADER -->
    <div style="background:#DC2626;padding:28px 32px">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;letter-spacing:-0.3px">ATA de Atendimento</h1>
      <p style="color:#fca5a5;margin:4px 0 0;font-size:13px">${nomeOficina} · ${workshop?.city || ''}</p>
    </div>

    <!-- BODY -->
    <div style="padding:28px 32px">

      <p style="font-size:15px;color:#18181b;margin:0 0 16px">
        Olá, <strong>${workshop?.name || 'Parceiro'}</strong>!
      </p>

      <p style="font-size:14px;color:#52525b;line-height:1.6;margin:0 0 24px">
        Segue a ata completa do nosso atendimento realizado em <strong>${dataFormatada}</strong>.
      </p>

      <!-- INFO CARD -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:0 0 24px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6b7280;border-bottom:1px solid #f0f0f0">Código da ATA</td>
            <td style="padding:6px 0;font-size:13px;color:#18181b;font-weight:500;text-align:right;border-bottom:1px solid #f0f0f0">${ata.code || '-'}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6b7280;border-bottom:1px solid #f0f0f0">Tipo</td>
            <td style="padding:6px 0;text-align:right;border-bottom:1px solid #f0f0f0">
              <span style="background:#dbeafe;color:#1e40af;font-size:11px;font-weight:600;padding:2px 10px;border-radius:20px">
                ${(ata.tipo_aceleracao || 'ATENDIMENTO').toUpperCase()}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6b7280;border-bottom:1px solid #f0f0f0">Data</td>
            <td style="padding:6px 0;font-size:13px;color:#18181b;font-weight:500;text-align:right;border-bottom:1px solid #f0f0f0">
              ${dataFormatada}${ata.meeting_time ? ` às ${ata.meeting_time}` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6b7280;border-bottom:1px solid #f0f0f0">Consultor</td>
            <td style="padding:6px 0;font-size:13px;color:#18181b;font-weight:500;text-align:right;border-bottom:1px solid #f0f0f0">
              ${ata.consultor_name || '-'}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6b7280">Status</td>
            <td style="padding:6px 0;text-align:right">
              <span style="background:#dcfce7;color:#166534;font-size:11px;font-weight:600;padding:2px 10px;border-radius:20px">
                ${ata.status === 'finalizada' ? 'Finalizada' : 'Rascunho'}
              </span>
            </td>
          </tr>
        </table>
      </div>

      <!-- RESUMO -->
      ${
        ata.objetivos_atendimento || ata.resumo_executivo
          ? `
      <p style="font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 10px">
        Resumo do atendimento
      </p>
      <div style="background:#fff7ed;border-left:3px solid #f97316;border-radius:0 6px 6px 0;padding:14px 16px;margin:0 0 24px;font-size:14px;color:#431407;line-height:1.6">
        ${ata.objetivos_atendimento || ata.resumo_executivo || ''}
      </div>
      `
          : ''
      }

      <!-- PRÓXIMOS PASSOS -->
      ${
        proximosPassos
          ? `
      <p style="font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 10px">
        Próximos passos
      </p>
      <ul style="margin:0 0 24px;padding:0;list-style:none">
        ${proximosPassos}
      </ul>
      `
          : ''
      }

      <!-- CTA -->
      <a href="https://oficinasmaster.com.br"
         style="display:block;background:#DC2626;color:#fff;text-align:center;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;margin:0 0 24px">
        Acessar o Sistema Oficinas Master
      </a>

      <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0">
        Dúvidas? Responda este email ou fale com seu consultor.
      </p>

    </div>

    <!-- FOOTER -->
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center">
      <p style="font-size:11px;color:#9ca3af;margin:3px 0">Oficinas Master · Sistema de Performance de Oficinas</p>
      <p style="font-size:11px;color:#9ca3af;margin:3px 0">Este é um email automático gerado pelo SPO.</p>
    </div>

  </div>
</body>
</html>`;

    // Enviar via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return Response.json(
        { error: 'RESEND_API_KEY não configurada' },
        { status: 500 }
      );
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@resend.dev',
        to: emailDestino,
        subject: `ATA de Atendimento — ${nomeOficina} · ${dataFormatada}`,
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      return Response.json(
        { error: 'Erro ao enviar email via Resend', details: resendData },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: `Email enviado para ${emailDestino}`,
      email_id: resendData.id,
    });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return Response.json(
      { error: 'Erro ao enviar email: ' + error.message },
      { status: 500 }
    );
  }
});
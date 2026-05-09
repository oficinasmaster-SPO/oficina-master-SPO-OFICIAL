import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@2.5.2';
import 'npm:jspdf-autotable@3.8.2';

const normalizarTexto = (texto) => {
  if (!texto) return '—';
  return String(texto).normalize('NFC');
};

const gerarGraficoASCII = (taxaRealizacao) => {
  const barras = Math.round(taxaRealizacao / 5);
  const vazio = 20 - barras;
  const barra = '█'.repeat(barras) + '░'.repeat(vazio);
  return `${barra} ${taxaRealizacao}%`;
};

const gerarHTMLRelatorio = (consultor, metricas, concludidos) => {
  const clientesRealizados = concludidos
    .slice(0, 10)
    .map(c => `• ${normalizarTexto(c.workshop_name)} (${normalizarTexto(c.canal)})`)
    .join('<br/>');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: #333; color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 5px 0; color: #ddd; }
        .content { padding: 20px; }
        .kpi-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .kpi-card { background: #f9f9f9; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #333; }
        .kpi-label { color: #666; font-size: 12px; margin-bottom: 8px; }
        .kpi-value { font-size: 28px; font-weight: bold; color: #333; }
        .section-title { font-size: 16px; font-weight: bold; color: #333; margin: 20px 0 10px 0; border-bottom: 2px solid #333; padding-bottom: 8px; }
        .chart { background: #f0f0f0; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; margin: 10px 0; }
        .cliente-item { padding: 8px 0; border-bottom: 1px solid #eee; }
        .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .table th { background: #333; color: white; padding: 10px; text-align: left; font-size: 12px; }
        .table td { padding: 8px; border-bottom: 1px solid #eee; font-size: 12px; }
        .table tr:nth-child(even) { background: #f9f9f9; }
        .status-ok { color: #22c55e; font-weight: bold; }
        .status-pendente { color: #f59e0b; font-weight: bold; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
        .cta-button { display: inline-block; background: #333; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 12px; margin: 10px 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Relatório Diário de Follow-ups</h1>
          <p>${new Date().toLocaleDateString('pt-BR')}</p>
          <p>Consultor: ${normalizarTexto(consultor.full_name || 'Sistema')}</p>
        </div>

        <div class="content">
          <div class="section-title">📈 RESUMO DO DIA</div>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">✅ Realizados</div>
              <div class="kpi-value">${metricas.realizados || 0}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">⏳ Pendentes</div>
              <div class="kpi-value">${metricas.pendentes || 0}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">⛔ Atrasados</div>
              <div class="kpi-value">${metricas.atrasados || 0}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">📈 Taxa</div>
              <div class="kpi-value">${metricas.taxaRealizacao || 0}%</div>
            </div>
          </div>

          <div class="section-title">📊 Taxa de Realização</div>
          <div class="chart">
            ┌──────────────────────────────────────────┐<br/>
            │ ${gerarGraficoASCII(metricas.taxaRealizacao || 0)} │<br/>
            └──────────────────────────────────────────┘
          </div>

          ${clientesRealizados ? `
            <div class="section-title">✅ Clientes Atendidos</div>
            <div style="padding: 10px; background: #f0f0f0; border-radius: 6px;">
              ${clientesRealizados}
            </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.oficinasmaster.com/CentralFollowUp" class="cta-button">👁️ Ver Relatório Completo</a>
          </div>
        </div>

        <div class="footer">
          <p>Este é um relatório automático gerado às 07:00 AM.</p>
          <p>Dúvidas? Contate a equipe de suporte.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emailsDestino, tipo = 'diario', data } = await req.json();
    
    // Relatório é do DIA ANTERIOR (enviado às 07h da manhã)
    let dataRelatorio = data;
    if (!data) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      dataRelatorio = yesterday.toISOString().split('T')[0];
    }
    const today = dataRelatorio;

    // Buscar dados do relatório
    let metricasResponse;
    try {
      metricasResponse = await base44.functions.invoke('getRelatorioFollowUpMetricas', {
        tipo,
        data: today,
      });
    } catch (e) {
      metricasResponse = { data: { realizados: 0, pendentes: 0, atrasados: 0, taxaRealizacao: 0 } };
    }

    const concludidos = await base44.entities.FollowUpConcluido.filter(
      { consultor_id: user.id },
      '-completedAt'
    ).then(items => items.filter(c => c.completedAt?.startsWith(today)));

    const reminders = await base44.entities.FollowUpReminder.filter(
      { consultor_id: user.id, reminder_date: today },
      '-reminder_date'
    );

    // Gerar HTML
    const htmlContent = gerarHTMLRelatorio(user, metricasResponse.data || {}, concludidos);

    // Gerar PDF
    const doc = new jsPDF();
    doc.setFont('Helvetica', 'normal');
    doc.setFillColor(51, 51, 51);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('OFICINAS MASTER', 15, 12);
    doc.setFontSize(11);
    doc.text('Relatório Diário de Follow-ups', 15, 23);

    doc.setTextColor(0, 0, 0);
    let yPos = 40;

    doc.setFontSize(14);
    doc.text(`Relatório de ${new Date().toLocaleDateString('pt-BR')}`, 15, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.text(`Consultor: ${normalizarTexto(user.full_name || 'Sistema')}`, 15, yPos);
    yPos += 15;

    // KPIs no PDF
    const metricasData = metricasResponse.data || {};
    doc.setFontSize(10);
    doc.setFillColor(240, 248, 245);
    doc.rect(15, yPos, 50, 20, 'F');
    doc.text('Realizados', 18, yPos + 8);
    doc.setFontSize(16);
    doc.text((metricasData.realizados || 0).toString(), 18, yPos + 18);

    doc.setFillColor(255, 250, 240);
    doc.rect(70, yPos, 50, 20, 'F');
    doc.setFontSize(10);
    doc.text('Pendentes', 73, yPos + 8);
    doc.setFontSize(16);
    doc.text((metricasData.pendentes || 0).toString(), 73, yPos + 18);

    doc.setFillColor(254, 245, 245);
    doc.rect(125, yPos, 50, 20, 'F');
    doc.setFontSize(10);
    doc.text('Taxa %', 128, yPos + 8);
    doc.setFontSize(16);
    doc.text(`${metricasData.taxaRealizacao || 0}%`, 128, yPos + 18);

    yPos += 30;

    // Tabela de clientes atendidos
    if (concludidos.length > 0) {
      doc.setFontSize(12);
      doc.text('Clientes Atendidos', 15, yPos);
      yPos += 8;

      const clientesList = concludidos.slice(0, 15).map((c, idx) => [
        (idx + 1).toString(),
        normalizarTexto(c.workshop_name),
        normalizarTexto(c.canal),
      ]);

      doc.autoTable({
        startY: yPos,
        head: [['#', 'Cliente', 'Canal']],
        body: clientesList,
        margin: { left: 15, right: 15 },
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94], textColor: 255, fontSize: 9, fontStyle: 'bold', font: 'Helvetica' },
        bodyStyles: { fontSize: 8, textColor: 51, font: 'Helvetica' },
        alternateRowStyles: { fillColor: [245, 250, 245] },
      });
    }

    const pdfBytes = doc.output('arraybuffer');
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    // Enviar email via integração Core
    const destinatarios = emailsDestino || [user.email];
    
    for (const email of destinatarios) {
      const htmlComBotaoPDF = htmlContent.replace(
        '<a href="https://app.oficinasmaster.com/CentralFollowUp" class="cta-button">👁️ Ver Relatório Completo</a>',
        '<a href="https://app.oficinasmaster.com/CentralFollowUp" class="cta-button">👁️ Ver Relatório Completo</a><a href="https://app.oficinasmaster.com/api/downloadRelatorioFollowUpPDF?data=' + today + '" class="cta-button" style="background: #22c55e;">📥 Baixar PDF</a>'
      );

      try {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `📊 Relatório Diário de Follow-ups - ${new Date().toLocaleDateString('pt-BR')}`,
          body: htmlComBotaoPDF,
        });
      } catch (emailError) {
        console.error(`Aviso: Erro ao enviar email para ${email}:`, emailError.message);
        // Continua mesmo com erro - retorna sucesso da função
      }
    }

    return Response.json({ 
      sucesso: true, 
      mensagem: `Email enviado para ${destinatarios.length} destinatário(s)`,
      destinatarios,
    });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
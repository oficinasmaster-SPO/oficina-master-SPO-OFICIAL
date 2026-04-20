import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import puppeteer from 'npm:puppeteer@22.0.0';

Deno.serve(async (req) => {
  let browser = null;
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ata_id } = await req.json();

    if (!ata_id) {
      return Response.json({ error: 'ata_id is required' }, { status: 400 });
    }

    console.log(`[PDF] Iniciando geração para ATA: ${ata_id}`);

    // Buscar dados da ATA
    const ata = await base44.entities.MeetingMinutes.get(ata_id);
    if (!ata) {
      return Response.json({ error: 'ATA not found' }, { status: 404 });
    }

    // Buscar workshop se disponível
    let workshop = null;
    if (ata.workshop_id) {
      try {
        workshop = await base44.entities.Workshop.get(ata.workshop_id);
        console.log(`[PDF] Workshop carregado: ${workshop.name}`);
      } catch (e) {
        console.warn(`[PDF] Workshop não encontrado:`, e.message);
      }
    }

    // Gerar HTML da ATA
    console.log(`[PDF] Gerando HTML da ATA`);
    const htmlContent = generateAtaHTML(ata, workshop);
    console.log(`[PDF] HTML gerado com sucesso (${htmlContent.length} caracteres)`);

    // Usar Puppeteer para gerar PDF
    console.log(`[PDF] Iniciando browser Puppeteer`);
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-resources',
        '--disable-dev-shm-usage'
      ]
    });

    console.log(`[PDF] Browser iniciado com sucesso`);
    const page = await browser.newPage();

    // Listeners de debug
    page.on('console', msg => console.log(`[PDF-Page] ${msg.text()}`));
    page.on('pageerror', err => console.error(`[PDF-PageError] ${err.message}`));
    page.on('error', err => console.error(`[PDF-Error] ${err.message}`));

    console.log(`[PDF] Definindo conteúdo HTML`);
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 60000 // 60 segundos
    });

    console.log(`[PDF] Renderizando PDF`);
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm'
      },
      timeout: 60000
    });

    console.log(`[PDF] PDF gerado com sucesso (${pdf.length} bytes)`);
    
    await page.close();
    await browser.close();

    // Retornar PDF como base64
    const base64PDF = btoa(String.fromCharCode.apply(null, new Uint8Array(pdf)));

    console.log(`[PDF] Geração concluída com sucesso`);
    return Response.json({
      success: true,
      pdf: base64PDF,
      filename: `ATA-${ata.code || ata.id}.pdf`
    });

  } catch (error) {
    console.error(`[PDF-Error] ${error.message}`);
    console.error(`[PDF-Stack] ${error.stack}`);

    // Fechar browser em caso de erro
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error(`[PDF-CloseError] ${closeError.message}`);
      }
    }

    return Response.json(
      { 
        error: error.message || 'PDF generation failed',
        details: error.stack
      },
      { status: 500 }
    );
  }
});

function generateAtaHTML(ata, workshop) {
  const d = ata;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ATA - ${d.code || 'Atendimento'}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #000;
      background: white;
    }

    .document {
      position: relative;
      width: 100%;
    }

    .document-header {
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }

    .document-header h1 {
      font-size: 16pt;
      font-weight: bold;
      margin: 0 0 5px 0;
    }

    .document-header p {
      font-size: 9pt;
      color: #666;
      margin: 2px 0;
    }

    .document-content {
      margin-bottom: 60px;
    }

    .section-block {
      page-break-inside: avoid;
      margin-bottom: 20px;
    }

    h2 {
      font-size: 14pt;
      font-weight: bold;
      margin: 20px 0 10px 0;
      padding-bottom: 5px;
      border-bottom: 2px solid #000;
      page-break-after: avoid;
    }

    h3 {
      font-size: 12pt;
      font-weight: bold;
      margin: 15px 0 8px 0;
      page-break-after: avoid;
    }

    h4 {
      font-size: 11pt;
      font-weight: bold;
      margin: 10px 0 5px 0;
    }

    p {
      margin-bottom: 10px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .grid-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      page-break-inside: avoid;
    }

    .grid-table th {
      background-color: #e5e5e5;
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
      font-weight: bold;
      font-size: 10pt;
    }

    .grid-table td {
      border: 1px solid #666;
      padding: 8px;
      font-size: 10pt;
      vertical-align: top;
    }

    .grid-table tbody tr:nth-child(even) {
      background-color: #f9f9f9;
    }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      border: 1px solid #000;
      font-size: 9pt;
      margin-right: 5px;
      margin-bottom: 5px;
    }

    .badge.success {
      background-color: #d4edda;
      color: #155724;
    }

    .badge.draft {
      background-color: #e2e3e5;
      color: #383d41;
    }

    ul, ol {
      margin-left: 20px;
      margin-bottom: 10px;
    }

    li {
      margin-bottom: 5px;
    }

    .action-item {
      border-left: 4px solid #0066cc;
      padding-left: 10px;
      margin: 10px 0;
      page-break-inside: avoid;
    }

    .action-item p {
      margin: 2px 0;
      font-size: 10pt;
    }

    .card {
      border: 1px solid #ddd;
      padding: 12px;
      margin: 15px 0;
      page-break-inside: avoid;
      background-color: #fafafa;
    }

    .card h4 {
      margin-top: 0;
    }

    .document-footer {
      margin-top: 40px;
      padding-top: 10px;
      border-top: 1px solid #ccc;
      font-size: 8pt;
      text-align: center;
      color: #666;
      page-break-inside: avoid;
    }

    img {
      max-width: 100%;
      height: auto;
      page-break-inside: avoid;
      margin: 10px 0;
    }

    .metadata {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      margin: 10px 0;
      font-size: 9pt;
    }

    .metadata-item {
      page-break-inside: avoid;
    }

    .metadata-item strong {
      display: block;
      font-weight: bold;
      margin-bottom: 2px;
    }
  </style>
</head>
<body>
  <div class="document">
    <div class="document-header">
      <h1>GESTÃO DE PROCESSOS</h1>
      <p>Ata de Atendimento - Aceleração de Oficinas</p>
    </div>

    <div class="document-content">
      <div class="section-block">
        <div class="metadata">
          <div class="metadata-item">
            <strong>Código:</strong>
            ${d.code || '-'}
          </div>
          <div class="metadata-item">
            <strong>Data/Hora:</strong>
            ${d.meeting_date ? new Date(d.meeting_date).toLocaleDateString('pt-BR') : '-'} / ${d.meeting_time || '00:00'}
          </div>
          <div class="metadata-item">
            <strong>Status:</strong>
            <span class="badge ${d.status === 'finalizada' ? 'success' : 'draft'}">
              ${d.status === 'finalizada' ? 'Finalizada' : 'Rascunho'}
            </span>
          </div>
        </div>
      </div>

      ${d.tipo_aceleracao ? `
      <div class="section-block" style="border-left: 4px solid #dc3545; padding-left: 10px;">
        <p><strong>Tipo de Aceleração:</strong> <span style="text-transform: uppercase; color: #dc3545;">${d.tipo_aceleracao}</span></p>
      </div>
      ` : ''}

      ${renderSection('1', 'PAUTAS', d.pautas, d.pauta)}
      ${renderSection('2', 'OBJETIVOS DO ATENDIMENTO', d.objetivos_atendimento, d.objetivos)}
      ${renderSection('3', 'OBSERVAÇÕES E OBJETIVOS DO CONSULTOR', d.objetivos_consultor || d.observacoes_consultor)}
      ${renderProximosPassos(d.proximos_passos_list, d.proximos_passos)}
      ${renderAIaSummary(d.ata_ia)}
      ${renderDecisoes(d.decisoes_tomadas)}
      ${renderAcoes(d.acoes_geradas)}
      ${renderProcessos(d.processos_vinculados)}
      ${renderVideoaulas(d.videoaulas_vinculadas)}
      ${renderChecklistDiagnostico(d.checklist_respostas)}
      ${renderClientIntelligence(d.client_intelligence)}
      ${renderWorkshopData(workshop)}
    </div>

    <div class="document-footer">
      <p>© 2026 Oficinas Master • ${d.code || 'ATA'} • ${d.meeting_date ? new Date(d.meeting_date).toLocaleDateString('pt-BR') : ''}</p>
      <p>Documento gerado automaticamente pela Plataforma de Aceleração de Oficinas</p>
    </div>
  </div>
</body>
</html>
  `;
}

function renderSection(num, title, content, items) {
  if (!content && (!items || items.length === 0)) return '';

  return `
    <div class="section-block">
      <h2>${num}. ${title}</h2>
      ${content ? `<p>${content}</p>` : ''}
      ${items && items.length > 0 ? `
        <ul>
          ${items.map(item => {
            const text = typeof item === 'string' ? item : item.titulo || item;
            return `<li>${text}</li>`;
          }).join('')}
        </ul>
      ` : ''}
    </div>
  `;
}

function renderProximosPassos(list, text) {
  if (!list && !text) return '';

  return `
    <div class="section-block">
      <h2>4. PRÓXIMOS PASSOS</h2>
      ${list && list.length > 0 ? `
        <div>
          ${list.map(passo => `
            <div class="action-item">
              <p><strong>${passo.descricao}</strong></p>
              ${passo.responsavel ? `<p>Responsável: ${passo.responsavel}</p>` : ''}
              ${passo.prazo ? `<p>Prazo: ${passo.prazo}</p>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${text ? `<p>${text}</p>` : ''}
    </div>
  `;
}

function renderAIaSummary(content) {
  if (!content) return '';

  return `
    <div class="section-block card" style="background-color: #f0f7ff; border-left: 4px solid #0066cc;">
      <h2>5. RESUMO EXECUTIVO (IA)</h2>
      <p style="font-style: italic; color: #666; margin-bottom: 10px;">Informações geradas automaticamente pela Inteligência Artificial</p>
      <p>${content}</p>
    </div>
  `;
}

function renderDecisoes(decisoes) {
  if (!decisoes || decisoes.length === 0) return '';

  return `
    <div class="section-block">
      <h2>6. DECISÕES TOMADAS</h2>
      ${decisoes.map((dec, i) => `
        <div class="action-item">
          <p><strong>${dec.decisao}</strong></p>
          ${dec.responsavel ? `<p>Responsável: ${dec.responsavel}</p>` : ''}
          ${dec.prazo ? `<p>Prazo: ${dec.prazo}</p>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function renderAcoes(acoes) {
  if (!acoes || acoes.length === 0) return '';

  return `
    <div class="section-block">
      <h2>7. AÇÕES DE ACOMPANHAMENTO</h2>
      ${acoes.map((acao, i) => `
        <div class="action-item">
          <p><strong>${acao.acao}</strong></p>
          ${acao.responsavel ? `<p>Responsável: ${acao.responsavel}</p>` : ''}
          ${acao.prazo ? `<p>Prazo: ${acao.prazo}</p>` : ''}
          ${acao.status ? `<p>Status: ${acao.status}</p>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function renderProcessos(processos) {
  if (!processos || processos.length === 0) return '';

  return `
    <div class="section-block">
      <h2>8. PROCESSOS COMPARTILHADOS</h2>
      ${processos.map(proc => `
        <div class="action-item">
          <p><strong>${proc.titulo}</strong></p>
          <p>Categoria: ${proc.categoria}</p>
        </div>
      `).join('')}
    </div>
  `;
}

function renderVideoaulas(videoaulas) {
  if (!videoaulas || videoaulas.length === 0) return '';

  return `
    <div class="section-block">
      <h2>9. VIDEOAULAS RECOMENDADAS</h2>
      ${videoaulas.map(video => `
        <div class="card">
          <h4>${video.titulo}</h4>
          <p>${video.descricao}</p>
        </div>
      `).join('')}
    </div>
  `;
}

function renderChecklistDiagnostico(checklists) {
  if (!checklists || checklists.length === 0) return '';

  return `
    <div class="section-block">
      <h2>10. CHECKLIST DE DIAGNÓSTICO</h2>
      ${checklists.map(bloco => `
        <div class="card">
          <h4>${bloco.template_nome || 'Checklist'}</h4>
          ${bloco.perguntas ? bloco.perguntas.map(p => `
            <div style="margin: 8px 0; page-break-inside: avoid;">
              <p><strong>${p.pergunta_texto}</strong></p>
              ${p.resposta_atual ? `<p>Atual: ${p.resposta_atual}</p>` : ''}
              ${p.resposta_meta ? `<p>Meta: ${p.resposta_meta}</p>` : ''}
            </div>
          `).join('') : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function renderClientIntelligence(intel) {
  if (!intel || intel.length === 0) return '';

  return `
    <div class="section-block">
      <h2>11. INTELIGÊNCIA DO CLIENTE</h2>
      ${intel.map(item => `
        <div class="action-item">
          <p><strong>${item.area} - ${item.type}</strong></p>
          <p>${item.subcategory}</p>
          ${item.description ? `<p>${item.description}</p>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function renderWorkshopData(workshop) {
  if (!workshop) return '';

  return `
    <div class="section-block">
      <h2>DADOS DA OFICINA CLIENTE</h2>
      <table class="grid-table">
        <tr>
          <td><strong>Nome:</strong></td>
          <td>${workshop.name}</td>
        </tr>
        <tr>
          <td><strong>CNPJ:</strong></td>
          <td>${workshop.cnpj || 'Não informado'}</td>
        </tr>
        <tr>
          <td><strong>Localização:</strong></td>
          <td>${workshop.city} / ${workshop.state}</td>
        </tr>
        <tr>
          <td><strong>Plano:</strong></td>
          <td>${workshop.planoAtual || 'FREE'}</td>
        </tr>
      </table>
    </div>
  `;
}
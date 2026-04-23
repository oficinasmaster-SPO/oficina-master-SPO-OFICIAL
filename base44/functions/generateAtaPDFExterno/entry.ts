import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error(`[PDF-External] Não autenticado`);
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[PDF-External] Usuário autenticado: ${user.email}`);

    const { ata_id } = await req.json();

    if (!ata_id) {
      console.error(`[PDF-External] ata_id não fornecido`);
      return Response.json({ error: 'ata_id is required' }, { status: 400 });
    }

    console.log(`[PDF-External] Gerando PDF para ATA: ${ata_id}`);

    // Buscar dados da ATA
    const ata = await base44.entities.MeetingMinutes.get(ata_id);
    if (!ata) {
      console.error(`[PDF-External] ATA não encontrada: ${ata_id}`);
      return Response.json({ error: 'ATA not found', ata_id }, { status: 404 });
    }

    console.log(`[PDF-External] ATA carregada: ${ata.code}`);

    // Validação de conteúdo
    const hasContent = ata.pautas || ata.objetivos_atendimento || ata.objetivos_consultor || 
                       ata.proximos_passos_list?.length > 0 || ata.acoes_geradas?.length > 0;
    
    if (!hasContent) {
      console.warn(`[PDF-External] ATA sem conteúdo suficiente: ${ata_id}`);
      return Response.json({ 
        error: 'ATA sem dados suficientes para gerar PDF',
        details: 'Preencha pelo menos uma seção (Pautas, Objetivos, Próximos Passos ou Ações)'
      }, { status: 400 });
    }

    // Buscar workshop para contexto
    let workshop = null;
    if (ata.workshop_id) {
      try {
        workshop = await base44.entities.Workshop.get(ata.workshop_id);
        console.log(`[PDF-External] Workshop carregado: ${workshop?.name}`);
      } catch (e) {
        console.warn(`[PDF-External] Workshop não encontrado: ${e.message}`);
      }
    }

    // Gerar HTML da ATA
    console.log(`[PDF-External] Gerando HTML para envio ao serviço externo`);
    const htmlContent = generateAtaHTML(ata, workshop);
    console.log(`[PDF-External] HTML gerado: ${htmlContent.length} caracteres`);

    // Chamar serviço externo de PDF com retry
    console.log(`[PDF-External] Chamando serviço externo de geração de PDF`);
    const pdfServiceUrl = Deno.env.get('PDF_SERVICE_URL') || 'https://pdf-service2-production.up.railway.app/generate-pdf';
    
    let externalResponse = null;
    let lastError = null;
    const maxRetries = 2;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[PDF-External] Tentativa ${attempt + 1}/${maxRetries + 1} de contato com serviço externo`);
        
        const payloadJson = JSON.stringify({ 
          html: htmlContent,
          filename: `ATA-${ata.code || ata.id}.pdf`
        });
        
        console.log(`[PDF-External] Tamanho do payload: ${payloadJson.length} bytes`);
        
        externalResponse = await fetch(pdfServiceUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: payloadJson,
          signal: AbortSignal.timeout(60000) // 60 segundos timeout
        });
        
        if (externalResponse.ok) {
          console.log(`[PDF-External] Serviço respondeu com sucesso (status ${externalResponse.status})`);
          break;
        } else if (externalResponse.status >= 500 && attempt < maxRetries) {
          // Erro de servidor, tentar novamente
          const errorText = await externalResponse.text();
          lastError = `Status ${externalResponse.status}: ${errorText.substring(0, 200)}`;
          console.warn(`[PDF-External] Serviço retornou erro ${externalResponse.status}, tentando novamente...`);
          
          // Aguardar antes de retry
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        } else {
          // Erro de cliente ou último retry falhou
          const errorText = await externalResponse.text();
          lastError = `Status ${externalResponse.status}: ${errorText.substring(0, 200)}`;
          console.error(`[PDF-External] Serviço retornou erro: ${lastError}`);
          
          // Se é erro de cliente (4xx), não fazer retry
          if (externalResponse.status < 500 || attempt === maxRetries) {
            break;
          }
          
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
      } catch (fetchError) {
        lastError = fetchError.message;
        console.error(`[PDF-External] Erro ao conectar com serviço: ${lastError}`);
        
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
      }
    }

    if (!externalResponse || !externalResponse.ok) {
      console.error(`[PDF-External] Falha após ${maxRetries + 1} tentativas: ${lastError}`);
      return Response.json(
        { 
          error: 'Serviço de geração de PDF temporariamente indisponível. Tente novamente em alguns momentos.',
          details: lastError || 'Não foi possível conectar ao serviço'
        },
        { status: 503 } // Service Unavailable em vez de 502
      );
    }

    // Receber PDF do serviço externo
    const pdfBuffer = await externalResponse.arrayBuffer();
    console.log(`[PDF-External] PDF recebido: ${pdfBuffer.byteLength} bytes`);

    // Converter para base64
    const uint8Array = new Uint8Array(pdfBuffer);
    const base64PDF = btoa(String.fromCharCode(...uint8Array));

    console.log(`[PDF-External] Geração concluída com sucesso`);
    return Response.json({
      success: true,
      pdf: base64PDF,
      filename: `ATA-${ata.code || ata.id}.pdf`,
      size: pdfBuffer.byteLength
    });

  } catch (error) {
    console.error(`[PDF-External-Error] ========== ERRO NA GERAÇÃO ==========`);
    console.error(`[PDF-External-Error] Tipo: ${error.name}`);
    console.error(`[PDF-External-Error] Mensagem: ${error.message}`);
    console.error(`[PDF-External-Error] Stack: ${error.stack}`);

    let statusCode = 500;
    let userMessage = 'Erro ao gerar PDF';

    if (error.message?.includes('not found') || error.message?.includes('404')) {
      statusCode = 404;
      userMessage = 'ATA não encontrada';
    } else if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
      statusCode = 408;
      userMessage = 'Tempo limite excedido na geração do PDF';
    }

    return Response.json(
      { 
        error: userMessage,
        details: error.message,
        type: error.name || 'Unknown'
      },
      { status: statusCode }
    );
  }
});

/**
 * Gera HTML completo da ATA
 * SEM dependência de browser
 */
function generateAtaHTML(ata, workshop) {
  const sanitize = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const d = ata || {};

  // Processar participantes
  const participantes = Array.isArray(d.participantes) 
    ? d.participantes.map(p => 
        typeof p === 'string' ? p : `${p.name || ''} - ${p.role || ''}`
      ).filter(Boolean).join('<br>')
    : '';

  // Processar responsável
  const responsavel = typeof d.responsavel === 'string' 
    ? d.responsavel 
    : (d.responsavel?.name || 'Não informado');

  // Processar próximos passos
  const proximosPassos = Array.isArray(d.proximos_passos_list) && d.proximos_passos_list.length > 0
    ? d.proximos_passos_list
        .filter(p => p && p.descricao)
        .map(p => `
          <tr>
            <td>${sanitize(p.descricao)}</td>
            <td>${sanitize(p.responsavel || '-')}</td>
            <td>${sanitize(p.prazo || '-')}</td>
          </tr>
        `).join('')
    : '';

  // Processar ações
  const acoes = Array.isArray(d.acoes_geradas) && d.acoes_geradas.length > 0
    ? d.acoes_geradas
        .filter(a => a && a.acao)
        .map(a => `
          <tr>
            <td>${sanitize(a.acao)}</td>
            <td>${sanitize(a.responsavel || '-')}</td>
            <td>${sanitize(a.prazo || '-')}</td>
          </tr>
        `).join('')
    : '';

  // Processar decisões
  const decisoes = Array.isArray(d.decisoes_tomadas) && d.decisoes_tomadas.length > 0
    ? d.decisoes_tomadas
        .filter(dec => dec && dec.decisao)
        .map(dec => `
          <tr>
            <td>${sanitize(dec.decisao)}</td>
            <td>${sanitize(dec.responsavel || '-')}</td>
            <td>${sanitize(dec.prazo || '-')}</td>
          </tr>
        `).join('')
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ATA - ${sanitize(d.code || 'Sem código')}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html {
      width: 100%;
      background: white;
    }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #000;
      background: white;
      padding: 0;
      margin: 0;
      width: 100%;
    }

    @page {
      size: A4 portrait;
      margin: 20mm;
    }

    @media print {
      body { margin: 0; padding: 0; }
      .no-break { page-break-inside: avoid !important; break-inside: avoid !important; }
      .page-break { page-break-before: always !important; break-before: page !important; }
    }

    .document {
      position: relative;
      width: 100%;
      background: white;
      color: #000;
    }

    .document-header {
      border-bottom: 3px solid #cc0000;
      padding: 0 0 12px 0;
      margin-bottom: 20px;
      page-break-after: avoid;
    }

    .document-header h1 {
      font-size: 18pt;
      font-weight: bold;
      color: #000;
      margin-bottom: 3px;
    }

    .document-header p {
      font-size: 10pt;
      color: #333;
      margin: 0;
    }

    .header-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
      flex-wrap: wrap;
      gap: 15px;
      page-break-after: avoid;
    }

    .header-info-item {
      font-size: 10pt;
    }

    .header-info-item strong {
      display: inline-block;
      min-width: 80px;
    }

    .badge-status {
      display: inline-block;
      padding: 4px 12px;
      border: 2px solid #cc0000;
      background: white;
      color: #cc0000;
      font-weight: bold;
      font-size: 10pt;
      border-radius: 3px;
    }

    .section-title {
      font-size: 13pt;
      font-weight: bold;
      color: #000;
      margin-top: 18px;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 2px solid #333;
      page-break-after: avoid;
    }

    .section-content {
      font-size: 11pt;
      line-height: 1.6;
      margin-bottom: 15px;
      page-break-inside: avoid;
      color: #000;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 15px 0;
      page-break-inside: avoid;
      font-size: 10pt;
    }

    .info-table th {
      background-color: #e5e5e5;
      border: 1px solid #333;
      padding: 10px;
      text-align: left;
      font-weight: bold;
      color: #000;
    }

    .info-table td {
      border: 1px solid #999;
      padding: 10px;
      vertical-align: top;
      color: #000;
      background: white;
    }

    .info-table tbody tr:nth-child(even) td {
      background-color: #f5f5f5;
    }

    .accent-red {
      color: #cc0000;
      font-weight: bold;
      text-transform: uppercase;
    }

    .highlight-box {
      background-color: #f0f0f0;
      border-left: 4px solid #cc0000;
      padding: 10px;
      margin: 10px 0;
      page-break-inside: avoid;
    }

    .document-footer {
      border-top: 1px solid #ccc;
      padding: 15px 0 0 0;
      margin-top: 30px;
      font-size: 8pt;
      text-align: center;
      color: #666;
      page-break-before: avoid;
    }

    .document-footer p {
      margin: 3px 0;
    }

    strong { font-weight: bold; }
    em { font-style: italic; }
  </style>
</head>
<body>
  <div class="document">
    
    <!-- HEADER -->
    <div class="document-header">
      <h1>GESTÃO DE PROCESSOS</h1>
      <p>Ata de Atendimento - Aceleração de Oficinas</p>
      
      <div class="header-info">
        <div class="header-info-item">
          <strong>Código:</strong> ${sanitize(d.code || 'N/A')}
        </div>
        <div class="header-info-item">
          <strong>Data/Hora:</strong> ${d.meeting_date ? new Date(d.meeting_date).toLocaleDateString('pt-BR') : '-'} / ${sanitize(d.meeting_time || '00:00')}
        </div>
        <div>
          <span class="badge-status">${d.status === 'finalizada' ? '✓ FINALIZADA' : '● RASCUNHO'}</span>
        </div>
      </div>
    </div>

    <!-- TIPO ACELERAÇÃO -->
    ${d.tipo_aceleracao ? `
      <div class="highlight-box">
        <strong>Tipo de Aceleração:</strong> <span class="accent-red">${sanitize(d.tipo_aceleracao)}</span>
      </div>
    ` : ''}

    <!-- PARTICIPANTES / RESPONSÁVEL / PLANO -->
    <table class="info-table">
      <thead>
        <tr>
          <th>PARTICIPANTES</th>
          <th>RESPONSÁVEL</th>
          <th>PLANO</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${sanitize(participantes)}</td>
          <td>${sanitize(responsavel)}</td>
          <td>${sanitize(d.plano_nome || '-')}</td>
        </tr>
      </tbody>
    </table>

    <!-- SEÇÃO 1: PAUTAS -->
    ${d.pautas ? `
      <div class="section-title">1. PAUTAS</div>
      <div class="section-content">${sanitize(d.pautas)}</div>
    ` : ''}

    <!-- SEÇÃO 2: OBJETIVOS DO ATENDIMENTO -->
    ${d.objetivos_atendimento ? `
      <div class="section-title">2. OBJETIVOS DO ATENDIMENTO</div>
      <div class="section-content">${sanitize(d.objetivos_atendimento)}</div>
    ` : ''}

    <!-- SEÇÃO 3: OBSERVAÇÕES DO CONSULTOR -->
    ${d.objetivos_consultor ? `
      <div class="section-title">3. OBSERVAÇÕES E OBJETIVOS DO CONSULTOR</div>
      <div class="section-content">${sanitize(d.objetivos_consultor)}</div>
    ` : ''}

    <!-- SEÇÃO 4: PRÓXIMOS PASSOS -->
    ${proximosPassos ? `
      <div class="section-title">4. PRÓXIMOS PASSOS</div>
      <table class="info-table">
        <thead>
          <tr>
            <th>Ação</th>
            <th>Responsável</th>
            <th>Prazo</th>
          </tr>
        </thead>
        <tbody>
          ${proximosPassos}
        </tbody>
      </table>
    ` : ''}

    <!-- SEÇÃO 5: RESUMO EXECUTIVO (IA) -->
    ${d.ata_ia ? `
      <div class="section-title">5. RESUMO EXECUTIVO</div>
      <div class="highlight-box">
        ${sanitize(d.ata_ia)}
      </div>
    ` : ''}

    <!-- SEÇÃO 6: DECISÕES -->
    ${decisoes ? `
      <div class="section-title">6. DECISÕES TOMADAS</div>
      <table class="info-table">
        <thead>
          <tr>
            <th>Decisão</th>
            <th>Responsável</th>
            <th>Prazo</th>
          </tr>
        </thead>
        <tbody>
          ${decisoes}
        </tbody>
      </table>
    ` : ''}

    <!-- SEÇÃO 7: AÇÕES -->
    ${acoes ? `
      <div class="section-title">7. AÇÕES DE ACOMPANHAMENTO</div>
      <table class="info-table">
        <thead>
          <tr>
            <th>Ação</th>
            <th>Responsável</th>
            <th>Prazo</th>
          </tr>
        </thead>
        <tbody>
          ${acoes}
        </tbody>
      </table>
    ` : ''}

    <!-- DADOS DA OFICINA -->
    ${workshop ? `
      <div class="section-title">DADOS DA OFICINA CLIENTE</div>
      <table class="info-table">
        <thead>
          <tr>
            <th>Campo</th>
            <th>Informação</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Nome</strong></td>
            <td>${sanitize(workshop.name || '-')}</td>
          </tr>
          <tr>
            <td><strong>CNPJ</strong></td>
            <td>${sanitize(workshop.cnpj || '-')}</td>
          </tr>
          <tr>
            <td><strong>Localização</strong></td>
            <td>${sanitize(workshop.city || '-')} / ${sanitize(workshop.state || '-')}</td>
          </tr>
          <tr>
            <td><strong>Plano</strong></td>
            <td>${sanitize(workshop.planoAtual || 'FREE')}</td>
          </tr>
          ${workshop.employees_count ? `
            <tr>
              <td><strong>Colaboradores</strong></td>
              <td>${workshop.employees_count}</td>
            </tr>
          ` : ''}
        </tbody>
      </table>
    ` : ''}

    <!-- FOOTER -->
    <div class="document-footer">
      <p>© 2026 Oficinas Master • ${sanitize(d.code || 'ATA')} • ${d.meeting_date ? new Date(d.meeting_date).toLocaleDateString('pt-BR') : 'Data N/A'}</p>
      <p>Documento gerado automaticamente pela Plataforma de Aceleração de Oficinas</p>
      <p><em>Geração via serviço externo - Infraestrutura escalável</em></p>
    </div>

  </div>
</body>
</html>`;
}
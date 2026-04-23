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
    const pdfServiceUrl = Deno.env.get('PDF_SERVICE_URL') || 'https://pdf-service-production-37e0.up.railway.app/generate-pdf';
    
    let externalResponse = null;
    let lastError = null;
    const maxRetries = 2;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[PDF-External] Tentativa ${attempt + 1}/${maxRetries + 1} de contato com serviço externo`);
        
        const meetingDate = ata.meeting_date ? new Date(ata.meeting_date) : new Date();
        const ddmmyyyy = String(meetingDate.getDate()).padStart(2, '0') + 
                         String(meetingDate.getMonth() + 1).padStart(2, '0') + 
                         String(meetingDate.getFullYear());
        
        const payloadJson = JSON.stringify({ 
          html: htmlContent,
          filename: `${workshop?.name || 'Oficina'}_${ddmmyyyy}.pdf`
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

    // Converter para base64 (seguro para arquivos grandes)
    const uint8Array = new Uint8Array(pdfBuffer);
    let base64PDF = '';
    const chunkSize = 8192; // Processar em chunks para evitar stack overflow
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      base64PDF += btoa(String.fromCharCode(...chunk));
    }

    console.log(`[PDF-External] Geração concluída com sucesso`);
    const meetingDate = ata.meeting_date ? new Date(ata.meeting_date) : new Date();
    const ddmmyyyy = String(meetingDate.getDate()).padStart(2, '0') + 
                     String(meetingDate.getMonth() + 1).padStart(2, '0') + 
                     String(meetingDate.getFullYear());

    return Response.json({
      success: true,
      pdf: base64PDF,
      filename: `${workshop?.name || 'Oficina'}_${ddmmyyyy}.pdf`,
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

  const formatSectionText = (text) => {
    if (!text) return '';
    const sanitized = sanitize(text);
    
    // Dividir por quebras de linha e criar parágrafos ou listas
    const lines = sanitized.split(/\n|<br\s*\/?>/gi).filter(line => line.trim());
    
    // Se tem múltiplas linhas que parecem ser itens de lista, usar <ul>
    if (lines.length > 1 && lines.some(line => /^[-•*]\s/.test(line.trim()))) {
      const items = lines.map(line => {
        const cleaned = line.replace(/^[-•*]\s+/, '').trim();
        return `<li>${cleaned}</li>`;
      }).join('');
      return `<ul>${items}</ul>`;
    }
    
    // Caso contrário, criar parágrafos semânticos
    return lines.map(line => `<p>${line.trim()}</p>`).join('');
  };

  const d = ata || {};

  // Processar participantes
  const participantes = Array.isArray(d.participantes) 
    ? d.participantes.map(p => 
        typeof p === 'string' ? sanitize(p) : `${sanitize(p.name || '')} - ${sanitize(p.role || '')}`
      ).filter(Boolean).map(p => `<li>${p}</li>`).join('')
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
      font-family: 'Arial', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1a1a1a;
      background: white;
      padding: 20mm;
      margin: 0;
      width: 100%;
    }

    @page {
      size: A4 portrait;
      margin: 20mm;
    }

    @media print {
      body { margin: 0; padding: 20mm; }
      .no-break { page-break-inside: avoid !important; break-inside: avoid !important; }
      .page-break { page-break-before: always !important; break-before: page !important; }
    }

    .document {
      position: relative;
      width: 100%;
      background: white;
      color: #1a1a1a;
    }

    .section {
      margin-top: 24px;
      margin-bottom: 16px;
    }

    .card {
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 16px;
      background: #fafafa;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }

    .document-header {
      border-bottom: 3px solid #CC0000;
      padding-bottom: 16px;
      margin-bottom: 24px;
      page-break-after: avoid;
    }

    .document-header h1 {
      font-size: 20px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0 0 8px 0;
      text-align: center;
    }

    .document-header p {
      font-size: 13px;
      color: #666;
      margin: 0;
      text-align: center;
    }

    .header-info {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 12px;
      flex-wrap: wrap;
      gap: 12px;
      page-break-after: avoid;
    }

    .header-info-item {
      font-size: 13px;
      flex: 1;
      min-width: 150px;
    }

    .header-info-item strong {
      display: block;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .badge-status {
      display: inline-block;
      padding: 6px 12px;
      border: 2px solid #CC0000;
      background: white;
      color: #CC0000;
      font-weight: 700;
      font-size: 12px;
      border-radius: 4px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #1a1a1a;
      margin-top: 20px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #CC0000;
      page-break-after: avoid;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .section-content {
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 12px;
      page-break-inside: avoid;
      color: #1a1a1a;
    }

    .section-content p {
      margin: 0 0 10px 0;
    }

    .section-content ul,
    .section-content ol {
      margin: 10px 0;
      padding-left: 20px;
    }

    .section-content li {
      margin-bottom: 6px;
      line-height: 1.6;
    }

    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px 0;
      page-break-inside: avoid;
      font-size: 13px;
      background: white;
    }

    .info-table th {
      background-color: #CC0000;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 700;
      font-size: 13px;
      border: none;
    }

    .info-table td {
      border: 1px solid #e5e5e5;
      padding: 12px;
      vertical-align: top;
      color: #1a1a1a;
      font-size: 13px;
      background: white;
    }

    .info-table tbody tr:nth-child(even) td {
      background-color: #f9f9f9;
    }

    .accent-red {
      color: #CC0000;
      font-weight: 700;
      text-transform: uppercase;
    }

    .highlight-box {
      background-color: #f5f5f5;
      border-left: 4px solid #CC0000;
      padding: 12px;
      margin: 12px 0;
      page-break-inside: avoid;
      border-radius: 4px;
    }

    .document-footer {
      border-top: 1px solid #ccc;
      padding-top: 16px;
      margin-top: 32px;
      font-size: 11px;
      text-align: center;
      color: #666;
      page-break-before: avoid;
    }

    .document-footer p {
      margin: 4px 0;
    }

    p { margin: 0 0 10px 0; }
    strong { font-weight: 700; }
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
       <div class="section">
         <div class="card">
           <strong>Tipo de Aceleração:</strong> <span class="accent-red">${sanitize(d.tipo_aceleracao)}</span>
         </div>
       </div>
     ` : ''}

    <!-- PARTICIPANTES / RESPONSÁVEL / PLANO -->
    <div class="section">
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
            <td>${participantes ? `<ul>${participantes}</ul>` : '-'}</td>
            <td>${sanitize(responsavel)}</td>
            <td>${sanitize(d.plano_nome || '-')}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- SEÇÃO 1: PAUTAS -->
     ${d.pautas ? `
       <div class="section">
         <h2 class="section-title">1. PAUTAS</h2>
         <div class="card">
           <div class="section-content">${formatSectionText(d.pautas)}</div>
         </div>
       </div>
     ` : ''}

    <!-- SEÇÃO 2: OBJETIVOS DO ATENDIMENTO -->
     ${d.objetivos_atendimento ? `
       <div class="section">
         <h2 class="section-title">2. OBJETIVOS DO ATENDIMENTO</h2>
         <div class="card">
           <div class="section-content">${formatSectionText(d.objetivos_atendimento)}</div>
         </div>
       </div>
     ` : ''}

    <!-- SEÇÃO 3: OBSERVAÇÕES DO CONSULTOR -->
     ${d.objetivos_consultor ? `
       <div class="section">
         <h2 class="section-title">3. OBSERVAÇÕES E OBJETIVOS DO CONSULTOR</h2>
         <div class="card">
           <div class="section-content">${formatSectionText(d.objetivos_consultor)}</div>
         </div>
       </div>
     ` : ''}

    <!-- SEÇÃO 4: PRÓXIMOS PASSOS -->
     ${proximosPassos ? `
       <div class="section">
         <h2 class="section-title">4. PRÓXIMOS PASSOS</h2>
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
       </div>
     ` : ''}

    <!-- SEÇÃO 5: RESUMO EXECUTIVO (IA) -->
     ${d.ata_ia ? `
       <div class="section">
         <h2 class="section-title">5. RESUMO EXECUTIVO</h2>
         <div class="highlight-box">
           <div class="section-content">${formatSectionText(d.ata_ia)}</div>
         </div>
       </div>
     ` : ''}

    <!-- SEÇÃO 6: DECISÕES -->
     ${decisoes ? `
       <div class="section">
         <h2 class="section-title">6. DECISÕES TOMADAS</h2>
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
       </div>
     ` : ''}

    <!-- SEÇÃO 7: AÇÕES -->
     ${acoes ? `
       <div class="section">
         <h2 class="section-title">7. AÇÕES DE ACOMPANHAMENTO</h2>
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
       </div>
     ` : ''}

    <!-- DADOS DA OFICINA -->
     ${workshop ? `
       <div class="section">
         <h2 class="section-title">DADOS DA OFICINA CLIENTE</h2>
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
       </div>
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
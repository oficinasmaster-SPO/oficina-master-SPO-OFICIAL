/**
 * Gera HTML do processo para ser enviado ao serviço externo de PDF
 * Substitui ProcessPDFGenerator com chamada ao serviço Railroad
 */
export function generateProcessHTML(processDoc, its = [], workshop) {
  const content = processDoc?.content_json || {};

  const sanitize = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const itsHTML = its
    .map(
      (it) => `
      <div style="page-break-before: always; padding-top: 20px;">
        <div style="background-color: ${it.type === 'IT' ? '#16a34a' : '#ea580c'}; color: white; padding: 10px; margin-bottom: 12px;">
          <strong style="font-size: 12pt;">${sanitize(it.type)}</strong>
        </div>
        
        <h2 style="text-align: center; font-size: 14pt; margin: 10px 0;">${sanitize(it.title)}</h2>
        ${
          it.description
            ? `<p style="text-align: center; font-size: 10pt; color: #666; margin: 5px 0;">${sanitize(it.description)}</p>`
            : ''
        }
        <p style="text-align: center; font-size: 9pt; margin: 10px 0;">
          <strong>Código:</strong> ${sanitize(it.code)} | 
          <strong>Versão:</strong> ${it.version || '1'} | 
          <strong>Status:</strong> ${sanitize(it.status || 'ativo')}
        </p>
        
        <hr style="border: none; border-top: 1px solid #333; margin: 10px 0;">
        
        <h3 style="font-size: 12pt; font-weight: bold; margin-top: 15px;">1. Objetivo</h3>
        <p>${sanitize(it.content?.objetivo || 'Não definido.')}</p>
        
        <h3 style="font-size: 12pt; font-weight: bold; margin-top: 15px;">2. Campo de Aplicação</h3>
        <p>${sanitize(it.content?.campo_aplicacao || 'Não definido.')}</p>
        
        ${
          it.content?.informacoes_complementares
            ? `
            <h3 style="font-size: 12pt; font-weight: bold; margin-top: 15px;">3. Informações Complementares</h3>
            <p>${sanitize(it.content.informacoes_complementares)}</p>
            `
            : ''
        }
        
        ${
          it.content?.fluxo_descricao
            ? `
            <h3 style="font-size: 12pt; font-weight: bold; margin-top: 15px;">4. Fluxo de Execução</h3>
            <p>${sanitize(it.content.fluxo_descricao)}</p>
            `
            : ''
        }
      </div>
      `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MAPA - ${sanitize(processDoc.title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1a1a1a;
      background: white;
      padding: 32px;
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
      color: #000;
    }

    .document-header {
       border-bottom: 3px solid #CC0000;
       padding: 0 0 12px 0;
       margin-bottom: 20px;
       page-break-after: avoid;
       text-align: center;
     }

    .document-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a1a;
      text-align: center;
      margin-bottom: 4px;
    }

    .document-header h2 {
      font-size: 13px;
      font-weight: normal;
      color: #666;
      text-align: center;
      margin-bottom: 10px;
    }

    .header-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
      flex-wrap: wrap;
      gap: 15px;
      page-break-after: avoid;
      font-size: 13px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #1a1a1a;
      margin-top: 18px;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 2px solid #333;
      page-break-after: avoid;
    }

    .section-content {
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 15px;
      page-break-inside: avoid;
      color: #1a1a1a;
      white-space: normal;
      word-wrap: break-word;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 15px 0;
      page-break-inside: avoid;
      font-size: 10pt;
    }

    table th {
      background-color: #CC0000;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 700;
      font-size: 13px;
      border: none;
    }

    table td {
      border: 1px solid #e5e5e5;
      padding: 12px;
      vertical-align: top;
      color: #1a1a1a;
      font-size: 13px;
      background: white;
    }

    table tbody tr:nth-child(even) td {
      background-color: #f5f5f5;
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

    h3 {
      font-size: 13px;
      font-weight: 700;
      margin-top: 15px;
      margin-bottom: 8px;
      color: #1a1a1a;
    }

    p {
      margin: 0 0 8px 0;
      color: #1a1a1a;
    }

    hr {
      border: none;
      border-top: 1px solid #333;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="document">
    
    <!-- HEADER -->
    <div class="document-header">
      <h1>MAPA DA AUTO GESTÃO DO PROCESSO</h1>
      <h2>${sanitize(processDoc.title)}</h2>
      
      <div class="header-info">
        <div>
          <strong>Código:</strong> ${sanitize(processDoc.code || 'MAP-0000')}
        </div>
        <div>
          <strong>Versão:</strong> ${sanitize(processDoc.revision || '1')}
        </div>
        <div>
          <strong>Status:</strong> ${sanitize(processDoc.status || 'ativo')}
        </div>
      </div>
    </div>

    <!-- SEÇÃO 1: OBJETIVO -->
    <div class="section-title">1. OBJETIVO</div>
    <div class="section-content">${sanitize(content.objetivo || 'Não definido.')}</div>

    <!-- SEÇÃO 2: CAMPO DE APLICAÇÃO -->
    <div class="section-title">2. CAMPO DE APLICAÇÃO</div>
    <div class="section-content">${sanitize(content.campo_aplicacao || 'Não definido.')}</div>

    <!-- SEÇÃO 3: INFORMAÇÕES COMPLEMENTARES -->
    ${
      content.informacoes_complementares
        ? `
    <div class="section-title">3. INFORMAÇÕES COMPLEMENTARES</div>
    <div class="section-content">${sanitize(content.informacoes_complementares)}</div>
    `
        : ''
    }

    <!-- SEÇÃO 4: FLUXO DO PROCESSO -->
    ${
      content.fluxo_processo
        ? `
    <div class="section-title">4. FLUXO DO PROCESSO</div>
    <div class="section-content">${sanitize(content.fluxo_processo)}</div>
    `
        : ''
    }

    <!-- SEÇÃO 5: ATIVIDADES E RESPONSABILIDADES -->
    ${
      content.atividades && content.atividades.length > 0
        ? `
    <div class="section-title">5. ATIVIDADES E RESPONSABILIDADES</div>
    <table>
      <thead>
        <tr>
          <th>Atividade</th>
          <th>Responsável</th>
          <th>Ferramentas/Documentos</th>
        </tr>
      </thead>
      <tbody>
        ${content.atividades
          .map(
            (item) => `
        <tr>
          <td>${sanitize(item.atividade || '')}</td>
          <td>${sanitize(item.responsavel || '')}</td>
          <td>${sanitize(item.ferramentas || '')}</td>
        </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
    `
        : ''
    }

    <!-- SEÇÃO 6: MATRIZ DE RISCOS -->
    ${
      content.matriz_riscos && content.matriz_riscos.length > 0
        ? `
    <div class="section-title">6. MATRIZ DE RISCOS</div>
    <table>
      <thead>
        <tr>
          <th>Risco</th>
          <th>Fonte</th>
          <th>Impacto</th>
          <th>Categoria</th>
          <th>Controle</th>
        </tr>
      </thead>
      <tbody>
        ${content.matriz_riscos
          .map(
            (item) => `
        <tr>
          <td>${sanitize(item.identificacao || '')}</td>
          <td>${sanitize(item.fonte || '')}</td>
          <td>${sanitize(item.impacto || '')}</td>
          <td>${sanitize(item.categoria || '')}</td>
          <td>${sanitize(item.controle || '')}</td>
        </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
    `
        : ''
    }

    <!-- SEÇÃO 7: INTER-RELAÇÕES -->
    ${
      content.inter_relacoes && content.inter_relacoes.length > 0
        ? `
    <div class="section-title">7. INTER-RELAÇÃO ENTRE ÁREAS</div>
    <table>
      <thead>
        <tr>
          <th>Área</th>
          <th>Interação</th>
        </tr>
      </thead>
      <tbody>
        ${content.inter_relacoes
          .map(
            (item) => `
        <tr>
          <td>${sanitize(item.area || '')}</td>
          <td>${sanitize(item.interacao || '')}</td>
        </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
    `
        : ''
    }

    <!-- SEÇÃO 8: INDICADORES -->
    ${
      content.indicadores && content.indicadores.length > 0
        ? `
    <div class="section-title">8. INDICADORES DE DESEMPENHO</div>
    <table>
      <thead>
        <tr>
          <th>Indicador</th>
          <th>Meta</th>
          <th>Como Medir</th>
        </tr>
      </thead>
      <tbody>
        ${content.indicadores
          .map(
            (item) => `
        <tr>
          <td>${sanitize(item.indicador || '')}</td>
          <td>${sanitize(item.meta || '')}</td>
          <td>${sanitize(item.como_medir || '')}</td>
        </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
    `
        : ''
    }

    <!-- ITs/FRs -->
    ${itsHTML}

    <!-- FOOTER -->
    <div class="document-footer">
      <p>© 2026 Oficinas Master • ${sanitize(processDoc.code || 'MAPA')}</p>
      <p>Documento gerado automaticamente pela Plataforma de Aceleração de Oficinas</p>
      <p><em>Geração via serviço externo - Infraestrutura escalável</em></p>
    </div>

  </div>
</body>
</html>`;
}
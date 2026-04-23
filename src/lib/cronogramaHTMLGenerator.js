/**
 * Gera HTML do cronograma para ser enviado ao serviço externo de PDF
 * Substitui CronogramaPDFGenerator com chamada ao serviço Railroad
 */
export function generateCronogramaHTML(cronogramaData, workshop) {
  const { stats, items, planName } = cronogramaData;
  
  const statusCores = {
    a_fazer: '#9CA3AF',
    em_andamento: '#3B82F6',
    concluido: '#22C55E'
  };

  const statusLabels = {
    a_fazer: 'A Fazer',
    em_andamento: 'Em Andamento',
    concluido: 'Concluído'
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  const sanitize = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const total = stats?.total || 0;
  const concluidos = stats?.concluidos || 0;
  const emAndamento = stats?.em_andamento || 0;
  const atrasados = stats?.atrasados || 0;

  const tableRows = items
    .map(item => {
      const diasAtraso = item.status === 'concluido' || !item.data_termino_previsto 
        ? '-' 
        : (() => {
            const hoje = new Date();
            const termino = new Date(item.data_termino_previsto);
            const diff = Math.floor((hoje - termino) / (1000 * 60 * 60 * 24));
            return diff > 0 ? `${diff}d` : '-';
          })();

      return `
        <tr>
          <td>${sanitize(item.item_nome || '-')}</td>
          <td>${item.data_inicio_real ? formatDate(item.data_inicio_real) : '-'}</td>
          <td>${item.data_termino_previsto ? formatDate(item.data_termino_previsto) : '-'}</td>
          <td>${item.data_termino_real ? formatDate(item.data_termino_real) : '-'}</td>
          <td style="background-color: ${statusCores[item.status] || '#999'}; color: white; text-align: center;">
            ${sanitize(statusLabels[item.status] || item.status)}
          </td>
          <td>${diasAtraso}</td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cronograma - ${sanitize(workshop?.name || 'Oficina')}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
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
      size: A4 landscape;
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

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin: 15px 0;
    }

    .stat-card {
       padding: 12px;
       border-radius: 0;
       text-align: center;
       page-break-inside: avoid;
       border: 1px solid #999;
     }

    .stat-card h3 {
      font-size: 10pt;
      color: #666;
      margin-bottom: 5px;
    }

    .stat-card .value {
      font-size: 18pt;
      font-weight: bold;
    }

    .stat-concluido { background-color: #DBEAFE; border-left: 4px solid #22C55E; }
    .stat-andamento { background-color: #DBEAFE; border-left: 4px solid #3B82F6; }
    .stat-atrasado { background-color: #FEE2E2; border-left: 4px solid #EF4444; }
    .stat-total { background-color: #F3F4F6; border-left: 4px solid #6B7280; }

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
      border: 1px solid #333;
      padding: 10px;
      text-align: left;
      font-weight: bold;
    }

    table td {
      border: 1px solid #999;
      padding: 10px;
      vertical-align: top;
      color: #000;
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
  </style>
</head>
<body>
  <div class="document">
    
    <!-- HEADER -->
    <div class="document-header">
      <h1>RELATÓRIO DO CRONOGRAMA</h1>
      <p>Cronograma de Implementação - Aceleração de Oficinas</p>
      
      <div class="header-info">
        <div class="header-info-item">
          <strong>Oficina:</strong> ${sanitize(workshop?.name || 'N/A')}
        </div>
        <div class="header-info-item">
          <strong>Plano:</strong> ${sanitize(planName || 'N/A')}
        </div>
        <div class="header-info-item">
          <strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}
        </div>
      </div>
    </div>

    <!-- ESTATÍSTICAS -->
    <div class="section-title">ANÁLISE VISUAL DO CRONOGRAMA</div>
    <div class="stats-grid">
      <div class="stat-card stat-concluido">
        <h3>Concluídos</h3>
        <div class="value">${concluidos}</div>
      </div>
      <div class="stat-card stat-andamento">
        <h3>Em Andamento</h3>
        <div class="value">${emAndamento}</div>
      </div>
      <div class="stat-card stat-atrasado">
        <h3>Atrasados</h3>
        <div class="value">${atrasados}</div>
      </div>
      <div class="stat-card stat-total">
        <h3>Total</h3>
        <div class="value">${total}</div>
      </div>
    </div>

    <!-- TABELA DE CRONOGRAMA -->
    <div class="section-title">CHECKPOINT / CRONOGRAMA</div>
    <table>
      <thead>
        <tr>
          <th>Programa / Conteúdo</th>
          <th>Início Real</th>
          <th>Término Previsto</th>
          <th>Término Real</th>
          <th>Status</th>
          <th>Atraso</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <!-- FOOTER -->
    <div class="document-footer">
      <p>© 2026 Oficinas Master • Cronograma de Implementação</p>
      <p>Documento gerado automaticamente pela Plataforma de Aceleração de Oficinas</p>
      <p><em>Geração via serviço externo - Infraestrutura escalável</em></p>
    </div>

  </div>
</body>
</html>`;
}
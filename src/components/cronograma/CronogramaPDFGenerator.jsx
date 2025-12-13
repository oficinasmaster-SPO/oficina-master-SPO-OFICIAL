import jsPDF from "jspdf";

export const generateCronogramaPDF = (cronogramaData, workshop, mode = 'download', options = {}) => {
  const { stats, items, planName } = cronogramaData;
  const { customNotes = '', includeContactInfo = true, contactInfo = {} } = options;
  
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  let yPosition = 20;

  // === CABEÇALHO PERSONALIZADO ===
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Logo da oficina (se disponível)
  if (workshop.logo_url) {
    try {
      doc.addImage(workshop.logo_url, 'PNG', 15, 8, 25, 25);
    } catch (error) {
      console.log('Logo não disponível');
    }
  }
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('Relatório do Cronograma de Implementação', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(`${workshop.name} - Plano ${planName}`, pageWidth / 2, 25, { align: 'center' });
  doc.setFontSize(9);
  doc.text(
    `${workshop.city || ''}, ${workshop.state || ''} | Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
    pageWidth / 2,
    32,
    { align: 'center' }
  );
  
  yPosition = 50;

  // === RESUMO EXECUTIVO ===
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Resumo Executivo', 14, yPosition);
  yPosition += 10;

  // Tabela de resumo manual
  drawTable(doc, 14, yPosition, [
    ['Indicador', 'Quantidade'],
    ['Total de Itens', stats.total.toString()],
    ['Itens Concluídos', stats.concluidos.toString()],
    ['Itens em Andamento', stats.em_andamento.toString()],
    ['Itens Atrasados', stats.atrasados.toString()],
    ['Itens Não Iniciados', (stats.total - stats.concluidos - stats.em_andamento).toString()]
  ], [100, 50], true);

  yPosition += 80;

  // === CHECKPOINT DO CRONOGRAMA ===
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(`CheckPoint / Cronograma do Plano ${planName}`, 14, yPosition);
  yPosition += 10;

  // Tabela de cronograma manual com paginação automática
  const tableHeaders = ['Atividade', 'Início Previsto', 'Início Real', 'Término Previsto', 'Término Real', 'Status', 'Atraso', 'Detalhes'];
  const tableData = items.map(item => {
    const diasAtraso = getDiasAtraso(item);
    const ultimaAtualizacao = getUltimaAtualizacao(item);
    
    return [
      truncateText(item.item_nome || '-', 20),
      item.data_inicio_real ? formatDate(new Date(new Date(item.data_inicio_real).setDate(new Date(item.data_inicio_real).getDate() - 1))) : '-',
      item.data_inicio_real ? formatDate(item.data_inicio_real) : '-',
      item.data_termino_previsto ? formatDate(item.data_termino_previsto) : '-',
      item.data_termino_real ? formatDate(item.data_termino_real) : '-',
      getStatusLabel(item.status),
      diasAtraso,
      ultimaAtualizacao
    ];
  });

  yPosition = drawTableWithPagination(doc, 14, yPosition, tableHeaders, tableData, [55, 25, 25, 28, 28, 25, 20, 35], pageHeight);
  yPosition += 15;

  // === NOTAS PERSONALIZADAS ===
  if (customNotes) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFillColor(255, 250, 230);
    doc.rect(14, yPosition, pageWidth - 28, 0, 'F');
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Observações e Comentários', 14, yPosition + 7);
    
    yPosition += 12;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    const lines = doc.splitTextToSize(customNotes, pageWidth - 35);
    lines.forEach((line) => {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 17, yPosition);
      yPosition += 5;
    });
    
    yPosition += 10;
  }

  // === NOVA PÁGINA PARA GRÁFICO ===
  doc.addPage();
  yPosition = 20;

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Análise Visual do Cronograma', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Gráfico de Pizza (Status)
  drawPieChart(doc, stats, pageWidth / 2 - 60, yPosition);

  // === RODAPÉ PERSONALIZADO ===
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    
    // Informações de geração
    doc.text(
      `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
      14,
      pageHeight - 12
    );
    
    // Informações de contato (se habilitado)
    if (includeContactInfo && i === 1) {
      const contactText = [];
      if (contactInfo.telefone) contactText.push(`Tel: ${contactInfo.telefone}`);
      if (contactInfo.email) contactText.push(`Email: ${contactInfo.email}`);
      
      if (contactText.length > 0) {
        doc.text(contactText.join(' | '), 14, pageHeight - 6);
      }
    }
    
    // Numeração de página
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 30, pageHeight - 12);
  }

  // === SAÍDA ===
  if (mode === 'print') {
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  } else if (mode === 'download') {
    doc.save(`Cronograma_${workshop.name}_${new Date().toISOString().split('T')[0]}.pdf`);
  } else if (mode === 'blob') {
    return doc.output('blob');
  }
};

function getStatusLabel(status) {
  const labels = {
    a_fazer: "A Fazer",
    em_andamento: "Em Andamento",
    concluido: "Concluído"
  };
  return labels[status] || status;
}

function formatDate(dateString) {
  try {
    return new Date(dateString).toLocaleDateString('pt-BR');
  } catch {
    return '-';
  }
}

function truncateText(text, maxLength) {
  if (!text) return '-';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function getDiasAtraso(item) {
  if (item.status === 'concluido' || item.not_started || !item.data_termino_previsto) {
    return '-';
  }
  
  const hoje = new Date();
  const termino = new Date(item.data_termino_previsto);
  const diff = Math.floor((hoje - termino) / (1000 * 60 * 60 * 24));
  
  return diff > 0 ? `${diff}d` : '-';
}

function getUltimaAtualizacao(item) {
  if (!item.historico_alteracoes || item.historico_alteracoes.length === 0) {
    return '-';
  }
  
  const ultima = item.historico_alteracoes[item.historico_alteracoes.length - 1];
  return formatDate(ultima.data_alteracao);
}

function drawTable(doc, x, y, data, columnWidths, hasHeader = false) {
  const rowHeight = 8;
  const cellPadding = 2;
  let currentY = y;

  data.forEach((row, rowIndex) => {
    const isHeader = hasHeader && rowIndex === 0;
    
    if (isHeader) {
      doc.setFillColor(37, 99, 235);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
    } else {
      doc.setFillColor(rowIndex % 2 === 0 ? 245 : 255);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
    }

    let currentX = x;
    row.forEach((cell, colIndex) => {
      const width = columnWidths[colIndex] || 40;
      
      // Desenhar célula
      doc.rect(currentX, currentY, width, rowHeight, 'FD');
      
      // Adicionar texto
      doc.text(
        String(cell || ''), 
        currentX + cellPadding, 
        currentY + rowHeight - cellPadding - 1
      );
      
      currentX += width;
    });
    
    currentY += rowHeight;
  });
}

function drawTableWithPagination(doc, x, y, headers, dataRows, columnWidths, pageHeight) {
  const rowHeight = 8;
  const cellPadding = 1.5;
  const marginBottom = 25;
  let currentY = y;
  let rowIndex = 0;

  const drawHeaders = () => {
    doc.setFillColor(37, 99, 235);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(7);

    let currentX = x;
    headers.forEach((header, colIndex) => {
      const width = columnWidths[colIndex] || 30;
      doc.rect(currentX, currentY, width, rowHeight, 'FD');
      
      const lines = doc.splitTextToSize(String(header), width - (cellPadding * 2));
      const textY = currentY + (rowHeight / 2) + 1;
      doc.text(lines[0], currentX + cellPadding, textY);
      
      currentX += width;
    });
    
    currentY += rowHeight;
  };

  drawHeaders();

  dataRows.forEach((row) => {
    if (currentY + rowHeight > pageHeight - marginBottom) {
      doc.addPage();
      currentY = 20;
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`CheckPoint / Cronograma (continuação)`, 14, currentY);
      currentY += 10;
      
      drawHeaders();
    }

    const isEvenRow = rowIndex % 2 === 0;
    doc.setFillColor(isEvenRow ? 250 : 255);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);

    let currentX = x;
    row.forEach((cell, colIndex) => {
      const width = columnWidths[colIndex] || 30;
      
      doc.setDrawColor(200, 200, 200);
      doc.rect(currentX, currentY, width, rowHeight);
      
      doc.setFillColor(isEvenRow ? 250 : 255);
      doc.rect(currentX, currentY, width, rowHeight, 'F');
      
      const cellText = String(cell || '-');
      const lines = doc.splitTextToSize(cellText, width - (cellPadding * 2));
      const textY = currentY + (rowHeight / 2) + 1.5;
      doc.text(lines[0], currentX + cellPadding, textY);
      
      currentX += width;
    });

    currentY += rowHeight;
    rowIndex++;
  });

  return currentY;
}

function drawPieChart(doc, stats, x, y) {
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Distribuição de Status (Gráfico Pizza)', x, y - 5);

  const total = stats.total;
  const data = [
    { label: 'Concluídos', value: stats.concluidos, color: [34, 197, 94] },
    { label: 'Em Andamento', value: stats.em_andamento, color: [59, 130, 246] },
    { label: 'Atrasados', value: stats.atrasados, color: [239, 68, 68] },
    { label: 'Não Iniciados', value: total - stats.concluidos - stats.em_andamento - stats.atrasados, color: [156, 163, 175] }
  ];

  const centerX = x + 50;
  const centerY = y + 40;
  const radius = 35;
  
  let startAngle = 0;
  data.forEach(item => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    
    doc.setFillColor(...item.color);
    drawPieSlice(doc, centerX, centerY, radius, startAngle, endAngle);
    
    startAngle = endAngle;
  });

  // Legenda
  let legendY = y + 10;
  data.forEach(item => {
    doc.setFillColor(...item.color);
    doc.rect(centerX + 50, legendY - 3, 8, 8, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`${item.label}: ${item.value} (${((item.value / total) * 100).toFixed(1)}%)`, centerX + 62, legendY + 3);
    legendY += 10;
  });
}

function drawPieSlice(doc, centerX, centerY, radius, startAngle, endAngle) {
  const steps = 50;
  const angleStep = (endAngle - startAngle) / steps;
  
  doc.moveTo(centerX, centerY);
  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + (i * angleStep);
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    doc.lineTo(x, y);
  }
  doc.lineTo(centerX, centerY);
  doc.fill();
}
import jsPDF from "jspdf";

export const generateCronogramaPDF = (cronogramaData, workshop, mode = 'download') => {
  const { stats, items, planName } = cronogramaData;
  
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  let yPosition = 20;

  // === CABEÇALHO ===
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.text('Relatório do Cronograma de Implementação', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(`${workshop.name} - Plano ${planName}`, pageWidth / 2, 25, { align: 'center' });
  
  yPosition = 45;

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

  // Tabela de cronograma manual
  const tableHeaders = ['Atividade', 'Tipo', 'Status', 'Início', 'Término Prev.', 'Término Real'];
  const tableData = items.map(item => [
    truncateText(item.item_nome || '-', 25),
    item.item_tipo || '-',
    getStatusLabel(item.status),
    item.data_inicio_real ? formatDate(item.data_inicio_real) : '-',
    item.data_termino_previsto ? formatDate(item.data_termino_previsto) : '-',
    item.data_termino_real ? formatDate(item.data_termino_real) : '-'
  ]);

  drawTable(doc, 14, yPosition, [tableHeaders, ...tableData], [70, 25, 30, 28, 32, 28], true);

  // === NOVA PÁGINA PARA GRÁFICOS ===
  doc.addPage();
  yPosition = 20;

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Análise Visual do Cronograma', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Gráfico de Pizza (Status)
  drawPieChart(doc, stats, 40, yPosition);
  
  // Gráfico de Gantt (Timeline)
  drawGanttChart(doc, items, 40, yPosition + 90);

  // === RODAPÉ ===
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
      14,
      pageHeight - 10
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 30, pageHeight - 10);
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

function drawGanttChart(doc, items, x, y) {
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Cronograma (Gráfico de Gantt)', x, y - 5);

  // Filtrar apenas itens iniciados
  const itemsIniciados = items.filter(i => !i.not_started && i.data_inicio_real);
  const displayItems = itemsIniciados.slice(0, 8); // Limitar para caber na página

  if (displayItems.length === 0) {
    doc.setFontSize(9);
    doc.text('Nenhum item iniciado ainda', x + 10, y + 20);
    return;
  }

  const chartWidth = 200;
  const barHeight = 8;
  const barSpacing = 12;

  // Encontrar data min e max
  const dates = displayItems.flatMap(i => [
    new Date(i.data_inicio_real),
    new Date(i.data_termino_previsto || i.data_inicio_real)
  ]);
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  const dateRange = maxDate - minDate || 1;

  displayItems.forEach((item, index) => {
    const startDate = new Date(item.data_inicio_real);
    const endDate = new Date(item.data_termino_previsto || item.data_termino_real || new Date());
    
    const startPos = ((startDate - minDate) / dateRange) * chartWidth;
    const duration = ((endDate - startDate) / dateRange) * chartWidth;

    const barY = y + (index * barSpacing);

    // Nome da atividade
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    const itemName = item.item_nome.length > 25 ? item.item_nome.substring(0, 25) + '...' : item.item_nome;
    doc.text(itemName, x, barY + 5);

    // Barra do Gantt
    const barX = x + 70;
    doc.setFillColor(200, 200, 200);
    doc.rect(barX, barY, chartWidth, barHeight, 'F');
    
    // Barra de progresso
    const statusColor = item.status === 'concluido' ? [34, 197, 94] : 
                       item.status === 'em_andamento' ? [59, 130, 246] : [239, 68, 68];
    doc.setFillColor(...statusColor);
    doc.rect(barX + startPos, barY, Math.max(duration, 2), barHeight, 'F');
  });

  // Eixo de datas
  doc.setFontSize(7);
  doc.text(minDate.toLocaleDateString('pt-BR'), x + 70, y + (displayItems.length * barSpacing) + 8);
  doc.text(maxDate.toLocaleDateString('pt-BR'), x + 70 + chartWidth - 20, y + (displayItems.length * barSpacing) + 8);
}
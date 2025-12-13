import jsPDF from "jspdf";

export const generateCronogramaPDF = (cronogramaData, workshop, mode = 'download', options = {}) => {
  const { stats, items, planName } = cronogramaData;
  const { customNotes = '', includeContactInfo = true, contactInfo = {} } = options;
  
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // URL da logo Oficinas Master
  const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69161d2e91d07685b2bc845b/db077b29a_Oficinasmasters-fundo.png';
  
  let yPosition = 20;
  let isFirstPage = true;

  // === CABEÇALHO MACRO (APENAS PRIMEIRA PÁGINA) ===
  doc.setFillColor(211, 47, 47); // Vermelho da marca
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Logo Oficinas Master
  try {
    doc.addImage(logoUrl, 'PNG', 15, 8, 40, 30);
  } catch (error) {
    console.log('Erro ao carregar logo Oficinas Master');
  }
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.text('Relatório do Cronograma de Implementação', pageWidth / 2, 18, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(`${workshop.name} - Plano ${planName}`, pageWidth / 2, 28, { align: 'center' });
  doc.setFontSize(10);
  doc.text(
    `${workshop.city || ''}, ${workshop.state || ''} | Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
    pageWidth / 2,
    36,
    { align: 'center' }
  );
  
  yPosition = 55;

  // === GRÁFICO DE ANÁLISE VISUAL (MOVIDO PARA O INÍCIO) ===
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(211, 47, 47); // Vermelho da marca
  doc.text('Análise Visual do Cronograma', pageWidth / 2, yPosition, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  yPosition += 15;

  drawPieChart(doc, stats, pageWidth / 2 - 60, yPosition);
  yPosition += 95;

  // === CHECKPOINT DO CRONOGRAMA ===
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    isFirstPage = false;
    yPosition = 35; // Espaço para logo no topo
  }

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(211, 47, 47); // Vermelho da marca
  doc.text(`CheckPoint / Cronograma do Plano ${planName}`, 14, yPosition);
  doc.setTextColor(0, 0, 0);
  yPosition += 10;

  // Tabela de cronograma manual com paginação automática - TODOS OS ITENS
  const tableHeaders = ['Programa / Conteúdo', 'Início Previsto', 'Início Real', 'Término Previsto', 'Término Real', 'Status', 'Atraso', 'Detalhes'];
  
  const tableData = items.map(item => {
    const diasAtraso = getDiasAtraso(item);
    const ultimaAtualizacao = getUltimaAtualizacao(item);
    
    // Estruturar com hierarquia: Nome Principal + Categoria
    const nomeCompleto = item.item_nome || '-';
    const categoria = item.item_tipo ? `  ${item.item_tipo.charAt(0).toUpperCase() + item.item_tipo.slice(1)}` : '';
    
    // Calcular início previsto (1 dia antes do início real)
    const inicioPrevisto = item.data_inicio_real 
      ? formatDate(new Date(new Date(item.data_inicio_real).setDate(new Date(item.data_inicio_real).getDate() - 1)))
      : '-';
    
    return [
      nomeCompleto + '\n' + categoria,
      inicioPrevisto,
      item.data_inicio_real ? formatDate(item.data_inicio_real) : '-',
      item.data_termino_previsto ? formatDate(item.data_termino_previsto) : '-',
      item.data_termino_real ? formatDate(item.data_termino_real) : '-',
      getStatusLabel(item.status),
      diasAtraso,
      ultimaAtualizacao
    ];
  });

  yPosition = drawTableWithPagination(doc, 14, yPosition, tableHeaders, tableData, [60, 25, 23, 27, 27, 23, 18, 32], pageHeight);
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
        isFirstPage = false;
        yPosition = 35; // Espaço para logo no topo
      }
      doc.text(line, 17, yPosition);
      yPosition += 5;
    });
    
    yPosition += 10;
  }



  // === RODAPÉ E LOGO EM TODAS AS PÁGINAS ===
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Logo no topo de todas as páginas (exceto primeira que já tem cabeçalho macro)
    if (i > 1) {
      try {
        doc.addImage(logoUrl, 'PNG', pageWidth - 45, 8, 30, 20);
      } catch (error) {
        console.log('Erro ao adicionar logo no topo');
      }
    }
    
    // Linha separadora do rodapé
    doc.setDrawColor(211, 47, 47); // Vermelho da marca
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);
    
    // Rodapé com logo
    try {
      doc.addImage(logoUrl, 'PNG', 14, pageHeight - 16, 20, 13);
    } catch (error) {
      console.log('Erro ao adicionar logo no rodapé');
    }
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text('Oficinas Master Educação Empresarial e Técnica', 38, pageHeight - 10);
    
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
      38,
      pageHeight - 6
    );
    
    // Numeração de página
    doc.setFontSize(8);
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
      doc.setFillColor(211, 47, 47); // Vermelho da marca
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
  const rowHeight = 10;
  const cellPadding = 1.5;
  const marginBottom = 25;
  let currentY = y;
  let rowIndex = 0;

  const drawHeaders = () => {
    const headerRowHeight = 10;

    let currentX = x;
    headers.forEach((header, colIndex) => {
      const width = columnWidths[colIndex] || 30;
      
      // Definir cores para cada célula
      doc.setFillColor(211, 47, 47); // Vermelho da marca
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);

      // Desenhar fundo vermelho do header
      doc.rect(currentX, currentY, width, headerRowHeight, 'F');
      
      // Desenhar borda
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.3);
      doc.rect(currentX, currentY, width, headerRowHeight, 'S');
      
      // Preparar texto
      const headerText = String(header);
      const maxWidth = width - 3;
      const lines = doc.splitTextToSize(headerText, maxWidth);
      
      // Centralizar verticalmente
      const lineHeight = 3.5;
      const totalHeight = lines.length * lineHeight;
      let textY = currentY + (headerRowHeight - totalHeight) / 2 + 3;
      
      // Renderizar cada linha
      lines.forEach((line) => {
        doc.text(line, currentX + 1.5, textY);
        textY += lineHeight;
      });
      
      currentX += width;
    });
    
    currentY += headerRowHeight;
  };

  drawHeaders();

  dataRows.forEach((row) => {
    if (currentY + rowHeight > pageHeight - marginBottom) {
      doc.addPage();
      isFirstPage = false;
      currentY = 35; // Espaço para logo no topo

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(211, 47, 47); // Vermelho da marca
      doc.text(`CheckPoint / Cronograma (continuação)`, 14, currentY);
      doc.setTextColor(0, 0, 0);
      currentY += 10;

      drawHeaders();
    }

    const isEvenRow = rowIndex % 2 === 0;
    doc.setFillColor(isEvenRow ? 250 : 255);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7);

    let currentX = x;
    row.forEach((cell, colIndex) => {
      const width = columnWidths[colIndex] || 30;
      
      doc.setDrawColor(200, 200, 200);
      doc.rect(currentX, currentY, width, rowHeight);
      
      doc.setFillColor(isEvenRow ? 250 : 255);
      doc.rect(currentX, currentY, width, rowHeight, 'F');
      
      const cellText = String(cell || '-');
      
      // Para a primeira coluna, aplicar hierarquia visual
      if (colIndex === 0) {
        const lines = cellText.split('\n');
        doc.setFont(undefined, 'bold');
        doc.text(lines[0], currentX + cellPadding, currentY + 3.5);
        
        if (lines[1]) {
          doc.setFont(undefined, 'normal');
          doc.setFontSize(6);
          doc.setTextColor(100, 100, 100);
          doc.text(lines[1], currentX + cellPadding + 2, currentY + 7.5);
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(7);
        }
      } else {
        doc.setFont(undefined, 'normal');
        const lines = doc.splitTextToSize(cellText, width - (cellPadding * 2));
        const textY = currentY + (rowHeight / 2) + 1.5;
        doc.text(lines[0], currentX + cellPadding, textY);
      }
      
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
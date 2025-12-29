import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";

export const generateProcessPDF = (processDoc, its = [], workshop) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  const content = processDoc?.content_json || {};

  // Função auxiliar para checar quebra de página
  const checkPageBreak = (spaceNeeded = 20) => {
    if (y + spaceNeeded > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Cabeçalho Centralizado
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('MAPA DA AUTO GESTÃO DO PROCESSO', pageWidth / 2, y, { align: 'center' });
  
  y += 8;
  doc.setFontSize(14);
  doc.text(processDoc.title, pageWidth / 2, y, { align: 'center' });

  y += 12;

  // Metadados em linha
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Código:', margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(processDoc.code || 'MAP-0000', margin + 18, y);

  doc.setFont(undefined, 'bold');
  doc.text('Versão:', pageWidth / 2 - 10, y);
  doc.setFont(undefined, 'normal');
  doc.text(processDoc.revision || '1', pageWidth / 2 + 10, y);

  doc.setFont(undefined, 'bold');
  const statusText = processDoc.status || 'ativo';
  doc.text(statusText, pageWidth - margin - doc.getTextWidth(statusText), y);

  y += 6;

  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('Categoria:', margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(processDoc.category || 'N/A', margin + 22, y);

  doc.setFont(undefined, 'bold');
  doc.text('Data Emissão:', pageWidth / 2 - 10, y);
  doc.setFont(undefined, 'normal');
  doc.text(format(new Date(processDoc.updated_date || processDoc.created_date), 'dd/MM/yyyy'), pageWidth / 2 + 22, y);

  y += 8;

  // Linha vermelha separadora
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);

  y += 12;

  // Função para adicionar seção
  const addSection = (numero, titulo, conteudo) => {
    checkPageBreak(25);

    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text(`${numero}. ${titulo}`, margin, y);
    
    y += 2;
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.line(margin, y, pageWidth - margin, y);
    
    y += 8;

    if (conteudo) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      
      const lines = doc.splitTextToSize(conteudo, contentWidth);
      lines.forEach(line => {
        checkPageBreak(8);
        doc.text(line, margin, y);
        y += 6;
      });
    }

    y += 8;
  };

  // 1. Objetivo
  addSection('1', 'OBJETIVO', content.objetivo || 'Não definido.');

  // 2. Campo de Aplicação
  addSection('2', 'CAMPO DE APLICAÇÃO', content.campo_aplicacao || 'Não definido.');

  // 3. Informações Complementares
  if (content.informacoes_complementares) {
    addSection('3', 'INFORMAÇÕES COMPLEMENTARES', content.informacoes_complementares);
  }

  // 4. Fluxo do Processo
  checkPageBreak(25);
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.text('4. FLUXO DO PROCESSO', margin, y);
  y += 2;
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  if (content.fluxo_processo) {
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    const lines = doc.splitTextToSize(content.fluxo_processo, contentWidth);
    lines.forEach(line => {
      checkPageBreak(8);
      doc.text(line, margin, y);
      y += 6;
    });
  }
  y += 8;

  // 5. Atividades e Responsabilidades
  if (content.atividades && content.atividades.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('5. ATIVIDADES E RESPONSABILIDADES', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    const tableData = content.atividades.map(item => [
      item.atividade || '',
      item.responsavel || '',
      item.ferramentas || ''
    ]);

    doc.autoTable({
      startY: y,
      head: [['Atividade', 'Responsável', 'Ferramentas/Docs']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 4,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      headStyles: {
        fillColor: [229, 229, 229],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        valign: 'top'
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.5 },
        1: { cellWidth: contentWidth * 0.25 },
        2: { cellWidth: contentWidth * 0.25 }
      },
      margin: { left: margin, right: margin }
    });

    y = doc.lastAutoTable.finalY + 10;
  }

  // 6. Matriz de Riscos
  if (content.matriz_riscos && content.matriz_riscos.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('6. MATRIZ DE RISCOS', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    const riscosData = content.matriz_riscos.map(item => [
      item.identificacao || '',
      item.fonte || '',
      item.impacto || '',
      item.categoria || '',
      item.controle || ''
    ]);

    doc.autoTable({
      startY: y,
      head: [['Risco', 'Fonte', 'Impacto', 'Categoria', 'Controle']],
      body: riscosData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      headStyles: {
        fillColor: [229, 229, 229],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        valign: 'top'
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.2 },
        1: { cellWidth: contentWidth * 0.15 },
        2: { cellWidth: contentWidth * 0.15 },
        3: { cellWidth: contentWidth * 0.15 },
        4: { cellWidth: contentWidth * 0.35 }
      },
      margin: { left: margin, right: margin }
    });

    y = doc.lastAutoTable.finalY + 10;
  }

  // 7. Inter-relação entre Áreas
  if (content.inter_relacoes && content.inter_relacoes.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('7. INTER-RELAÇÃO ENTRE ÁREAS', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    const interData = content.inter_relacoes.map(item => [
      item.area || '',
      item.interacao || ''
    ]);

    doc.autoTable({
      startY: y,
      head: [['Área', 'Interação']],
      body: interData,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 4,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      headStyles: {
        fillColor: [229, 229, 229],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        valign: 'top'
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.35 },
        1: { cellWidth: contentWidth * 0.65 }
      },
      margin: { left: margin, right: margin }
    });

    y = doc.lastAutoTable.finalY + 10;
  }

  // 8. Indicadores de Desempenho
  if (content.indicadores && content.indicadores.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('8. INDICADORES DE DESEMPENHO', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    const indicData = content.indicadores.map(item => [
      item.indicador || '',
      item.meta || '',
      item.como_medir || ''
    ]);

    doc.autoTable({
      startY: y,
      head: [['Indicador', 'Meta', 'Como Medir']],
      body: indicData,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 4,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      headStyles: {
        fillColor: [229, 229, 229],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        valign: 'top'
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.35 },
        1: { cellWidth: contentWidth * 0.25 },
        2: { cellWidth: contentWidth * 0.4 }
      },
      margin: { left: margin, right: margin }
    });

    y = doc.lastAutoTable.finalY + 10;
  }

  // Rodapé
  const finalY = pageHeight - 15;
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 100);
  
  const footerLine1 = `Documento Controlado - Status: ${processDoc.operational_status || 'Em elaboração'}`;
  const footerLine2 = `Oficinas Master - Impresso em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`;
  
  doc.text(footerLine1, pageWidth / 2, finalY, { align: 'center' });
  doc.text(footerLine2, pageWidth / 2, finalY + 5, { align: 'center' });

  // Adicionar ITs/FRs
  if (its && its.length > 0) {
    its.forEach((it, idx) => {
      doc.addPage();
      y = margin;
      addITtoDoc(doc, it, idx + 1, pageWidth, pageHeight, margin, contentWidth);
    });
  }

  return doc;
};

const addITtoDoc = (doc, it, index, pageWidth, pageHeight, margin, contentWidth) => {
  let y = margin;
  const content = it?.content || {};

  const checkPageBreak = (spaceNeeded = 20) => {
    if (y + spaceNeeded > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Cabeçalho IT
  doc.setFillColor(it.type === 'IT' ? 22 : 234, it.type === 'IT' ? 163 : 88, it.type === 'IT' ? 74 : 12);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.rect(margin, y, contentWidth, 10, 'F');
  doc.text(it.type, margin + 2, y + 7);

  y += 15;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text(it.title, pageWidth / 2, y, { align: 'center' });

  y += 8;

  if (it.description) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(it.description, pageWidth / 2, y, { align: 'center' });
    y += 6;
  }

  doc.setFontSize(9);
  doc.text(`Código: ${it.code} | Versão: ${it.version || '1'} | Status: ${it.status || 'ativo'}`, pageWidth / 2, y, { align: 'center' });

  y += 10;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  y += 10;

  // Seções da IT
  const addITSection = (titulo, conteudo) => {
    checkPageBreak(20);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(titulo, margin, y);
    y += 6;

    if (conteudo) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(conteudo, contentWidth);
      lines.forEach(line => {
        checkPageBreak(6);
        doc.text(line, margin, y);
        y += 5;
      });
    }
    y += 6;
  };

  addITSection('1. Objetivo', content.objetivo || 'Não definido.');
  addITSection('2. Campo de Aplicação', content.campo_aplicacao || 'Não definido.');
  
  if (content.informacoes_complementares) {
    addITSection('3. Informações Complementares', content.informacoes_complementares);
  }

  if (content.fluxo_descricao) {
    addITSection('4. Fluxo de Execução', content.fluxo_descricao);
  }

  // Rodapé
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(`${it.type} - ${it.code} - Versão ${it.version || '1'}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
};

export const downloadProcessPDF = (processDoc, its = [], workshop) => {
  const doc = generateProcessPDF(processDoc, its, workshop);
  const fileName = `${processDoc.code || 'MAP'}_${processDoc.title.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'ddMMyyyy')}.pdf`;
  doc.save(fileName);
};
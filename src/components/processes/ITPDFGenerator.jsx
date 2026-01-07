import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";

export const generateITPDF = (it) => {
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

  const content = it?.content || {};

  const checkPageBreak = (spaceNeeded = 20) => {
    if (y + spaceNeeded > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Cabeçalho
  const headerColor = it.type === 'IT' ? [22, 163, 74] : [234, 88, 12];
  doc.setFillColor(...headerColor);
  doc.rect(margin, y, contentWidth, 12, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(it.type === 'IT' ? 'IT - INSTRUÇÃO DE TRABALHO' : 'FR - FORMULÁRIO DE REGISTRO', pageWidth / 2, y + 8, { align: 'center' });

  y += 18;

  // Título
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.text(it.title, pageWidth / 2, y, { align: 'center' });

  y += 8;

  // Descrição
  if (it.description) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const descLines = doc.splitTextToSize(it.description, contentWidth);
    descLines.forEach(line => {
      doc.text(line, pageWidth / 2, y, { align: 'center' });
      y += 5;
    });
  }

  y += 4;

  // Metadados
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('Código:', margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(it.code || 'N/A', margin + 15, y);

  doc.setFont(undefined, 'bold');
  doc.text('Versão:', pageWidth / 2 - 10, y);
  doc.setFont(undefined, 'normal');
  doc.text(String(it.version || '1'), pageWidth / 2 + 10, y);

  doc.setFont(undefined, 'bold');
  doc.text('Status:', pageWidth - margin - 30, y);
  doc.setFont(undefined, 'normal');
  doc.text(it.status || 'ativo', pageWidth - margin - 10, y);

  y += 8;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  y += 10;

  // Seção helper
  const addSection = (numero, titulo, conteudo) => {
    checkPageBreak(25);

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`${numero}. ${titulo.toUpperCase()}`, margin, y);
    
    y += 2;
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    
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

  // 1. Objetivo
  addSection('1', 'Objetivo', content.objetivo || 'Não definido.');

  // 2. Campo de Aplicação
  addSection('2', 'Campo de Aplicação', content.campo_aplicacao || 'Não definido.');

  // 3. Informações Complementares
  if (content.informacoes_complementares) {
    addSection('3', 'Informações Complementares', content.informacoes_complementares);
  }

  // 4. Fluxo de Execução
  if (content.fluxo_descricao) {
    addSection('4', 'Fluxo de Execução', content.fluxo_descricao);
  }

  // 5. Atividades e Responsabilidades
  if (content.atividades && content.atividades.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('5. ATIVIDADES E RESPONSABILIDADES', margin, y);
    y += 2;
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    const atividadesData = content.atividades.map(item => [
      item.atividade || '',
      item.responsavel || '',
      item.frequencia || '',
      item.observacao || ''
    ]);

    doc.autoTable({
      startY: y,
      head: [['Atividade', 'Responsável', 'Frequência', 'Observação']],
      body: atividadesData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.3
      },
      headStyles: {
        fillColor: [229, 229, 229],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      margin: { left: margin, right: margin }
    });

    y = doc.lastAutoTable.finalY + 8;
  }

  // 6. Matriz de Riscos
  if (content.matriz_riscos && content.matriz_riscos.filter(r => r.risco).length > 0) {
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('6. MATRIZ DE RISCOS OPERACIONAIS', margin, y);
    y += 2;
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    const riscosData = content.matriz_riscos.filter(r => r.risco).map(item => [
      item.risco || '',
      item.categoria || '',
      item.causa || '',
      item.impacto || '',
      item.controle || ''
    ]);

    doc.autoTable({
      startY: y,
      head: [['Risco', 'Categoria', 'Causa', 'Impacto', 'Controle']],
      body: riscosData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.3
      },
      headStyles: {
        fillColor: [229, 229, 229],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      margin: { left: margin, right: margin }
    });

    y = doc.lastAutoTable.finalY + 8;
  }

  // 7. Inter-relações
  if (content.inter_relacoes && content.inter_relacoes.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('7. INTER-RELAÇÃO ENTRE ÁREAS', margin, y);
    y += 2;
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

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
        fontSize: 9,
        cellPadding: 3,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.3
      },
      headStyles: {
        fillColor: [229, 229, 229],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      margin: { left: margin, right: margin }
    });

    y = doc.lastAutoTable.finalY + 8;
  }

  // 8. Indicadores
  if (content.indicadores && content.indicadores.filter(i => i.nome).length > 0) {
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('8. INDICADORES', margin, y);
    y += 2;
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    const indicData = content.indicadores.filter(i => i.nome).map(item => [
      item.nome || '',
      item.formula || '',
      item.meta || '',
      item.frequencia || ''
    ]);

    doc.autoTable({
      startY: y,
      head: [['Nome', 'Fórmula', 'Meta', 'Frequência']],
      body: indicData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.3
      },
      headStyles: {
        fillColor: [229, 229, 229],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      margin: { left: margin, right: margin }
    });

    y = doc.lastAutoTable.finalY + 8;
  }

  // 9. Evidência de Execução
  if (content.evidencia_execucao?.tipo_evidencia) {
    checkPageBreak(30);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('9. EVIDÊNCIA DE EXECUÇÃO', margin, y);
    y += 2;
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Tipo:', margin, y);
    doc.setFont(undefined, 'normal');
    doc.text(content.evidencia_execucao.tipo_evidencia, margin + 15, y);
    y += 6;

    if (content.evidencia_execucao.descricao) {
      doc.setFont(undefined, 'bold');
      doc.text('Descrição:', margin, y);
      y += 5;
      doc.setFont(undefined, 'normal');
      const descLines = doc.splitTextToSize(content.evidencia_execucao.descricao, contentWidth - 5);
      descLines.forEach(line => {
        checkPageBreak(5);
        doc.text(line, margin + 5, y);
        y += 5;
      });
      y += 2;
    }

    if (content.evidencia_execucao.periodo_retencao) {
      doc.setFont(undefined, 'bold');
      doc.text('Período de Retenção:', margin, y);
      doc.setFont(undefined, 'normal');
      const periodo = content.evidencia_execucao.periodo_retencao.replace('_', ' ').replace('conforme_lei', 'Conforme legislação');
      doc.text(periodo, margin + 40, y);
      y += 6;
    }
  }

  // Rodapé
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(128);
    doc.text(
      `${it.type} - ${it.code} - Versão ${it.version || '1'} | Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      `Oficinas Master - Impresso em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  return doc;
};

export const downloadITPDF = (it) => {
  const doc = generateITPDF(it);
  const fileName = `${it.code || it.type}_${it.title.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'ddMMyyyy')}.pdf`;
  doc.save(fileName);
};
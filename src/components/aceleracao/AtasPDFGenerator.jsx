import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const generateAtaPDF = (ata, workshop) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 20;

  // Header
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('GESTÃO DE PROCESSOS', margin, 12);
  doc.setFontSize(12);
  doc.text('IT - Instrução de Trabalho', margin, 18);

  // Code and Date
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  y = 35;
  doc.setFont(undefined, 'bold');
  doc.text('Código:', margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(ata.code || 'IT.0000', margin + 20, y);

  doc.setFont(undefined, 'bold');
  doc.text('Data/Hora:', pageWidth - 70, y);
  doc.setFont(undefined, 'normal');
  doc.text(`${format(new Date(ata.meeting_date), 'dd/MM/yyyy', { locale: ptBR })} / ${ata.meeting_time}`, pageWidth - 40, y);

  y += 10;

  // Tipo Aceleração
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Tipo de Aceleração: ', margin, y);
  doc.setTextColor(220, 38, 38);
  doc.text(ata.tipo_aceleracao?.toUpperCase() || '', margin + 50, y);
  doc.setTextColor(0, 0, 0);

  y += 12;

  // Table Header
  const tableY = y;
  doc.setFillColor(220, 38, 38);
  doc.rect(margin, tableY, pageWidth - 2 * margin, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  const colWidth = (pageWidth - 2 * margin) / 3;
  doc.text('PARTICIPANTES', margin + 2, tableY + 7);
  doc.text('RESPONSÁVEL', margin + colWidth + 2, tableY + 7);
  doc.text('PLANO', margin + 2 * colWidth + 2, tableY + 7);

  y = tableY + 15;
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);

  // Table Content
  let maxHeight = 0;
  
  // Participantes
  let participantesY = y;
  if (ata.participantes?.length > 0) {
    ata.participantes.forEach((p, idx) => {
      if (participantesY > pageHeight - 30) return;
      doc.text(`• ${p.name} - ${p.role}`, margin + 2, participantesY);
      participantesY += 5;
      maxHeight = Math.max(maxHeight, participantesY - y);
    });
  }

  // Responsável
  doc.text(ata.responsavel?.name || '', margin + colWidth + 2, y);
  doc.text(ata.responsavel?.role || '', margin + colWidth + 2, y + 5);

  // Plano
  doc.text(ata.plano_nome || '', margin + 2 * colWidth + 2, y);

  y += Math.max(maxHeight, 15);

  // Draw table borders
  doc.setDrawColor(150);
  doc.rect(margin, tableY, pageWidth - 2 * margin, y - tableY);
  doc.line(margin + colWidth, tableY, margin + colWidth, y);
  doc.line(margin + 2 * colWidth, tableY, margin + 2 * colWidth, y);

  y += 10;

  // Sections
  const addSection = (title, content) => {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(title, margin, y);
    y += 8;

    if (content) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(content, pageWidth - 2 * margin);
      lines.forEach(line => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += 5;
      });
    }
    y += 5;
  };

  if (ata.pautas) {
    addSection('1. PAUTAS', ata.pautas);
  }

  if (ata.objetivos_atendimento) {
    addSection('2. OBJETIVOS DO ATENDIMENTO', ata.objetivos_atendimento);
  }

  if (ata.objetivos_consultor) {
    addSection('3. OBJETIVOS DO CONSULTOR', ata.objetivos_consultor);
  }

  if (ata.proximos_passos?.length > 0) {
    addSection('4. PRÓXIMOS PASSOS', '');
    ata.proximos_passos.forEach((passo, idx) => {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text(`• ${passo.descricao}`, margin, y);
      y += 5;
      doc.setFont(undefined, 'normal');
      doc.text(`  Responsável: ${passo.responsavel} | Prazo: ${format(new Date(passo.prazo), 'dd/MM/yyyy')}`, margin, y);
      y += 7;
    });
  }

  if (ata.visao_geral_projeto) {
    addSection('5. VISÃO GERAL DO PROJETO DE ACELERAÇÃO', ata.visao_geral_projeto);
  }

  // Workshop Data
  if (workshop) {
    if (y > pageHeight - 60) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('DADOS DA OFICINA', margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Nome: ${workshop.name || ''}`, margin, y);
    y += 5;
    doc.text(`Cidade/Estado: ${workshop.city || ''} / ${workshop.state || ''}`, margin, y);
    y += 5;
    doc.text(`Plano Atual: ${workshop.planoAtual || 'FREE'}`, margin, y);
    y += 5;
    if (workshop.segment_auto) {
      doc.text(`Segmento: ${workshop.segment_auto}`, margin, y);
      y += 5;
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text('Oficinas Master - Programa de Aceleração', margin, pageHeight - 10);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, pageWidth - 70, pageHeight - 10);

  return doc;
};

export const downloadAtaPDF = (ata, workshop) => {
  const doc = generateAtaPDF(ata, workshop);
  doc.save(`ATA_${ata.code}_${format(new Date(ata.meeting_date), 'ddMMyyyy')}.pdf`);
};
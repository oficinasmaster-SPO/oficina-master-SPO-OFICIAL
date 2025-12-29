import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const generateAtaPDF = (ata, workshop) => {
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
  doc.text('GESTÃO DE PROCESSOS', pageWidth / 2, y, { align: 'center' });
  
  y += 8;
  doc.setFontSize(13);
  doc.text('IT - Instrução de Trabalho', pageWidth / 2, y, { align: 'center' });

  y += 12;

  // Metadados em linha
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Código:', margin, y);
  doc.setFont(undefined, 'normal');
  doc.text(ata.code || 'ATA-' + format(new Date(ata.meeting_date || new Date()), 'yyyyMMdd'), margin + 18, y);

  doc.setFont(undefined, 'bold');
  doc.text('Data/Hora:', pageWidth / 2 - 10, y);
  doc.setFont(undefined, 'normal');
  doc.text(
    `${format(new Date(ata.meeting_date || new Date()), 'dd/MM/yyyy', { locale: ptBR })} / ${ata.meeting_time || '00:00'}`,
    pageWidth / 2 + 15,
    y
  );

  doc.setFont(undefined, 'bold');
  const statusText = ata.status === 'finalizada' ? 'Finalizada' : 'Rascunho';
  doc.text(statusText, pageWidth - margin - doc.getTextWidth(statusText), y);

  y += 8;

  // Linha vermelha separadora
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);

  y += 10;

  // Tipo de Aceleração
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Tipo de Aceleração:', margin, y);
  doc.setTextColor(220, 38, 38);
  doc.text((ata.tipo_aceleracao || 'MENSAL').toUpperCase(), margin + 50, y);
  doc.setTextColor(0, 0, 0);

  y += 12;

  // Tabela de Participantes, Responsável, Plano
  const tableData = [];
  
  // Preparar dados das células
  let participantesText = '';
  if (ata.participantes && ata.participantes.length > 0) {
    participantesText = ata.participantes.map(p => `• ${p.name} - ${p.role}`).join('\n');
  } else {
    participantesText = '• Aceleradora Oficinas Master - Consultor/Acelerador';
  }

  const responsavelText = `${ata.responsavel?.name || workshop?.name || 'OFICINA CLIENTE'}\n${ata.responsavel?.role || 'Proprietário'}`;
  const planoText = ata.plano_nome || 'Plano de Aceleração';

  tableData.push([participantesText, responsavelText, planoText]);

  doc.autoTable({
    startY: y,
    head: [['PARTICIPANTES', 'RESPONSÁVEL', 'PLANO']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 5,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.5
    },
    headStyles: {
      fillColor: [220, 38, 38],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      valign: 'top'
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.4 },
      1: { cellWidth: contentWidth * 0.3 },
      2: { cellWidth: contentWidth * 0.3 }
    },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 15;

  // Função para adicionar seção com título
  const addSection = (numero, titulo, conteudo) => {
    checkPageBreak(25);

    // Título da seção
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text(`${numero}. ${titulo}`, margin, y);
    
    // Linha abaixo do título
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

  // Função para adicionar lista de itens
  const addItemList = (items, formatFn) => {
    items.forEach((item, idx) => {
      checkPageBreak(20);
      
      // Box colorido para item
      const boxHeight = formatFn ? 18 : 8;
      doc.setFillColor(240, 249, 255);
      doc.setDrawColor(22, 163, 74);
      doc.setLineWidth(1);
      doc.rect(margin, y - 3, contentWidth, boxHeight, 'FD');

      if (formatFn) {
        formatFn(item, idx);
      } else {
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`• ${item}`, margin + 2, y + 2);
      }

      y += boxHeight + 3;
    });
  };

  // 1. PAUTAS
  if (ata.pautas) {
    addSection('1', 'PAUTAS', ata.pautas);
  } else if (ata.pauta && ata.pauta.length > 0) {
    checkPageBreak(25);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('1. PAUTAS', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    ata.pauta.forEach((item, idx) => {
      checkPageBreak(15);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(`${idx + 1}. ${item.titulo}`, margin, y);
      y += 6;
      
      if (item.descricao) {
        doc.setFont(undefined, 'normal');
        const descLines = doc.splitTextToSize(item.descricao, contentWidth - 10);
        descLines.forEach(line => {
          checkPageBreak(6);
          doc.text(line, margin + 5, y);
          y += 5;
        });
      }
      
      if (item.tempo_estimado) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Tempo estimado: ${item.tempo_estimado} min`, margin + 5, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
      }
      
      y += 3;
    });
    y += 5;
  }

  // 2. OBJETIVOS DO ATENDIMENTO
  if (ata.objetivos_atendimento) {
    addSection('2', 'OBJETIVOS DO ATENDIMENTO', ata.objetivos_atendimento);
  } else if (ata.objetivos && ata.objetivos.length > 0) {
    checkPageBreak(25);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('2. OBJETIVOS DO ATENDIMENTO', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    ata.objetivos.forEach(obj => {
      checkPageBreak(8);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`• ${obj}`, margin, y);
      y += 6;
    });
    y += 5;
  }

  // 3. OBJETIVOS DO CONSULTOR
  if (ata.objetivos_consultor) {
    addSection('3', 'OBJETIVOS DO CONSULTOR', ata.objetivos_consultor);
  }

  // 4. PRÓXIMOS PASSOS
  if (ata.proximos_passos_list && ata.proximos_passos_list.length > 0) {
    checkPageBreak(25);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('4. PRÓXIMOS PASSOS', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    ata.proximos_passos_list.forEach((passo, idx) => {
      checkPageBreak(20);
      
      // Box verde para próximos passos
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(22, 163, 74);
      doc.setLineWidth(1);
      doc.rect(margin, y - 3, contentWidth, 18, 'FD');

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`• ${passo.descricao}`, margin + 2, y + 2);
      
      y += 7;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(`Responsável: ${passo.responsavel}`, margin + 2, y);
      
      if (passo.prazo) {
        y += 5;
        doc.setTextColor(100, 100, 100);
        doc.text(`Prazo: ${format(new Date(passo.prazo), 'dd/MM/yyyy')}`, margin + 2, y);
        doc.setTextColor(0, 0, 0);
      }

      y += 8;
    });
    y += 5;
  } else if (ata.proximos_passos) {
    addSection('4', 'PRÓXIMOS PASSOS', ata.proximos_passos);
  }

  // 5. RESUMO DA REUNIÃO
  if (ata.ata_ia) {
    addSection('5', 'RESUMO DA REUNIÃO', ata.ata_ia);
  }

  // 6. DECISÕES TOMADAS
  if (ata.decisoes_tomadas && ata.decisoes_tomadas.length > 0) {
    checkPageBreak(25);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('6. DECISÕES TOMADAS', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    ata.decisoes_tomadas.forEach((decisao) => {
      checkPageBreak(20);
      
      // Box azul para decisões
      doc.setFillColor(240, 249, 255);
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(1);
      doc.rect(margin, y - 3, contentWidth, 18, 'FD');

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(decisao.decisao, margin + 2, y + 2);
      
      y += 7;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(`Responsável: ${decisao.responsavel}`, margin + 2, y);
      
      if (decisao.prazo) {
        y += 5;
        doc.setTextColor(100, 100, 100);
        doc.text(`Prazo: ${format(new Date(decisao.prazo), 'dd/MM/yyyy')}`, margin + 2, y);
        doc.setTextColor(0, 0, 0);
      }

      y += 8;
    });
    y += 5;
  }

  // 7. AÇÕES DE ACOMPANHAMENTO
  if (ata.acoes_geradas && ata.acoes_geradas.length > 0) {
    checkPageBreak(25);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('7. AÇÕES DE ACOMPANHAMENTO', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    ata.acoes_geradas.forEach((acao) => {
      checkPageBreak(20);
      
      // Box verde para ações
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(22, 163, 74);
      doc.setLineWidth(1);
      doc.rect(margin, y - 3, contentWidth, 18, 'FD');

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(acao.acao, margin + 2, y + 2);
      
      y += 7;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(`Responsável: ${acao.responsavel}`, margin + 2, y);
      
      if (acao.prazo) {
        y += 5;
        doc.setTextColor(100, 100, 100);
        doc.text(`Prazo: ${format(new Date(acao.prazo), 'dd/MM/yyyy')}`, margin + 2, y);
        doc.setTextColor(0, 0, 0);
      }

      y += 8;
    });
    y += 5;
  }

  // 8. PROCESSOS COMPARTILHADOS
  if (ata.processos_vinculados && ata.processos_vinculados.length > 0) {
    checkPageBreak(25);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('8. PROCESSOS COMPARTILHADOS (MAPs)', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    ata.processos_vinculados.forEach(proc => {
      checkPageBreak(8);
      doc.text(`• ${proc.titulo} - ${proc.categoria}`, margin, y);
      y += 6;
    });
    y += 5;
  }

  // 9. VIDEOAULAS E TREINAMENTOS
  if (ata.videoaulas_vinculadas && ata.videoaulas_vinculadas.length > 0) {
    checkPageBreak(25);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('9. VIDEOAULAS E TREINAMENTOS', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    ata.videoaulas_vinculadas.forEach(video => {
      checkPageBreak(8);
      doc.text(`• ${video.titulo}`, margin, y);
      y += 6;
    });
    y += 5;
  }

  // 10. OBSERVAÇÕES DO CONSULTOR
  if (ata.observacoes_consultor) {
    addSection('10', 'OBSERVAÇÕES DO CONSULTOR', ata.observacoes_consultor);
  }

  // 11. VISÃO GERAL DO PROJETO
  if (ata.visao_geral_projeto) {
    addSection('11', 'VISÃO GERAL DO PROJETO DE ACELERAÇÃO', ata.visao_geral_projeto);
  }

  // Rodapé
  const finalY = pageHeight - 15;
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 100);
  
  const footerLine1 = `Documento Controlado - Status: ${ata.status || 'finalizada'}`;
  const footerLine2 = `Oficinas Master - Impresso em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`;
  
  doc.text(footerLine1, pageWidth / 2, finalY, { align: 'center' });
  doc.text(footerLine2, pageWidth / 2, finalY + 5, { align: 'center' });

  return doc;
};

export const downloadAtaPDF = (ata, workshop) => {
  const doc = generateAtaPDF(ata, workshop);
  const fileName = `ATA_${ata.code || 'sem-codigo'}_${format(new Date(ata.meeting_date || new Date()), 'ddMMyyyy')}.pdf`;
  doc.save(fileName);
};
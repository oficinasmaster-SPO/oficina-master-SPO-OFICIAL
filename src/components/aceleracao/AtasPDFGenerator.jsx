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
  doc.text('AT - Ata de Atendimento', pageWidth / 2, y, { align: 'center' });

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
    y += 8;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text('Por fim, ficaram definidos como próximos passos:', margin, y);
    y += 10;

    ata.proximos_passos_list.forEach((passo, idx) => {
      checkPageBreak(15);
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      
      const descLines = doc.splitTextToSize(`• ${passo.descricao}`, contentWidth);
      descLines.forEach((line) => {
        doc.text(line, margin, y);
        y += 5;
      });

      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      
      let details = [];
      if (passo.responsavel) details.push(`Responsável: ${passo.responsavel}`);
      if (passo.prazo) {
        try {
          details.push(`Prazo: ${format(new Date(passo.prazo), 'dd/MM/yyyy')}`);
        } catch(e) {
          details.push(`Prazo: ${passo.prazo}`);
        }
      }
      
      if (details.length > 0) {
        doc.text(`  ${details.join(' | ')}`, margin, y);
        y += 8;
      } else {
        y += 3;
      }
      
      doc.setTextColor(0, 0, 0);
    });
    
    if (ata.proximos_passos) {
        y += 5;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const legacyLines = doc.splitTextToSize(ata.proximos_passos, contentWidth);
        legacyLines.forEach(line => {
            checkPageBreak(8);
            doc.text(line, margin, y);
            y += 5;
        });
    }
    
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
      doc.text(decisao.decisao || '', margin + 2, y + 2);
      
      y += 7;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      let detalhes = [];
      if (decisao.responsavel) detalhes.push(`Responsável: ${decisao.responsavel}`);
      if (decisao.prazo) detalhes.push(`Prazo: ${format(new Date(decisao.prazo), 'dd/MM/yyyy')}`);
      
      if (detalhes.length > 0) {
        doc.text(detalhes.join(' | '), margin + 2, y);
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

  // 8. PROCESSOS COMPARTILHADOS (MAPs)
  if (ata.processos_vinculados && ata.processos_vinculados.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('8. PROCESSOS (MAPs) COMPARTILHADOS', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(100, 100, 100);
    const instrucao = doc.splitTextToSize(
      'Os processos abaixo foram discutidos e estão disponíveis para consulta no módulo "Processos" da plataforma.',
      contentWidth
    );
    instrucao.forEach(line => {
      doc.text(line, margin, y);
      y += 4;
    });
    doc.setTextColor(0, 0, 0);
    y += 5;

    ata.processos_vinculados.forEach(proc => {
      checkPageBreak(15);
      
      // Box azul para processos
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.5);
      doc.rect(margin, y - 2, contentWidth, 12, 'FD');
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(`• ${proc.titulo}`, margin + 2, y + 2);
      
      y += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(`Categoria: ${proc.categoria}`, margin + 2, y);
      
      y += 5;
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text(`📍 Acesse em: Menu → Processos → Buscar "${proc.titulo}"`, margin + 2, y);
      doc.setTextColor(0, 0, 0);
      
      y += 7;
    });
    y += 5;
  }

  // 9. VIDEOAULAS RECOMENDADAS
  if (ata.videoaulas_vinculadas && ata.videoaulas_vinculadas.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('9. VIDEOAULAS RECOMENDADAS', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(100, 100, 100);
    const instrucaoVideo = doc.splitTextToSize(
      'As videoaulas abaixo foram indicadas e estão disponíveis no módulo "Academia de Treinamento" da plataforma.',
      contentWidth
    );
    instrucaoVideo.forEach(line => {
      doc.text(line, margin, y);
      y += 4;
    });
    doc.setTextColor(0, 0, 0);
    y += 5;

    ata.videoaulas_vinculadas.forEach(video => {
      checkPageBreak(15);
      
      // Box roxo para videoaulas
      doc.setFillColor(250, 245, 255);
      doc.setDrawColor(147, 51, 234);
      doc.setLineWidth(0.5);
      doc.rect(margin, y - 2, contentWidth, 12, 'FD');
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(`• ${video.titulo}`, margin + 2, y + 2);
      
      y += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(`Curso: ${video.descricao}`, margin + 2, y);
      
      y += 5;
      doc.setFontSize(8);
      doc.setTextColor(147, 51, 234);
      const caminhoVideo = doc.splitTextToSize(
        `📍 Acesse em: Menu → Academia de Treinamento → ${video.descricao} → ${video.titulo}`,
        contentWidth - 5
      );
      caminhoVideo.forEach(linha => {
        doc.text(linha, margin + 2, y);
        y += 4;
      });
      doc.setTextColor(0, 0, 0);
      
      y += 5;
    });
    y += 5;
  }

  // 10. MÍDIAS E ANEXOS
  if (ata.midias_anexas && ata.midias_anexas.length > 0) {
    checkPageBreak(25);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('10. MÍDIAS E ANEXOS', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    ata.midias_anexas.forEach((midia, idx) => {
      checkPageBreak(15);
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      
      let icone = '📎';
      if (midia.tipo === 'imagem') icone = '🖼️';
      else if (midia.tipo === 'video') icone = '🎬';
      else if (midia.tipo === 'link') icone = '🔗';
      else if (midia.tipo === 'documento') icone = '📄';
      
      doc.text(`${icone} ${midia.titulo || `${midia.tipo} ${idx + 1}`}`, margin, y);
      y += 6;
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 100, 100);
      const urlLines = doc.splitTextToSize(midia.url, contentWidth - 5);
      urlLines.forEach(line => {
        checkPageBreak(5);
        doc.text(line, margin + 3, y);
        y += 5;
      });
      doc.setTextColor(0, 0, 0);
      
      y += 3;
    });
    y += 5;
  }

  // 11. OBSERVAÇÕES DO CONSULTOR
  if (ata.observacoes_consultor) {
    addSection('11', 'OBSERVAÇÕES DO CONSULTOR', ata.observacoes_consultor);
  }

  // 12. VISÃO GERAL DO PROJETO
  if (ata.visao_geral_projeto) {
    addSection('12', 'VISÃO GERAL DO PROJETO DE ACELERAÇÃO', ata.visao_geral_projeto);
  }

  // 13. INTELIGÊNCIA DO CLIENTE
  if (ata.client_intelligence && ata.client_intelligence.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('13. INTELIGÊNCIA DO CLIENTE (DORES E OPORTUNIDADES)', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    ata.client_intelligence.forEach((item, idx) => {
      checkPageBreak(25);
      
      // Box laranja claro para inteligência
      doc.setFillColor(255, 247, 237);
      doc.setDrawColor(249, 115, 22);
      doc.setLineWidth(0.5);
      doc.rect(margin, y - 3, contentWidth, 22, 'FD');

      // Título: Área - Tipo
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(194, 65, 12); // Laranja escuro
      doc.text(`${item.area} - ${item.type}`, margin + 2, y + 2);
      
      // Gravidade
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      const gravidade = item.gravityLabel || item.gravity || 'Média';
      doc.text(`Gravidade: ${gravidade}`, pageWidth - margin - 30, y + 2);

      y += 6;
      
      // Subcategoria / Problema
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(item.subcategory || item.title, margin + 2, y);
      
      y += 5;
      
      // Descrição
      if (item.description) {
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        const descLines = doc.splitTextToSize(item.description, contentWidth - 5);
        descLines.forEach(line => {
          doc.text(line, margin + 2, y);
          y += 4;
        });
      }
      
      y += 6;
    });
    y += 5;
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
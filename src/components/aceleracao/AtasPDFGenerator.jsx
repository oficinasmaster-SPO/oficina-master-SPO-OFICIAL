import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseMarkdownToPdf, safeText } from "@/utils/markdownPdfParser";
import { sanitizeAtaData, formatPrazoSafe } from "@/utils/ataSanitizer";

export const generateAtaPDF = (rawAta, workshop) => {
  // Sanitizar todos os dados antes de gerar o PDF
  const ata = sanitizeAtaData(rawAta) || {};
  
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

  // Cabecalho Centralizado
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('GESTAO DE PROCESSOS', pageWidth / 2, y, { align: 'center' });
  
  y += 8;
  doc.setFontSize(13);
  doc.text('AT - Ata de Atendimento', pageWidth / 2, y, { align: 'center' });

  y += 12;

  // Metadados em linha
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Codigo:', margin, y);
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
  doc.text('Tipo de Aceleracao:', margin, y);
  doc.setTextColor(220, 38, 38);
  doc.text(safeText((ata.tipo_aceleracao || 'MENSAL').toUpperCase()), margin + 50, y);
  doc.setTextColor(0, 0, 0);

  y += 12;

  // Tabela de Participantes, Responsável, Plano
  const tableData = [];
  
  // Preparar dados das células (já sanitizados)
  let participantesText = '';
  if (ata.participantes && ata.participantes.length > 0) {
    participantesText = ata.participantes.map(p => `- ${safeText(p.name)} - ${safeText(p.role)}`).join('\n');
  } else {
    participantesText = '- Aceleradora Oficinas Master - Consultor/Acelerador';
  }

  const responsavelText = `${safeText(ata.responsavel?.name) || workshop?.name || 'OFICINA CLIENTE'}\n${safeText(ata.responsavel?.role) || 'Proprietário'}`;
  const planoText = safeText(ata.plano_nome) || 'Plano de Aceleração';

  tableData.push([participantesText, responsavelText, planoText]);

  doc.autoTable({
    startY: y,
    head: [['PARTICIPANTES', 'RESPONSAVEL', 'PLANO']],
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

  // Funcao auxiliar para renderizar texto preservando quebras de linha
  const renderMultilineText = (text, fontSize = 11, lineHeight = 6) => {
    doc.setFontSize(fontSize);
    doc.setFont(undefined, 'normal');
    
    // Dividir por quebras de linha para respeitar formatacao original
    const paragraphs = text.split(/\n/);
    
    paragraphs.forEach((paragraph) => {
      // Linha vazia = espacamento extra (preserva paragrafos)
      if (paragraph.trim() === '') {
        y += 4;
        return;
      }
      
      // Quebrar paragrafo por largura da pagina
      const wrappedLines = doc.splitTextToSize(paragraph, contentWidth);
      wrappedLines.forEach(line => {
        checkPageBreak(lineHeight + 2);
        doc.text(line, margin, y);
        y += lineHeight;
      });
    });
  };

  // Funcao auxiliar para adicionar secao com titulo
  const addSection = (numero, titulo, conteudo) => {
    checkPageBreak(25);

    // Titulo da secao (sanitizado para fonte jsPDF)
    const tituloSafe = safeText(titulo);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text(`${numero}. ${tituloSafe}`, margin, y);
    
    // Linha abaixo do titulo
    y += 2;
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.line(margin, y, pageWidth - margin, y);
    
    y += 8;

    if (conteudo) {
      const conteudoSafe = safeText(conteudo);
      renderMultilineText(conteudoSafe);
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
        doc.text(`- ${safeText(item)}`, margin + 2, y + 2);
      }

      y += boxHeight + 3;
    });
  };

  // 1. PAUTAS
  if (ata.pautas) {
    addSection('1', 'PAUTAS (Anotacoes do Consultor)', safeText(ata.pautas));
  } else if (ata.pauta && ata.pauta.length > 0) {
    checkPageBreak(25);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('1. PAUTAS (Anotacoes do Consultor)', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    ata.pauta.forEach((item, idx) => {
      checkPageBreak(15);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(`${idx + 1}. ${safeText(item.titulo)}`, margin, y);
      y += 6;
      
      if (item.descricao) {
        doc.setFont(undefined, 'normal');
        const descLines = doc.splitTextToSize(safeText(item.descricao), contentWidth - 10);
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
    addSection('2', 'OBJETIVOS DO ATENDIMENTO (Anotacoes do Consultor)', safeText(ata.objetivos_atendimento));
  } else if (ata.objetivos && ata.objetivos.length > 0) {
    checkPageBreak(25);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('2. OBJETIVOS DO ATENDIMENTO (Anotacoes do Consultor)', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    ata.objetivos.forEach(obj => {
      checkPageBreak(8);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`- ${safeText(obj)}`, margin, y);
      y += 6;
    });
    y += 5;
  }

  // 3. OBJETIVOS DO CONSULTOR
  if (ata.objetivos_consultor) {
    addSection('3', 'OBJETIVOS DO CONSULTOR (Anotacoes)', safeText(ata.objetivos_consultor));
  }

  // 4. PRÓXIMOS PASSOS
  if (ata.proximos_passos_list && ata.proximos_passos_list.length > 0) {
    checkPageBreak(25);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('4. PROXIMOS PASSOS (Anotacoes do Consultor)', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text('Por fim, ficaram definidos como proximos passos:', margin, y);
    y += 10;

    ata.proximos_passos_list.forEach((passo, idx) => {
      checkPageBreak(15);
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      
      const descText = safeText(passo.descricao);
      const descLines = doc.splitTextToSize(`- ${descText}`, contentWidth);
      descLines.forEach((line) => {
        doc.text(line, margin, y);
        y += 5;
      });

      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      
      let details = [];
      const respText = safeText(passo.responsavel);
      if (respText) details.push(`Responsavel: ${respText}`);
      if (passo.prazo) {
        details.push(`Prazo: ${formatPrazoSafe(passo.prazo)}`);
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
        renderMultilineText(safeText(ata.proximos_passos), 10, 5);
    }
    
    y += 5;
  } else if (ata.proximos_passos) {
    addSection('4', 'PROXIMOS PASSOS (Anotacoes do Consultor)', safeText(ata.proximos_passos));
  }

  // 5. RESUMO DA REUNIAO (COM PARSER MARKDOWN)
  if (ata.ata_ia) {
    checkPageBreak(30);
    
    // Titulo da secao
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(147, 51, 234); // Purple for AI
    doc.text('5. RESUMO EXECUTIVO (Gerado por Inteligencia Artificial)', margin, y);
    doc.setTextColor(0, 0, 0);
    
    // Linha abaixo do título
    y += 2;
    doc.setLineWidth(0.5);
    doc.setDrawColor(147, 51, 234);
    doc.line(margin, y, pageWidth - margin, y);
    
    y += 6;
    doc.setFontSize(9);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('As informacoes abaixo foram organizadas e geradas pela IA baseadas nas anotacoes da reuniao.', margin, y);
    doc.setTextColor(0, 0, 0);
    
    y += 8;

    // Usar o parser de markdown
    const parsedContent = parseMarkdownToPdf(ata.ata_ia);
    
    parsedContent.forEach(block => {
      // Ajustar fonte baseado no estilo
      if (block.style === 'header') {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
      } else if (block.style === 'subheader') {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
      } else {
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
      }
      
      y += (block.marginTop !== undefined ? block.marginTop : 0);
      
      const indent = block.marginLeft || 0;
      const lines = doc.splitTextToSize(block.text, contentWidth - indent);
      
      lines.forEach(line => {
        checkPageBreak(6);
        doc.text(line, margin + indent, y);
        y += 5;
      });
      
      y += (block.marginBottom !== undefined ? block.marginBottom : 3);
    });
    
    y += 5;
  }

  // 6. DECISÕES TOMADAS
  if (ata.decisoes_tomadas && ata.decisoes_tomadas.length > 0) {
    checkPageBreak(25);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('6. DECISOES TOMADAS (Anotacoes do Consultor)', margin, y);
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
      doc.text(safeText(decisao.decisao), margin + 2, y + 2);
      
      y += 7;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      let detalhes = [];
      if (decisao.responsavel) detalhes.push(`Responsavel: ${safeText(decisao.responsavel)}`);
      if (decisao.prazo) detalhes.push(`Prazo: ${formatPrazoSafe(decisao.prazo)}`);
      
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
    doc.text('7. ACOES DE ACOMPANHAMENTO (Anotacoes do Consultor)', margin, y);
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
      doc.text(safeText(acao.acao), margin + 2, y + 2);
      
      y += 7;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(`Responsavel: ${safeText(acao.responsavel)}`, margin + 2, y);
      
      if (acao.prazo) {
        y += 5;
        doc.setTextColor(100, 100, 100);
        doc.text(`Prazo: ${formatPrazoSafe(acao.prazo)}`, margin + 2, y);
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
      'Os processos abaixo foram discutidos e estao disponiveis para consulta no modulo Processos da plataforma.',
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
      doc.text(`- ${safeText(proc.titulo)}`, margin + 2, y + 2);
      
      y += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(`Categoria: ${safeText(proc.categoria)}`, margin + 2, y);
      
      y += 5;
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text(`Acesse em: Menu > Processos > Buscar "${safeText(proc.titulo)}"`, margin + 2, y);
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
      'As videoaulas abaixo foram indicadas e estao disponiveis no modulo Academia de Treinamento da plataforma.',
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
      doc.text(`- ${safeText(video.titulo)}`, margin + 2, y + 2);
      
      y += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(`Curso: ${safeText(video.descricao)}`, margin + 2, y);
      
      y += 5;
      doc.setFontSize(8);
      doc.setTextColor(147, 51, 234);
      const caminhoVideo = doc.splitTextToSize(
        `Acesse em: Menu > Academia de Treinamento > ${safeText(video.descricao)} > ${safeText(video.titulo)}`,
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
    doc.text('10. MIDIAS E ANEXOS', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    ata.midias_anexas.forEach((midia, idx) => {
      checkPageBreak(15);
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      
      let icone = '[Anexo]';
      if (midia.tipo === 'imagem') icone = '[Img]';
      else if (midia.tipo === 'video') icone = '[Video]';
      else if (midia.tipo === 'link') icone = '[Link]';
      else if (midia.tipo === 'documento') icone = '[Doc]';
      
      doc.text(`${icone} ${safeText(midia.titulo) || `${midia.tipo} ${idx + 1}`}`, margin, y);
      y += 6;
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 100, 100);
      const urlLines = doc.splitTextToSize(safeText(midia.url), contentWidth - 5);
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

  // 11. OBSERVACOES DO CONSULTOR
  if (ata.observacoes_consultor) {
    addSection('11', 'OBSERVACOES DO CONSULTOR (Anotacoes)', safeText(ata.observacoes_consultor));
  }

  // 12. VISAO GERAL DO PROJETO
  if (ata.visao_geral_projeto) {
    addSection('12', 'VISAO GERAL DO PROJETO DE ACELERACAO', safeText(ata.visao_geral_projeto));
  }

  // 13. INTELIGÊNCIA DO CLIENTE
  if (ata.client_intelligence && ata.client_intelligence.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('13. INTELIGENCIA DO CLIENTE (DORES E OPORTUNIDADES)', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    ata.client_intelligence.forEach((item, idx) => {
      // Calcular altura dinâmica baseada no conteúdo
      const areaText = safeText(item.area) + ' - ' + safeText(item.type);
      const subcatText = safeText(item.subcategory || item.title);
      const descText = safeText(item.description);
      const descLines = descText ? doc.splitTextToSize(descText, contentWidth - 5) : [];
      
      // Altura = título(6) + subcategoria(6) + descrição(linhas*4) + padding(8)
      const dynamicHeight = 14 + (descLines.length * 4) + 8;
      checkPageBreak(dynamicHeight + 5);
      
      // Box laranja com altura dinâmica
      doc.setFillColor(255, 247, 237);
      doc.setDrawColor(249, 115, 22);
      doc.setLineWidth(0.5);
      doc.rect(margin, y - 3, contentWidth, dynamicHeight, 'FD');

      // Area - Tipo
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(194, 65, 12);
      doc.text(areaText, margin + 2, y + 2);
      
      // Gravidade
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      const gravidade = safeText(item.gravityLabel || item.gravity || 'Media');
      doc.text('Gravidade: ' + gravidade, pageWidth - margin - 30, y + 2);

      y += 6;
      
      // Subcategoria
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(subcatText, margin + 2, y);
      
      y += 5;
      
      // Descrição
      if (descLines.length > 0) {
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
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
  
  const footerLine1 = `Documento Controlado - Status: ${safeText(ata.status) || 'finalizada'}`;
  const footerLine2 = `Oficinas Master - Impresso em ${format(new Date(), "dd/MM/yyyy 'as' HH:mm")}`;
  
  doc.text(footerLine1, pageWidth / 2, finalY, { align: 'center' });
  doc.text(footerLine2, pageWidth / 2, finalY + 5, { align: 'center' });

  return doc;
};

export const downloadAtaPDF = (ata, workshop) => {
  const doc = generateAtaPDF(ata, workshop);
  const safeCode = safeText(ata?.code) || 'sem-codigo';
  let dateStr = 'sem-data';
  try {
    dateStr = format(new Date(ata?.meeting_date || new Date()), 'ddMMyyyy');
  } catch {
    dateStr = format(new Date(), 'ddMMyyyy');
  }
  const fileName = `ATA_${safeCode}_${dateStr}.pdf`;
  doc.save(fileName);
};
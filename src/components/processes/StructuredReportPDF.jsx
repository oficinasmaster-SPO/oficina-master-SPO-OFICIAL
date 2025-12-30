import jsPDF from "jspdf";
import "jspdf-autotable";
import { base44 } from "@/api/base44Client";

const severidadeColors = {
  critica: [220, 38, 38],
  maior: [249, 115, 22],
  menor: [234, 179, 8]
};

const maturidadeColors = {
  0: [107, 114, 128],
  1: [239, 68, 68],
  2: [249, 115, 22],
  3: [234, 179, 8],
  4: [59, 130, 246],
  5: [34, 197, 94]
};

export async function generateStructuredReportPDF(formData, workshop) {
  console.log("📄 [PDF] Iniciando geração do PDF");
  
  const doc = new jsPDF();
  let yPos = 20;

  // Header com logo placeholder
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("RELATÓRIO DE IMPLEMENTAÇÃO", 105, 12, { align: 'center' });
  doc.setFontSize(11);
  doc.text("Oficinas Master - Consultoria em Gestão", 105, 20, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Empresa: ${formData.empresa || 'N/A'} | Data: ${new Date(formData.data).toLocaleDateString('pt-BR')}`, 105, 27, { align: 'center' });

  yPos = 40;
  doc.setTextColor(0, 0, 0);

  // 1. Informações Iniciais
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text("1. INFORMAÇÕES INICIAIS", 15, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Empresa: ${formData.empresa || '-'}`, 15, yPos);
  yPos += 6;
  doc.text(`Unidade/Área: ${formData.unidade_area || '-'}`, 15, yPos);
  yPos += 6;
  doc.text(`Data: ${new Date(formData.data).toLocaleDateString('pt-BR')}`, 15, yPos);
  doc.text(`Local: ${formData.local || '-'}`, 120, yPos);
  yPos += 6;
  doc.text(`Horário: ${formData.horario_inicio} - ${formData.horario_termino}`, 15, yPos);
  yPos += 8;

  if (formData.normas_om.length > 0 || formData.norma_outra) {
    doc.text("Normas OM Aplicáveis: " + formData.normas_om.join(", ") + (formData.norma_outra ? `, ${formData.norma_outra}` : ""), 15, yPos);
    yPos += 10;
  }

  // 2. Participantes
  if (formData.participantes.length > 0) {
    checkPageBreak();
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text("2. PARTICIPANTES", 15, yPos);
    yPos += 8;

    doc.autoTable({
      startY: yPos,
      head: [['Nome', 'Cargo', 'Empresa', 'E-mail']],
      body: formData.participantes.map(p => [p.nome, p.cargo, p.empresa, p.email]),
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
      margin: { left: 15, right: 15 }
    });
    yPos = doc.lastAutoTable.finalY + 10;
  }

  // 3. Objetivo e Escopo
  checkPageBreak();
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text("3. OBJETIVO DA CONSULTORIA", 15, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const objetivoLines = doc.splitTextToSize(formData.objetivo_consultoria || 'Não informado', 180);
  doc.text(objetivoLines, 15, yPos);
  yPos += objetivoLines.length * 5 + 8;

  checkPageBreak();
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text("Escopo Avaliado", 15, yPos);
  yPos += 6;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Processo(s): ${formData.escopo_processos || '-'}`, 15, yPos);
  yPos += 6;
  doc.text(`Área(s): ${formData.escopo_areas || '-'}`, 15, yPos);
  yPos += 6;
  doc.text(`Responsável(is): ${formData.escopo_responsaveis || '-'}`, 15, yPos);
  yPos += 10;

  // 4. Atividades Realizadas
  checkPageBreak();
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text("4. ATIVIDADES REALIZADAS", 15, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  const atividadesRealizadas = [];
  if (formData.atividades.entrevistas) atividadesRealizadas.push("✓ Entrevistas com responsáveis");
  if (formData.atividades.analise_documental) atividadesRealizadas.push("✓ Análise documental");
  if (formData.atividades.observacao_in_loco) atividadesRealizadas.push("✓ Observação in loco");
  if (formData.atividades.mapeamento_processos) atividadesRealizadas.push("✓ Mapeamento de processos");
  if (formData.atividades.avaliacao_indicadores) atividadesRealizadas.push("✓ Avaliação de indicadores");
  if (formData.atividades.outro && formData.atividade_outro_texto) atividadesRealizadas.push(`✓ ${formData.atividade_outro_texto}`);

  atividadesRealizadas.forEach(ativ => {
    doc.text(ativ, 20, yPos);
    yPos += 6;
  });
  yPos += 5;

  // 5. Diagnóstico
  checkPageBreak();
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text("5. DIAGNÓSTICO", 15, yPos);
  yPos += 8;

  doc.setFontSize(12);
  doc.text("Pontos Conformes", 15, yPos);
  yPos += 6;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const conformesLines = doc.splitTextToSize(formData.pontos_conformes || 'Não informado', 180);
  doc.text(conformesLines, 15, yPos);
  yPos += conformesLines.length * 5 + 8;

  if (formData.nao_conformidades.length > 0) {
    checkPageBreak();
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Não Conformidades / Lacunas", 15, yPos);
    yPos += 6;

    // Agrupar por severidade
    const criticas = formData.nao_conformidades.filter(nc => nc.severidade === 'critica');
    const maiores = formData.nao_conformidades.filter(nc => nc.severidade === 'maior');
    const menores = formData.nao_conformidades.filter(nc => nc.severidade === 'menor' || !nc.severidade);

    doc.autoTable({
      startY: yPos,
      head: [['Nº', 'Severidade', 'Descrição', 'Requisito OM']],
      body: formData.nao_conformidades.map(nc => [
        nc.numero,
        nc.severidade === 'critica' ? 'CRÍTICA' : nc.severidade === 'maior' ? 'MAIOR' : 'MENOR',
        nc.descricao,
        nc.requisito_om
      ]),
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
      margin: { left: 15, right: 15 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 22 },
        2: { cellWidth: 95 },
        3: { cellWidth: 35 }
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 1) {
          const sev = data.cell.raw;
          if (sev === 'CRÍTICA') {
            data.cell.styles.fillColor = [254, 226, 226];
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = 'bold';
          } else if (sev === 'MAIOR') {
            data.cell.styles.fillColor = [255, 237, 213];
            data.cell.styles.textColor = [194, 65, 12];
          } else {
            data.cell.styles.fillColor = [254, 249, 195];
            data.cell.styles.textColor = [161, 98, 7];
          }
        }
      }
    });
    yPos = doc.lastAutoTable.finalY + 8;

    // Resumo de não conformidades
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Resumo: ${criticas.length} Crítica(s) | ${maiores.length} Maior(es) | ${menores.length} Menor(es)`, 15, yPos);
    yPos += 8;
  }

  // 6. Oportunidades de Melhoria
  if (formData.oportunidades_melhoria) {
    checkPageBreak();
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text("6. OPORTUNIDADES DE MELHORIA", 15, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const oportunidadesLines = doc.splitTextToSize(formData.oportunidades_melhoria, 180);
    doc.text(oportunidadesLines, 15, yPos);
    yPos += oportunidadesLines.length * 5 + 10;
  }

  // 7. Plano de Ação
  if (formData.plano_acao.length > 0) {
    checkPageBreak();
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text("7. PLANO DE AÇÃO", 15, yPos);
    yPos += 8;

    doc.autoTable({
      startY: yPos,
      head: [['Nº', 'Ação', 'Responsável', 'Prazo', 'Status']],
      body: formData.plano_acao.map(acao => [
        acao.numero,
        acao.acao,
        acao.responsavel,
        acao.prazo ? new Date(acao.prazo).toLocaleDateString('pt-BR') : '-',
        acao.status
      ]),
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
      margin: { left: 15, right: 15 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 70 }
      }
    });
    yPos = doc.lastAutoTable.finalY + 10;
  }

  // 8. Conclusão
  checkPageBreak();
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text("8. CONCLUSÃO", 15, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const conclusaoLines = doc.splitTextToSize(formData.conclusao || 'Não informado', 180);
  doc.text(conclusaoLines, 15, yPos);
  yPos += conclusaoLines.length * 5 + 10;

  // 9. Próxima Etapa
  if (formData.proxima_etapa_data || formData.proxima_etapa_objetivo) {
    checkPageBreak();
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text("9. PRÓXIMA ETAPA", 15, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Data Prevista: ${formData.proxima_etapa_data ? new Date(formData.proxima_etapa_data).toLocaleDateString('pt-BR') : '-'}`, 15, yPos);
    yPos += 6;
    doc.text(`Objetivo: ${formData.proxima_etapa_objetivo || '-'}`, 15, yPos);
    yPos += 10;
  }

  // 10. Nível de Maturidade com Gráfico Visual
  checkPageBreak(50);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text("10. NÍVEL DE MATURIDADE", 15, yPos);
  yPos += 10;
  
  const maturidadeLevels = [
    { nivel: 0, label: "Inexistente" },
    { nivel: 1, label: "Inicial" },
    { nivel: 2, label: "Documentado" },
    { nivel: 3, label: "Implementado" },
    { nivel: 4, label: "Gerenciado" },
    { nivel: 5, label: "Otimizado" }
  ];
  
  // Desenhar barra de progresso visual
  const barX = 15;
  const barY = yPos;
  const barWidth = 180;
  const barHeight = 15;
  const segmentWidth = barWidth / 6;

  // Fundo cinza
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(barX, barY, barWidth, barHeight, 3, 3, 'F');

  // Preenchimento colorido até o nível atual
  for (let i = 0; i <= formData.nivel_maturidade && i <= 5; i++) {
    const color = maturidadeColors[i];
    doc.setFillColor(color[0], color[1], color[2]);
    if (i === 0) {
      doc.roundedRect(barX, barY, segmentWidth, barHeight, 3, 0, 'F');
    } else if (i === formData.nivel_maturidade) {
      doc.rect(barX + (i * segmentWidth), barY, segmentWidth, barHeight, 'F');
    } else {
      doc.rect(barX + (i * segmentWidth), barY, segmentWidth, barHeight, 'F');
    }
  }

  // Labels dos níveis
  yPos += barHeight + 3;
  doc.setFontSize(7);
  doc.setTextColor(100);
  for (let i = 0; i <= 5; i++) {
    doc.text(String(i), barX + (i * segmentWidth) + (segmentWidth / 2), yPos, { align: 'center' });
  }
  
  yPos += 8;
  const selectedLevel = maturidadeLevels.find(l => l.nivel === formData.nivel_maturidade);
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont(undefined, 'bold');
  const levelColor = maturidadeColors[formData.nivel_maturidade];
  doc.setTextColor(levelColor[0], levelColor[1], levelColor[2]);
  doc.text(`Nível ${formData.nivel_maturidade} - ${selectedLevel?.label || 'Não informado'}`, 15, yPos);
  doc.setTextColor(0);
  yPos += 12;

  // 11. Assinaturas com Assinatura Digital
  checkPageBreak(60);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text("11. ASSINATURAS", 15, yPos);
  yPos += 10;

  // Caixa do Consultor
  doc.setDrawColor(200);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(15, yPos, 85, 45, 2, 2, 'FD');
  
  // Caixa do Representante
  doc.roundedRect(110, yPos, 85, 45, 2, 2, 'FD');

  // Assinatura digital do consultor (se existir)
  if (formData.consultor_assinatura) {
    try {
      doc.addImage(formData.consultor_assinatura, 'PNG', 20, yPos + 5, 75, 20);
    } catch (e) {
      console.log("Erro ao adicionar assinatura consultor");
    }
  }
  
  // Assinatura digital do representante (se existir)
  if (formData.representante_assinatura) {
    try {
      doc.addImage(formData.representante_assinatura, 'PNG', 115, yPos + 5, 75, 20);
    } catch (e) {
      console.log("Erro ao adicionar assinatura representante");
    }
  }

  // Linhas de assinatura
  doc.setDrawColor(0);
  doc.line(20, yPos + 28, 95, yPos + 28);
  doc.line(115, yPos + 28, 190, yPos + 28);
  
  // Nomes e cargos
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text(`${formData.consultor_nome || 'Consultor'}`, 57.5, yPos + 33, { align: 'center' });
  doc.text(`${formData.representante_nome || 'Representante'}`, 152.5, yPos + 33, { align: 'center' });
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  doc.text(`${formData.consultor_cargo || 'Consultor Oficinas Master'}`, 57.5, yPos + 38, { align: 'center' });
  doc.text(`${formData.representante_cargo || 'Representante da Empresa'}`, 152.5, yPos + 38, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 57.5, yPos + 43, { align: 'center' });
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 152.5, yPos + 43, { align: 'center' });
  doc.setTextColor(0);

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 195, 290, { align: 'right' });
  }

  // Helper functions
  function checkPageBreak(requiredSpace = 30) {
    if (yPos > 270 - requiredSpace) {
      doc.addPage();
      yPos = 20;
    }
  }

  // Convert to Blob and upload
  try {
    console.log("📄 [PDF] Gerando blob do documento...");
    const pdfBlob = doc.output('blob');
    console.log("📄 [PDF] Blob gerado:", pdfBlob.size, "bytes");
    
    const fileName = `relatorio_implementacao_${Date.now()}.pdf`;
    console.log("📄 [PDF] Nome do arquivo:", fileName);
    
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
    console.log("📄 [PDF] File criado:", pdfFile);
    
    console.log("📄 [PDF] Tentando upload...");
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file: pdfFile });
      console.log("📄 [PDF] Upload completo:", uploadResult);
      
      if (!uploadResult || !uploadResult.file_url) {
        throw new Error("URL do arquivo não retornada");
      }
      
      console.log("📄 [PDF] ✅ PDF enviado com sucesso:", uploadResult.file_url);
      return { file_url: uploadResult.file_url, downloadMode: false };
      
    } catch (uploadError) {
      // Se erro de limite (402), fazer download local
      if (uploadError.message && (uploadError.message.includes('limit') || uploadError.message.includes('upgrade') || uploadError.message.includes('402'))) {
        console.log("⚠️ [PDF] Limite atingido - ativando modo download");
        
        // Download automático do PDF
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log("✅ [PDF] Download local iniciado");
        return { 
          file_url: 'local_download', 
          downloadMode: true,
          fileName: fileName
        };
      }
      
      throw uploadError;
    }
    
  } catch (error) {
    console.error("📄 [PDF] ❌ ERRO:", error.message);
    throw new Error("Falha ao gerar PDF: " + error.message);
  }
}
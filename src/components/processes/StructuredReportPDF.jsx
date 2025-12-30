import jsPDF from "jspdf";
import "jspdf-autotable";
import { base44 } from "@/api/base44Client";

export async function generateStructuredReportPDF(formData, workshop) {
  console.log("📄 [PDF] Iniciando geração do PDF");
  console.log("📄 [PDF] FormData recebido:", formData);
  console.log("📄 [PDF] Workshop recebido:", workshop);
  
  const doc = new jsPDF();
  let yPos = 20;

  // Header
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("RELATÓRIO DE IMPLEMENTAÇÃO ESTRUTURADA", 105, 12, { align: 'center' });
  doc.setFontSize(11);
  doc.text("Oficinas Master", 105, 19, { align: 'center' });

  yPos = 35;
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

    doc.autoTable({
      startY: yPos,
      head: [['Nº', 'Descrição', 'Requisito OM', 'Evidência']],
      body: formData.nao_conformidades.map(nc => [
        nc.numero,
        nc.descricao,
        nc.requisito_om,
        nc.evidencia
      ]),
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
      margin: { left: 15, right: 15 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 80 }
      }
    });
    yPos = doc.lastAutoTable.finalY + 10;
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

  // 10. Nível de Maturidade
  checkPageBreak();
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text("10. NÍVEL DE MATURIDADE", 15, yPos);
  yPos += 8;
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  
  const maturidadeLevels = [
    { nivel: 0, label: "Inexistente", icon: "❌" },
    { nivel: 1, label: "Inicial", icon: "⚠️" },
    { nivel: 2, label: "Documentado", icon: "📄" },
    { nivel: 3, label: "Implementado", icon: "✔️" },
    { nivel: 4, label: "Gerenciado", icon: "✔️✔️" },
    { nivel: 5, label: "Otimizado", icon: "⭐" }
  ];
  
  const selectedLevel = maturidadeLevels.find(l => l.nivel === formData.nivel_maturidade);
  doc.text(`Nível ${formData.nivel_maturidade} - ${selectedLevel?.label || 'Não informado'}`, 15, yPos);
  yPos += 10;

  // 11. Assinaturas
  checkPageBreak(40);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text("11. ASSINATURAS", 15, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.line(15, yPos, 90, yPos);
  doc.line(120, yPos, 195, yPos);
  yPos += 5;
  doc.text(`${formData.consultor_nome || 'Consultor'}`, 15, yPos);
  doc.text(`${formData.representante_nome || 'Representante da Empresa'}`, 120, yPos);
  yPos += 5;
  doc.setFontSize(9);
  doc.text(`${formData.consultor_cargo || 'Cargo'}`, 15, yPos);
  doc.text(`${formData.representante_cargo || 'Cargo'}`, 120, yPos);
  yPos += 5;
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 15, yPos);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 120, yPos);

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
    
    console.log("📄 [PDF] Fazendo upload...");
    const uploadResult = await base44.integrations.Core.UploadFile({ file: pdfFile });
    console.log("📄 [PDF] Upload completo:", uploadResult);
    
    if (!uploadResult || !uploadResult.file_url) {
      console.error("📄 [PDF] ❌ Upload result inválido:", uploadResult);
      throw new Error("URL do arquivo não retornada pelo servidor");
    }
    
    console.log("📄 [PDF] ✅ PDF gerado e enviado com sucesso:", uploadResult.file_url);
    return { file_url: uploadResult.file_url };
    
  } catch (error) {
    console.error("📄 [PDF] ❌ ERRO ao fazer upload:", error);
    console.error("📄 [PDF] Stack:", error.stack);
    throw new Error("Falha ao fazer upload do PDF: " + error.message);
  }
}
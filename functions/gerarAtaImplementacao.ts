import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      workshop_id, 
      modulo_codigo, 
      processo_titulo, 
      observacoes, 
      avaliacao, 
      participantes = [], 
      evidencia_url,
      data_conclusao 
    } = body;

    // Buscar oficina
    const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);
    if (!workshop) {
      return Response.json({ error: 'Oficina não encontrada' }, { status: 404 });
    }

    // Gerar código único da ATA
    const atasCount = await base44.asServiceRole.entities.MeetingMinutes.filter({ workshop_id });
    const codigoAta = `IT.${String(atasCount.length + 1).padStart(4, '0')}`;

    // Criar ATA no banco
    const ata = await base44.asServiceRole.entities.MeetingMinutes.create({
      code: codigoAta,
      workshop_id: workshop_id,
      meeting_date: new Date(data_conclusao).toISOString().split('T')[0],
      meeting_time: new Date(data_conclusao).toTimeString().slice(0, 5),
      tipo_aceleracao: 'evidencia_implementacao',
      consultor_id: user.id,
      consultor_name: user.full_name,
      participantes: participantes.map(p => ({ nome: p.nome, role: p.cargo })),
      pautas: `Implementação do processo: ${processo_titulo} (${modulo_codigo})`,
      objetivos_consultor: observacoes,
      midias_anexas: evidencia_url ? [{ tipo: 'documento', url: evidencia_url, titulo: 'Evidência de Implementação' }] : [],
      ai_summary: {
        resumo_executivo: `Ata de Evidência de Implementação do processo ${processo_titulo}`,
        evolucao_cliente: `Avaliação de efetividade: ${avaliacao}/5 estrelas`,
        recomendacoes: ['Esta ata evidencia a IMPLEMENTAÇÃO do processo', 'Não avalia maturidade, resultados, execução ou eficiência', 'Serve como registro de que o processo foi executado conforme planejado']
      },
      status: 'finalizada'
    });

    // Gerar PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = 20;

    // Helper para texto
    const addText = (text, fontSize = 11, isBold = false, color = [0, 0, 0]) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, margin, yPos);
      yPos += lines.length * (fontSize * 0.5) + 3;
    };

    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ATA DE EVIDÊNCIA DE IMPLEMENTAÇÃO', pageWidth / 2, 25, { align: 'center' });
    
    yPos = 50;

    // Disclaimer importante
    doc.setFillColor(255, 243, 205);
    doc.rect(margin - 5, yPos - 5, contentWidth + 10, 30, 'F');
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('⚠️ IMPORTANTE: Esta ata evidencia a IMPLEMENTAÇÃO do processo.', margin, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text('Não avalia: maturidade, resultados, execução ou eficiência.', margin, yPos);
    yPos += 15;

    // Informações básicas
    doc.setTextColor(0, 0, 0);
    addText(`Código da ATA: ${codigoAta}`, 12, true);
    addText(`Cliente: ${workshop.name}`, 11);
    addText(`CNPJ: ${workshop.cnpj || 'Não informado'}`, 11);
    addText(`Cidade/Estado: ${workshop.city}/${workshop.state}`, 11);
    addText(`Data de Conclusão: ${new Date(data_conclusao).toLocaleDateString('pt-BR')}`, 11);
    addText(`Consultor Responsável: ${user.full_name}`, 11);
    yPos += 5;

    // Processo implementado
    addText('PROCESSO IMPLEMENTADO', 14, true, [37, 99, 235]);
    addText(`Título: ${processo_titulo}`, 11);
    addText(`Código do Módulo: ${modulo_codigo}`, 11);
    yPos += 5;

    // Participantes
    addText('PARTICIPANTES PRESENTES', 14, true, [37, 99, 235]);
    participantes.forEach(p => {
      addText(`• ${p.nome} - ${p.cargo}`, 11);
    });
    yPos += 5;

    // Avaliação
    addText('AVALIAÇÃO DE EFETIVIDADE DA IMPLEMENTAÇÃO', 14, true, [37, 99, 235]);
    const avaliacaoTexto = avaliacao === 5 ? 'Excelente' : avaliacao === 4 ? 'Muito Bom' : avaliacao === 3 ? 'Bom' : avaliacao === 2 ? 'Regular' : 'Precisa Melhorar';
    addText(`Classificação: ${avaliacao}/5 estrelas - ${avaliacaoTexto}`, 11);
    yPos += 5;

    // Observações
    addText('OBSERVAÇÕES E NOTAS DA IMPLEMENTAÇÃO', 14, true, [37, 99, 235]);
    addText(observacoes || 'Nenhuma observação registrada', 11);
    yPos += 10;

    // Evidência
    if (evidencia_url) {
      addText('EVIDÊNCIA ANEXADA', 14, true, [37, 99, 235]);
      addText('Arquivo de evidência disponível no sistema', 11);
      addText(`URL: ${evidencia_url}`, 9, false, [100, 100, 100]);
      yPos += 5;
    }

    // Footer
    yPos = doc.internal.pageSize.getHeight() - 30;
    doc.setFillColor(240, 240, 240);
    doc.rect(0, yPos - 5, pageWidth, 40, 'F');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.text('Oficinas Master - Plataforma de Gestão Automotiva', pageWidth / 2, yPos + 5, { align: 'center' });
    doc.text(`Documento gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, yPos + 12, { align: 'center' });

    // Salvar PDF como base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    
    // Upload do PDF
    const pdfBlob = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    const pdfFile = new File([pdfBlob], `ATA_${codigoAta}_${workshop.name.replace(/\s/g, '_')}.pdf`, { type: 'application/pdf' });
    
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });

    // Atualizar ATA com URL do PDF
    await base44.asServiceRole.entities.MeetingMinutes.update(ata.id, {
      midias_anexas: [
        ...(evidencia_url ? [{ tipo: 'documento', url: evidencia_url, titulo: 'Evidência de Implementação' }] : []),
        { tipo: 'documento', url: uploadResult.file_url, titulo: `ATA ${codigoAta}` }
      ]
    });

    // Notificar usuários sobre nova ATA
    try {
      await base44.asServiceRole.functions.invoke('notificarNovaAta', {
        workshop_id: workshop_id,
        ata_codigo: codigoAta,
        ata_tipo: 'evidencia_implementacao',
        criado_por_id: user.id
      });
    } catch (error) {
      console.error("Erro ao notificar nova ATA:", error);
    }

    return Response.json({ 
      success: true, 
      ata_id: ata.id,
      codigo: codigoAta,
      pdf_url: uploadResult.file_url
    });

  } catch (error) {
    console.error("❌ Erro ao gerar ATA de implementação:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
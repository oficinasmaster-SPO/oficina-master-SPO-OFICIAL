import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id } = await req.json();

    // Buscar dados da oficina
    const workshop = await base44.entities.Workshop.get(workshop_id);
    
    // Buscar missão, visão e valores
    const mvvList = await base44.entities.MissionVisionValues.filter({ workshop_id });
    
    if (!mvvList || mvvList.length === 0) {
      return Response.json({ error: 'Nenhum manual de cultura encontrado' }, { status: 404 });
    }

    const mvv = mvvList[0];

    // Criar PDF
    const doc = new jsPDF();
    let yPosition = 20;
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(59, 130, 246); // Blue
    doc.text(workshop.name || 'Oficina', 105, yPosition, { align: 'center' });
    
    yPosition += 10;
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('Manual de Cultura Organizacional', 105, yPosition, { align: 'center' });
    
    yPosition += 15;
    doc.setLineWidth(0.5);
    doc.setDrawColor(59, 130, 246);
    doc.line(20, yPosition, 190, yPosition);
    
    yPosition += 15;

    // Missão
    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246);
    doc.text('🎯 Missão', 20, yPosition);
    
    yPosition += 10;
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    
    const missionLines = doc.splitTextToSize(mvv.mission_statement || '', 170);
    doc.setFont(undefined, 'italic');
    doc.text(missionLines, 20, yPosition);
    doc.setFont(undefined, 'normal');
    
    yPosition += (missionLines.length * 7) + 15;

    // Visão
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(16);
    doc.setTextColor(139, 92, 246); // Purple
    doc.text('👁️ Visão', 20, yPosition);
    
    yPosition += 10;
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    
    const visionLines = doc.splitTextToSize(mvv.vision_statement || '', 170);
    doc.setFont(undefined, 'italic');
    doc.text(visionLines, 20, yPosition);
    doc.setFont(undefined, 'normal');
    
    yPosition += (visionLines.length * 7) + 15;

    // Valores
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(16);
    doc.setTextColor(236, 72, 153); // Pink
    doc.text('❤️ Valores', 20, yPosition);
    
    yPosition += 10;

    if (mvv.core_values && mvv.core_values.length > 0) {
      mvv.core_values.forEach((value, index) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        // Nome do valor
        doc.setFontSize(12);
        doc.setTextColor(59, 130, 246);
        doc.setFont(undefined, 'bold');
        doc.text(`${index + 1}. ${value.name}`, 25, yPosition);
        doc.setFont(undefined, 'normal');
        
        yPosition += 7;

        // Definição
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        const defLines = doc.splitTextToSize(value.definition || '', 165);
        doc.text(defLines, 25, yPosition);
        
        yPosition += (defLines.length * 5) + 5;

        // Evidências comportamentais
        if (value.behavioral_evidence && value.behavioral_evidence.length > 0) {
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          
          value.behavioral_evidence.forEach((evidence) => {
            if (yPosition > 270) {
              doc.addPage();
              yPosition = 20;
            }
            
            const evidenceLines = doc.splitTextToSize(`• ${evidence}`, 160);
            doc.text(evidenceLines, 30, yPosition);
            yPosition += (evidenceLines.length * 5) + 2;
          });
        }

        yPosition += 8;
      });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${pageCount}`,
        105,
        290,
        { align: 'center' }
      );
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Manual_Cultura_${workshop.name || 'Oficina'}.pdf`
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
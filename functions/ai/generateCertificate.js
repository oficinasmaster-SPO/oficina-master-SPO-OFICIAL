import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_name, course_name, completion_date, workshop_name } = await req.json();

    if (!user_name || !course_name) {
      return Response.json({ error: 'Missing required data' }, { status: 400 });
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Background / Border
    doc.setDrawColor(212, 175, 55); // Gold
    doc.setLineWidth(2);
    doc.rect(10, 10, 277, 190);
    
    doc.setDrawColor(0, 51, 102); // Navy
    doc.setLineWidth(1);
    doc.rect(15, 15, 267, 180);

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(40);
    doc.setTextColor(0, 51, 102);
    doc.text('CERTIFICADO', 148.5, 50, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100);
    doc.text('DE CONCLUSÃO', 148.5, 60, { align: 'center' });

    // Body
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Certificamos que', 148.5, 80, { align: 'center' });

    doc.setFont('times', 'italic');
    doc.setFontSize(30);
    doc.setTextColor(0, 51, 102);
    doc.text(user_name, 148.5, 95, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(70, 98, 227, 98);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('concluiu com êxito o curso/módulo:', 148.5, 115, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(course_name, 148.5, 130, { align: 'center' });

    if (workshop_name) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Oferecido por: ${workshop_name}`, 148.5, 145, { align: 'center' });
    }

    // Date and Signatures
    const dateStr = new Date(completion_date || Date.now()).toLocaleDateString('pt-BR');
    
    doc.setFontSize(12);
    doc.text(`Data de Conclusão: ${dateStr}`, 60, 170, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(180, 170, 250, 170);
    doc.text('Oficinas Master', 215, 176, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Diretoria de Ensino', 215, 181, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=certificado_${user_name.replace(/\s+/g, '_')}.pdf`
      }
    });

  } catch (error) {
    return Response.json({ error.message }, { status: 500 });
  }
});

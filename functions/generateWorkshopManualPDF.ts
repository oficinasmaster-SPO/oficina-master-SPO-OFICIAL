import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import jsPDF from 'npm:jspdf@4.0.0';
import 'npm:html2canvas@1.4.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { workshop_id, include_master_processes } = await req.json();

    if (!workshop_id) {
      return new Response(JSON.stringify({ error: 'workshop_id is required' }), { status: 400 });
    }

    // Buscar workshop
    const workshop = await base44.entities.Workshop.get(workshop_id);
    if (!workshop) {
      return new Response(JSON.stringify({ error: 'Workshop not found' }), { status: 404 });
    }

    // Buscar todos os processos
    const allProcessos = await base44.entities.ProcessDocument.list();
    const processos = include_master_processes
      ? allProcessos.filter(p => p.is_template || p.workshop_id === workshop_id)
      : allProcessos.filter(p => p.workshop_id === workshop_id);

    // Buscar todos os ITs
    const allITs = await base44.entities.InstructionDocument.list();
    const instructionDocs = include_master_processes
      ? allITs.filter(it => it.is_official || it.workshop_id === workshop_id)
      : allITs.filter(it => it.workshop_id === workshop_id);

    // Buscar dados complementares
    const [cultura, cargos, areas] = await Promise.all([
      base44.entities.MissionVisionValues.filter({ workshop_id: workshop_id }).then(r => r?.[0] || null),
      base44.entities.JobDescription.filter({ workshop_id: workshop_id }),
      base44.entities.ProcessArea.list()
    ]);

    // Gerar conteúdo HTML do manual
    const htmlContent = generateManualHTML({
      cultura,
      processos,
      instructionDocs,
      cargos,
      areas,
      workshop,
      include_master_processes
    });

    // Gerar PDF via jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Adicionar conteúdo ao PDF (simplificado)
    doc.setFontSize(16);
    doc.text('Manual de Processos e Procedimentos', 20, 20);
    doc.setFontSize(12);
    doc.text(workshop.name, 20, 30);

    if (include_master_processes) {
      doc.text('(com Processos Oficinas Master)', 20, 40);
    } else {
      doc.text('(sem Processos Oficinas Master)', 20, 40);
    }

    doc.setFontSize(10);
    let yPosition = 60;

    // Adicionar processos
    doc.setFontSize(12);
    doc.text('Processos (MAPs)', 20, yPosition);
    yPosition += 10;

    if (processos.length > 0) {
      doc.setFontSize(9);
      processos.forEach(proc => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(`${proc.code} - ${proc.title}`, 20, yPosition);
        yPosition += 8;
      });
    } else {
      doc.text('Nenhum processo cadastrado', 20, yPosition);
      yPosition += 10;
    }

    // Adicionar ITs
    yPosition += 10;
    doc.setFontSize(12);
    doc.text('Instruções Técnicas (ITs)', 20, yPosition);
    yPosition += 10;

    if (instructionDocs.length > 0) {
      doc.setFontSize(9);
      instructionDocs.forEach(it => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(`${it.title}`, 20, yPosition);
        yPosition += 8;
      });
    } else {
      doc.text('Nenhuma instrução técnica cadastrada', 20, yPosition);
    }

    // Footer
    doc.setFontSize(8);
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} via Oficinas Master`, 20, 290);

    // Converter para Base64
    const pdfBase64 = doc.output('datauristring');
    
    // Retornar o PDF em Base64
    return new Response(JSON.stringify({ 
      pdf_data: pdfBase64,
      success: true 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    console.error('Stack:', error.stack);
    return new Response(JSON.stringify({ error: error.message, details: String(error) }), { status: 500 });
  }
});

function generateManualHTML({cultura, processos, instructionDocs, cargos, areas, workshop, include_master_processes}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Manual de Processos</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        h2 { color: #666; border-bottom: 2px solid #999; padding-bottom: 10px; }
        .section { margin-bottom: 20px; page-break-inside: avoid; }
      </style>
    </head>
    <body>
      <h1>Manual de Processos e Procedimentos</h1>
      <p><strong>${workshop.name}</strong></p>
      ${include_master_processes ? '<p><em>Com Processos Oficinas Master</em></p>' : '<p><em>Sem Processos Oficinas Master</em></p>'}
      <p>Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
    </body>
    </html>
  `;
}
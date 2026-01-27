import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import jsPDF from 'npm:jspdf@2.5.2';
import 'npm:jspdf-autotable@3.8.2';

async function calculateContentHash(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(content));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function loadImageAsBase64(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.log('Erro ao carregar imagem:', error);
    return null;
  }
}

async function generatePDF(data) {
  const { cultura, processos, instructionDocs, cargos, areas, workshop } = data;

  // Pré-carregar imagens
  const imageCache = {};
  const allImageUrls = [
    ...processos.map(p => p.content_json?.fluxo_image_url).filter(Boolean),
    ...instructionDocs.map(it => it.content?.fluxo_image_url).filter(Boolean)
  ];

  for (const url of allImageUrls) {
    if (!imageCache[url]) {
      imageCache[url] = await loadImageAsBase64(url);
    }
  }

  const doc = new jsPDF();
  let yPos = 20;

  const checkPageBreak = (requiredSpace = 20) => {
    if (yPos + requiredSpace > 270) {
      doc.addPage();
      yPos = 20;
    }
  };

  // CAPA
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 297, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.text('Manual de Processos', 105, 100, { align: 'center' });
  doc.text('e Procedimentos', 105, 115, { align: 'center' });

  doc.setFontSize(20);
  doc.text(workshop?.name || 'Empresa', 105, 140, { align: 'center' });

  doc.setFontSize(12);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 105, 270, { align: 'center' });
  doc.text('Oficinas Master', 105, 280, { align: 'center' });

  // ÍNDICE
  doc.addPage();
  yPos = 20;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(20);
  doc.text('Índice', 20, yPos);
  yPos += 15;
  doc.setFontSize(11);
  const indices = [
    '1. Apresentação Institucional',
    '2. Estrutura Organizacional',
    '3. Áreas da Empresa',
    '4. Processos por Área',
    '5. Funções e Descrições de Cargo',
    '6. Indicadores e Metas',
    '7. Regras Gerais e Compliance'
  ];

  indices.forEach(item => {
    doc.text(item, 25, yPos);
    yPos += 8;
  });

  // APRESENTAÇÃO
  doc.addPage();
  yPos = 20;
  doc.setFontSize(18);
  doc.setTextColor(59, 130, 246);
  doc.text('1. Apresentação Institucional', 20, yPos);
  yPos += 12;

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  if (cultura?.mission_statement) {
    doc.setFont(undefined, 'bold');
    doc.text('Missão', 20, yPos);
    yPos += 7;
    doc.setFont(undefined, 'normal');
    const missionLines = doc.splitTextToSize(cultura.mission_statement, 170);
    doc.text(missionLines, 20, yPos);
    yPos += missionLines.length * 7 + 5;
    checkPageBreak();
  }

  if (cultura?.vision_statement) {
    doc.setFont(undefined, 'bold');
    doc.text('Visão', 20, yPos);
    yPos += 7;
    doc.setFont(undefined, 'normal');
    const visionLines = doc.splitTextToSize(cultura.vision_statement, 170);
    doc.text(visionLines, 20, yPos);
    yPos += visionLines.length * 7 + 5;
    checkPageBreak();
  }

  if (cultura?.core_values && cultura.core_values.length > 0) {
    doc.setFont(undefined, 'bold');
    doc.text('Valores', 20, yPos);
    yPos += 7;
    doc.setFont(undefined, 'normal');

    cultura.core_values.forEach(value => {
      checkPageBreak(15);
      doc.setFont(undefined, 'bold');
      doc.text(`• ${value.name}`, 25, yPos);
      yPos += 6;
      doc.setFont(undefined, 'normal');
      const defLines = doc.splitTextToSize(value.definition, 160);
      doc.text(defLines, 30, yPos);
      yPos += defLines.length * 6 + 4;
    });
  }

  // ESTRUTURA
  doc.addPage();
  yPos = 20;
  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129);
  doc.text('2. Estrutura Organizacional', 20, yPos);
  yPos += 12;

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total de Colaboradores: ${workshop?.employees_count || 1}`, 20, yPos);
  yPos += 7;
  doc.text(`Áreas Ativas: ${areas.length}`, 20, yPos);
  yPos += 15;

  // ÁREAS
  doc.setFontSize(18);
  doc.setTextColor(249, 115, 22);
  doc.text('3. Áreas da Empresa', 20, yPos);
  yPos += 12;

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'bold');
  doc.text('Áreas Gerais:', 20, yPos);
  yPos += 7;
  doc.setFont(undefined, 'normal');

  areas.filter(a => a.category === 'geral').forEach(area => {
    checkPageBreak();
    doc.text(`• ${area.name}`, 25, yPos);
    yPos += 6;
  });

  yPos += 5;
  checkPageBreak(20);
  doc.setFont(undefined, 'bold');
  doc.text('Áreas Técnicas:', 20, yPos);
  yPos += 7;
  doc.setFont(undefined, 'normal');

  areas.filter(a => a.category === 'tecnica').forEach(area => {
    checkPageBreak();
    doc.text(`• ${area.name}`, 25, yPos);
    yPos += 6;
  });

  // PROCESSOS
  doc.addPage();
  yPos = 20;
  doc.setFontSize(18);
  doc.setTextColor(139, 92, 246);
  doc.text('4. Processos por Área', 20, yPos);
  yPos += 12;

  const allAreas = [...areas];
  const processosSemArea = processos.filter(p => !p.area_id);
  const itsSemArea = instructionDocs.filter(it => !it.area_id);

  if (processosSemArea.length > 0 || itsSemArea.length > 0) {
    allAreas.push({
      id: 'sem_area',
      name: 'Processos Gerais',
      category: 'geral',
      description: 'Processos não vinculados a uma área específica'
    });
  }

  allAreas.forEach(area => {
    const areaProcessos = area.id === 'sem_area'
      ? processosSemArea
      : processos.filter(p => p.area_id === area.id);
    const areaITs = area.id === 'sem_area'
      ? itsSemArea
      : instructionDocs.filter(it => it.area_id === area.id);

    if (areaProcessos.length === 0 && areaITs.length === 0) return;

    // MAPs
    areaProcessos.forEach(processo => {
      doc.addPage();
      yPos = 20;

      doc.setFillColor(59, 130, 246);
      doc.rect(15, yPos - 5, 180, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('MAP - Mapa de Processo', 20, yPos + 5);
      doc.setFont(undefined, 'normal');
      yPos += 20;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(processo.title, 20, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Código: ${processo.code || 'N/A'}`, 20, yPos);
      yPos += 6;
      doc.text(`Versão: ${processo.revision || '1'}`, 20, yPos);
      yPos += 10;

      const content = processo.content_json || {};

      if (content.objetivo) {
        doc.setFont(undefined, 'bold');
        doc.text('1. OBJETIVO', 20, yPos);
        yPos += 7;
        doc.setFont(undefined, 'normal');
        const objLines = doc.splitTextToSize(content.objetivo, 170);
        doc.text(objLines, 20, yPos);
        yPos += objLines.length * 6 + 8;
        checkPageBreak(30);
      }

      if (content.campo_aplicacao) {
        doc.setFont(undefined, 'bold');
        doc.text('2. CAMPO DE APLICAÇÃO', 20, yPos);
        yPos += 7;
        doc.setFont(undefined, 'normal');
        const campoLines = doc.splitTextToSize(content.campo_aplicacao, 170);
        doc.text(campoLines, 20, yPos);
        yPos += campoLines.length * 6 + 8;
        checkPageBreak(30);
      }

      if (content.atividades && content.atividades.length > 0) {
        checkPageBreak(40);
        doc.setFont(undefined, 'bold');
        doc.text('3. ATIVIDADES', 20, yPos);
        yPos += 7;

        const atividadesData = content.atividades.map(a => [
          a.atividade || '',
          a.responsavel || '',
          a.frequencia || ''
        ]);

        doc.autoTable({
          startY: yPos,
          head: [['Atividade', 'Responsável', 'Frequência']],
          body: atividadesData,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
          styles: { fontSize: 8, cellPadding: 3 },
          margin: { left: 20, right: 20 }
        });

        yPos = doc.lastAutoTable.finalY + 10;
      }
    });

    // ITs
    areaITs.forEach(it => {
      doc.addPage();
      yPos = 20;

      const headerColor = it.type === 'IT' ? [16, 185, 129] : [249, 115, 22];
      doc.setFillColor(...headerColor);
      doc.rect(15, yPos - 5, 180, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`${it.type} - ${it.type === 'IT' ? 'Instrução de Trabalho' : 'Formulário'}`, 20, yPos + 5);
      doc.setFont(undefined, 'normal');
      yPos += 20;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(it.title, 20, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Código: ${it.code || 'N/A'}`, 20, yPos);
      yPos += 6;
      doc.text(`Versão: ${it.version || '1'}`, 20, yPos);
      yPos += 10;

      const content = it.content || {};

      if (content.objetivo) {
        doc.setFont(undefined, 'bold');
        doc.text('1. OBJETIVO', 20, yPos);
        yPos += 7;
        doc.setFont(undefined, 'normal');
        const objLines = doc.splitTextToSize(content.objetivo, 170);
        doc.text(objLines, 20, yPos);
        yPos += objLines.length * 6 + 8;
        checkPageBreak(30);
      }
    });
  });

  // CARGOS
  if (cargos.length > 0) {
    doc.addPage();
    yPos = 20;
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text('5. Funções e Descrições de Cargo', 20, yPos);
    yPos += 12;

    cargos.forEach(cargo => {
      checkPageBreak(30);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text(cargo.job_title || cargo.title, 20, yPos);
      yPos += 7;
      doc.setFont(undefined, 'normal');

      if (cargo.description) {
        doc.setFontSize(10);
        const descLines = doc.splitTextToSize(cargo.description, 170);
        doc.text(descLines, 25, yPos);
        yPos += descLines.length * 6 + 5;
      }

      yPos += 8;
    });
  }

  // RODAPÉ
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Manual de Processos - ${workshop?.name} | Página ${i} de ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  return doc.output('dataurlstring');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, include_master_processes } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id is required' }, { status: 400 });
    }

    // Buscar workshop
    const workshop = await base44.entities.Workshop.get(workshop_id);

    // Buscar dados do manual
    const allProcessos = await base44.entities.ProcessDocument.list();
    const processos = include_master_processes
      ? allProcessos.filter(p => p.is_template || p.workshop_id === workshop_id)
      : allProcessos.filter(p => p.workshop_id === workshop_id);

    const allITs = await base44.entities.InstructionDocument.list();
    const instructionDocs = include_master_processes
      ? allITs.filter(it => it.is_official || it.workshop_id === workshop_id)
      : allITs.filter(it => it.workshop_id === workshop_id);

    const [cultura, cargos, areas] = await Promise.all([
      base44.entities.MissionVisionValues.filter({ workshop_id }),
      base44.entities.JobDescription.filter({ workshop_id }),
      base44.entities.ProcessArea.list()
    ]);

    const data = {
      cultura: cultura && cultura.length > 0 ? cultura[0] : null,
      processos: processos || [],
      instructionDocs: instructionDocs || [],
      cargos: cargos || [],
      areas: areas || [],
      workshop
    };

    // Calcular hash do conteúdo
    const newHash = await calculateContentHash(data);
    const urlFieldKey = include_master_processes ? 'manual_pdf_url_master' : 'manual_pdf_url_nomaster';

    // Verificar se conteúdo mudou
    if (workshop.manual_pdf_content_hash === newHash && workshop[urlFieldKey]) {
      // Reutilizar URL existente
      return Response.json({
        pdfUrl: workshop[urlFieldKey],
        cached: true
      });
    }

    // Gerar novo PDF
    const pdfDataUrl = await generatePDF(data);

    // Salvar URL no Workshop
    const updateData = {
      [urlFieldKey]: pdfDataUrl,
      manual_pdf_last_generated_at: new Date().toISOString(),
      manual_pdf_content_hash: newHash
    };

    await base44.entities.Workshop.update(workshop_id, updateData);

    return Response.json({
      pdfUrl: pdfDataUrl,
      cached: false
    });
  } catch (error) {
    console.error('Erro ao gerar manual:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
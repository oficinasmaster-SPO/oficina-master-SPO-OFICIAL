import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    console.log('🔵 PDF Generation started');
    
    const { jsPDF } = await import('npm:jspdf@4.0.0');
    console.log('✅ jsPDF imported');
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    console.log('✅ User authenticated:', user?.email);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { workshop_id, include_master_processes } = await req.json();
    console.log('📋 Params:', { workshop_id, include_master_processes });

    if (!workshop_id) {
      return new Response(JSON.stringify({ error: 'workshop_id is required' }), { status: 400 });
    }

    // Buscar workshop
    console.log('🔵 Fetching workshop...');
    const workshop = await base44.entities.Workshop.get(workshop_id);
    if (!workshop) {
      return new Response(JSON.stringify({ error: 'Workshop not found' }), { status: 404 });
    }
    console.log('✅ Workshop found:', workshop.name);

    // Buscar TODOS os dados necessários
    console.log('🔵 Fetching all data...');
    const [
      allProcessos,
      allITs,
      allMVV,
      cargos,
      allAreas,
      allGoals,
      allOrgNodes
    ] = await Promise.all([
      base44.entities.ProcessDocument.list().catch(() => []),
      base44.entities.InstructionDocument.list().catch(() => []),
      base44.entities.MissionVisionValues.filter({ workshop_id }).catch(() => []),
      base44.entities.JobDescription.filter({ workshop_id }).catch(() => []),
      base44.entities.ProcessArea.list().catch(() => []),
      base44.entities.Goal.filter({ workshop_id }).catch(() => []),
      base44.entities.OrgChartNode.filter({ workshop_id }).catch(() => [])
    ]);

    // Filtrar conforme configuração
    const processos = include_master_processes
      ? allProcessos.filter(p => p.is_template || p.workshop_id === workshop_id)
      : allProcessos.filter(p => p.workshop_id === workshop_id);
    
    const instructionDocs = include_master_processes
      ? allITs.filter(it => it.is_official || it.workshop_id === workshop_id)
      : allITs.filter(it => it.workshop_id === workshop_id);

    const cultura = allMVV?.[0] || null;
    const areas = allAreas || [];
    const goals = allGoals || [];
    const orgNodes = allOrgNodes || [];

    console.log('✅ All data loaded');

    // Gerar PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let yPos = 20;
    const maxY = 270;
    const margin = 20;
    const contentWidth = 170;

    const addNewPage = () => {
      doc.addPage();
      yPos = 20;
    };

    const addTitle = (text, level = 1) => {
      if (yPos > maxY - 15) addNewPage();
      const sizes = { 1: 18, 2: 14, 3: 11 };
      doc.setFontSize(sizes[level]);
      doc.setTextColor(level === 1 ? 0 : 50, level === 1 ? 0 : 50, level === 1 ? 0 : 50);
      const splitText = doc.splitTextToSize(text, contentWidth);
      doc.text(splitText, margin, yPos);
      yPos += (splitText.length * 5) + 8;
    };

    const addText = (text, fontSize = 10) => {
      if (yPos > maxY - 5) addNewPage();
      doc.setFontSize(fontSize);
      doc.setTextColor(0, 0, 0);
      const splitText = doc.splitTextToSize(text, contentWidth);
      doc.text(splitText, margin, yPos);
      yPos += (splitText.length * 4) + 3;
    };

    const addSpacer = (height = 5) => {
      yPos += height;
    };

    // ===== CAPA =====
    doc.setFontSize(28);
    doc.setTextColor(0, 51, 102);
    doc.text('Manual de Processos', margin, 60);
    doc.text('e Procedimentos', margin, 85);
    
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100);
    doc.text(workshop.name, margin, 115);
    
    if (workshop.segment || workshop.segment_auto) {
      doc.setFontSize(12);
      doc.text(`Segmento: ${workshop.segment || workshop.segment_auto}`, margin, 128);
    }
    
    if (workshop.city && workshop.state) {
      doc.setFontSize(11);
      doc.setTextColor(120, 120, 120);
      doc.text(`${workshop.city}, ${workshop.state}`, margin, 138);
    }
    
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, margin, 285);
    
    addNewPage();

    // ===== QUEM SOMOS =====
    addTitle('Quem Somos Nós', 1);
    addText(`${workshop.name} é uma empresa atuante no segmento de ${workshop.segment || workshop.segment_auto || 'serviços automotivos'}, localizada em ${workshop.city}, ${workshop.state}.`);
    addSpacer(3);
    if (workshop.telefone) addText(`Telefone: ${workshop.telefone}`);
    if (workshop.email) addText(`Email: ${workshop.email}`);
    if (workshop.cnpj) addText(`CNPJ: ${workshop.cnpj}`);
    if (workshop.endereco_completo) addText(`Endereço: ${workshop.endereco_completo}`);
    addText(`Colaboradores: ${workshop.employees_count || 0} pessoas`);
    if (workshop.years_in_business) {
      addText(`Tempo de Mercado: ${workshop.years_in_business} anos`);
    }

    // ===== MISSÃO, VISÃO E VALORES =====
    if (cultura) {
      addNewPage();
      addTitle('Missão, Visão e Valores', 1);
      
      if (cultura.mission_statement) {
        addTitle('Missão', 2);
        addText(cultura.mission_statement);
        addSpacer(5);
      }
      
      if (cultura.vision_statement) {
        addTitle('Visão', 2);
        addText(cultura.vision_statement);
        addSpacer(5);
      }
      
      if (cultura.core_values && cultura.core_values.length > 0) {
        addTitle('Valores Principais', 2);
        cultura.core_values.forEach(value => {
          addText(`• ${value.name}`);
          if (value.definition) {
            addText(`  ${value.definition}`);
          }
        });
      }
    }

    // ===== ESTRUTURA ORGANIZACIONAL =====
    if (orgNodes.length > 0) {
      addNewPage();
      addTitle('Estrutura Organizacional', 1);
      const rootNodes = orgNodes.filter(n => !n.parent_node_id).sort((a, b) => (a.order || 0) - (b.order || 0));
      
      rootNodes.forEach(node => {
        addText(`• ${node.title} (${node.area || 'Não especificada'})`);
        if (node.description) {
          addText(`  ${node.description}`);
        }
      });
    }

    // ===== ÁREAS DA EMPRESA =====
    if (areas.length > 0) {
      addNewPage();
      addTitle('Áreas da Empresa', 1);
      areas.forEach(area => {
        addText(`• ${area.name || area.title || 'Área'}`);
        if (area.description) {
          addText(`  ${area.description}`);
        }
      });
    }

    // ===== PROCESSOS (MAPs) =====
    if (processos.length > 0) {
      addNewPage();
      addTitle('Processos Principais (MAPs)', 1);
      processos.forEach(proc => {
        const codeAndTitle = `${proc.code ? proc.code + ' - ' : ''}${proc.title || 'Sem título'}`;
        addText(`• ${codeAndTitle}`);
        if (proc.objective) {
          doc.setFontSize(9);
          addText(`  Objetivo: ${proc.objective}`);
        }
      });
    }

    // ===== INSTRUÇÕES TÉCNICAS =====
    if (instructionDocs.length > 0) {
      addNewPage();
      addTitle('Instruções Técnicas (ITs)', 1);
      instructionDocs.forEach(it => {
        addText(`• ${it.title || 'Sem título'}`);
        if (it.description) {
          doc.setFontSize(9);
          addText(`  ${it.description}`);
        }
      });
    }

    // ===== DESCRIÇÕES DE CARGO =====
    if (cargos.length > 0) {
      addNewPage();
      addTitle('Descrições de Cargo', 1);
      cargos.forEach(cargo => {
        addText(`• ${cargo.job_title || cargo.title || 'Cargo sem título'}`);
        if (cargo.department) {
          doc.setFontSize(9);
          addText(`  Departamento: ${cargo.department}`);
        }
      });
    }

    // ===== METAS E INDICADORES =====
    if (goals.length > 0) {
      addNewPage();
      addTitle('Metas e Indicadores', 1);
      goals.forEach(goal => {
        addText(`• ${goal.title || goal.name || 'Meta sem título'}`);
        if (goal.description) {
          doc.setFontSize(9);
          addText(`  ${goal.description}`);
        }
      });
    }

    // ===== REGRAS GERAIS E COMPLIANCE =====
    if (workshop.observacoes_gerais || workshop.quick_tips) {
      addNewPage();
      addTitle('Regras Gerais e Compliance', 1);
      if (workshop.observacoes_gerais) {
        addText(workshop.observacoes_gerais);
      }
      if (workshop.quick_tips) {
        addText(workshop.quick_tips);
      }
    }

    // Footer em última página
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Manual Completo - Gerado automaticamente via Oficinas Master`, margin, maxY + 5);

    // Gerar Base64
    console.log('🔵 Generating PDF...');
    const pdfBase64 = doc.output('datauristring');
    console.log('✅ PDF generated, size:', pdfBase64.length);
    
    return new Response(JSON.stringify({ 
      pdf_data: pdfBase64,
      success: true
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: String(error)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
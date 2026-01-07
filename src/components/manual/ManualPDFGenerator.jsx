import jsPDF from "jspdf";
import "jspdf-autotable";

export default class ManualPDFGenerator {
  static generate(data) {
    const { cultura, processos, instructionDocs, cargos, areas, workshop } = data;
    const doc = new jsPDF();
    let yPos = 20;

    // Função auxiliar para adicionar página
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
    doc.text("Manual de Processos", 105, 100, { align: "center" });
    doc.text("e Procedimentos", 105, 115, { align: "center" });
    
    doc.setFontSize(20);
    doc.text(workshop?.name || "Empresa", 105, 140, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 105, 270, { align: "center" });
    doc.text("Oficinas Master", 105, 280, { align: "center" });

    // NOVA PÁGINA - ÍNDICE
    doc.addPage();
    yPos = 20;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20);
    doc.text("Índice", 20, yPos);
    
    yPos += 15;
    doc.setFontSize(11);
    const indices = [
      "1. Apresentação Institucional",
      "2. Estrutura Organizacional",
      "3. Áreas da Empresa",
      "4. Processos por Área",
      "5. Funções e Descrições de Cargo",
      "6. Indicadores e Metas",
      "7. Regras Gerais e Compliance"
    ];
    
    indices.forEach(item => {
      doc.text(item, 25, yPos);
      yPos += 8;
    });

    // 1. APRESENTAÇÃO INSTITUCIONAL
    doc.addPage();
    yPos = 20;
    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246);
    doc.text("1. Apresentação Institucional", 20, yPos);
    yPos += 12;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    
    if (cultura?.mission_statement) {
      doc.setFont(undefined, 'bold');
      doc.text("Missão", 20, yPos);
      yPos += 7;
      doc.setFont(undefined, 'normal');
      const missionLines = doc.splitTextToSize(cultura.mission_statement, 170);
      doc.text(missionLines, 20, yPos);
      yPos += missionLines.length * 7 + 5;
      checkPageBreak();
    }

    if (cultura?.vision_statement) {
      doc.setFont(undefined, 'bold');
      doc.text("Visão", 20, yPos);
      yPos += 7;
      doc.setFont(undefined, 'normal');
      const visionLines = doc.splitTextToSize(cultura.vision_statement, 170);
      doc.text(visionLines, 20, yPos);
      yPos += visionLines.length * 7 + 5;
      checkPageBreak();
    }

    if (cultura?.core_values && cultura.core_values.length > 0) {
      doc.setFont(undefined, 'bold');
      doc.text("Valores", 20, yPos);
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

    // 2. ESTRUTURA ORGANIZACIONAL
    doc.addPage();
    yPos = 20;
    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129);
    doc.text("2. Estrutura Organizacional", 20, yPos);
    yPos += 12;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total de Colaboradores: ${workshop?.employees_count || 1}`, 20, yPos);
    yPos += 7;
    doc.text(`Áreas Ativas: ${areas.length}`, 20, yPos);
    yPos += 15;

    // 3. ÁREAS DA EMPRESA
    doc.setFontSize(18);
    doc.setTextColor(249, 115, 22);
    doc.text("3. Áreas da Empresa", 20, yPos);
    yPos += 12;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text("Áreas Gerais:", 20, yPos);
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
    doc.text("Áreas Técnicas:", 20, yPos);
    yPos += 7;
    doc.setFont(undefined, 'normal');
    
    areas.filter(a => a.category === 'tecnica').forEach(area => {
      checkPageBreak();
      doc.text(`• ${area.name}`, 25, yPos);
      yPos += 6;
    });

    // 4. PROCESSOS POR ÁREA
    doc.addPage();
    yPos = 20;
    doc.setFontSize(18);
    doc.setTextColor(139, 92, 246);
    doc.text("4. Processos por Área", 20, yPos);
    yPos += 12;

    areas.forEach(area => {
      const areaProcessos = processos.filter(p => p.area_id === area.id);
      const areaITs = instructionDocs.filter(it => it.area_id === area.id);
      
      if (areaProcessos.length === 0 && areaITs.length === 0) return;

      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text(area.name, 20, yPos);
      yPos += 10;
      doc.setFont(undefined, 'normal');

      if (areaProcessos.length > 0) {
        doc.setFontSize(11);
        doc.text("MAPs:", 25, yPos);
        yPos += 7;

        const tableData = areaProcessos.map(p => [
          p.code || '-',
          p.title,
          (p.description || '').substring(0, 50) + '...'
        ]);

        doc.autoTable({
          startY: yPos,
          head: [['Código', 'Título', 'Descrição']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [139, 92, 246] },
          margin: { left: 25 },
          styles: { fontSize: 9 }
        });

        yPos = doc.lastAutoTable.finalY + 10;
      }

      if (areaITs.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(11);
        doc.text("ITs e FRs:", 25, yPos);
        yPos += 7;

        const tableData = areaITs.map(it => [
          it.type,
          it.title,
          (it.description || '').substring(0, 50) + '...'
        ]);

        doc.autoTable({
          startY: yPos,
          head: [['Tipo', 'Título', 'Descrição']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [139, 92, 246] },
          margin: { left: 25 },
          styles: { fontSize: 9 }
        });

        yPos = doc.lastAutoTable.finalY + 10;
      }
    });

    // 5. FUNÇÕES E DESCRIÇÕES DE CARGO
    if (cargos.length > 0) {
      doc.addPage();
      yPos = 20;
      doc.setFontSize(18);
      doc.setTextColor(79, 70, 229);
      doc.text("5. Funções e Descrições de Cargo", 20, yPos);
      yPos += 12;

      cargos.forEach(cargo => {
        checkPageBreak(30);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(cargo.title, 20, yPos);
        yPos += 7;
        doc.setFont(undefined, 'normal');

        if (cargo.description) {
          doc.setFontSize(10);
          const descLines = doc.splitTextToSize(cargo.description, 170);
          doc.text(descLines, 25, yPos);
          yPos += descLines.length * 6 + 5;
        }

        if (cargo.responsibilities && cargo.responsibilities.length > 0) {
          doc.setFont(undefined, 'bold');
          doc.text("Responsabilidades:", 25, yPos);
          yPos += 6;
          doc.setFont(undefined, 'normal');
          
          cargo.responsibilities.forEach(resp => {
            checkPageBreak();
            const respLines = doc.splitTextToSize(`• ${resp}`, 165);
            doc.text(respLines, 30, yPos);
            yPos += respLines.length * 6;
          });
        }

        yPos += 8;
      });
    }

    // RODAPÉ EM TODAS AS PÁGINAS
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Manual de Processos - ${workshop?.name} | Página ${i} de ${pageCount}`,
        105,
        290,
        { align: "center" }
      );
    }

    doc.save(`Manual_Processos_${workshop?.name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  }
}
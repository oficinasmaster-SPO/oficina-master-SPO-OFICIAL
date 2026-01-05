import jsPDF from "jspdf";
import "jspdf-autotable";

const CLASSIFICATION_MAP = {
  A: "Contratar Imediatamente",
  B: "Avaliar Mais",
  C: "Avaliar com Cautela",
  D: "Não Contratar"
};

export default class InterviewPDFGenerator {
  static generate(interview, candidate) {
    const doc = new jsPDF();
    let yPos = 20;

    // Cabeçalho
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Relatório de Entrevista", 105, 15, { align: "center" });
    
    doc.setFontSize(14);
    doc.text(candidate?.full_name || "Candidato", 105, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Data: ${new Date(interview.interview_date).toLocaleDateString('pt-BR')}`, 105, 32, { align: "center" });

    yPos = 50;
    doc.setTextColor(0, 0, 0);

    // Lead Score e Classificação
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(15, yPos, 180, 35, 3, 3, "F");
    
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("Lead Score Final", 20, yPos + 10);
    doc.setFontSize(32);
    doc.setTextColor(59, 130, 246);
    doc.text(`${interview.final_score || 0}`, 20, yPos + 28);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "bold");
    doc.text("Classificação", 120, yPos + 10);
    doc.setFontSize(24);
    doc.text(interview.recommendation || "N/A", 120, yPos + 25);
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(CLASSIFICATION_MAP[interview.recommendation] || "", 120, yPos + 32);

    yPos += 45;

    // Análise por Competência
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text("Análise por Competência", 15, yPos);
    yPos += 10;

    const competenceData = [
      ["Competência", "Pontuação", "Peso"],
      ["Técnico", `${interview.technical_score || 0}/100`, "40%"],
      ["Comportamental", `${interview.behavioral_score || 0}/100`, "30%"],
      ["Cultural", `${interview.cultural_score || 0}/100`, "15%"]
    ];

    doc.autoTable({
      startY: yPos,
      head: [competenceData[0]],
      body: competenceData.slice(1),
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // Avaliação Detalhada
    interview.forms_used?.forEach((form) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text(form.form_name || "Formulário", 15, yPos);
      yPos += 8;

      if (form.answers && form.answers.length > 0) {
        const criteriaData = [["Critério", "Pontuação", "Observação"]];
        
        form.answers.forEach((answer) => {
          const obs = answer.observation 
            ? answer.observation.substring(0, 60) + (answer.observation.length > 60 ? "..." : "")
            : "Sem observações";
          
          criteriaData.push([
            answer.question_text?.substring(0, 40) || "Critério",
            `${answer.score}/${answer.max_points || 10}`,
            obs
          ]);
        });

        doc.autoTable({
          startY: yPos,
          head: [criteriaData[0]],
          body: criteriaData.slice(1),
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 30, halign: "center" },
            2: { cellWidth: 90 }
          }
        });

        yPos = doc.lastAutoTable.finalY + 10;
      }
    });

    // Observações do Entrevistador
    if (interview.interviewer_notes) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text("Observações do Entrevistador", 15, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      const splitNotes = doc.splitTextToSize(interview.interviewer_notes, 180);
      doc.text(splitNotes, 15, yPos);
    }

    // Rodapé
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} - Página ${i} de ${pageCount}`, 105, 290, { align: "center" });
    }

    // Salvar PDF
    const fileName = `Entrevista_${candidate?.full_name?.replace(/\s/g, "_") || "Candidato"}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }
}
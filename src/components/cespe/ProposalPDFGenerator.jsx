import jsPDF from "jspdf";
import "jspdf-autotable";

export default class ProposalPDFGenerator {
  static generate(proposal, candidate, workshop) {
    const doc = new jsPDF();
    let yPos = 20;

    // Cabeçalho Azul Inspirador
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 45, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("PROPOSTA DE TRABALHO", 105, 15, { align: "center" });
    
    doc.setFontSize(16);
    doc.text(workshop?.name || "Nossa Empresa", 105, 25, { align: "center" });
    
    doc.setFontSize(11);
    doc.text(`${workshop?.city || ""}, ${new Date().toLocaleDateString('pt-BR')}`, 105, 35, { align: "center" });

    yPos = 55;
    doc.setTextColor(0, 0, 0);

    // Mensagem de Boas-Vindas Calorosa
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(15, yPos, 180, 45, 3, 3, "F");
    
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.setTextColor(30, 64, 175);
    doc.text("Seja Bem-Vindo(a) ao Nosso Time!", 105, yPos + 10, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.setTextColor(55, 65, 81);
    const welcomeMsg = doc.splitTextToSize(
      `É com grande entusiasmo que apresentamos esta proposta. Identificamos em você um enorme potencial e acreditamos que juntos construiremos uma trajetória de sucesso e crescimento mútuo.`,
      170
    );
    doc.text(welcomeMsg, 105, yPos + 20, { align: "center" });

    yPos += 55;

    // Dados do Candidato
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(15, yPos, 180, 30, 3, 3, "F");
    
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("DADOS DO CANDIDATO", 20, yPos + 8);
    
    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text(`Nome: ${candidate?.full_name || "N/A"}`, 20, yPos + 16);
    doc.text(`Cargo: ${proposal?.position || "N/A"}`, 20, yPos + 23);
    
    // Nível do Cargo (se houver lead_score ou seniority_level do candidato)
    const seniorityLevel = candidate?.interviewer_recommendation || "Aprovado";
    doc.setTextColor(34, 197, 94);
    doc.setFont(undefined, "bold");
    doc.text(`Classificação: ${seniorityLevel}`, 120, yPos + 16);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");

    yPos += 40;

    // Objetivo da Função (com gatilho de propósito)
    if (proposal?.function_objective) {
      doc.setFontSize(13);
      doc.setFont(undefined, "bold");
      doc.text("SEU PROPOSITO E MISSAO", 15, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      const objectiveText = doc.splitTextToSize(proposal.function_objective, 180);
      doc.text(objectiveText, 15, yPos);
      yPos += (objectiveText.length * 5) + 10;
    }

    // Responsabilidades Principais
    if (proposal?.main_responsibilities && proposal.main_responsibilities.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(13);
      doc.setFont(undefined, "bold");
      doc.text("SUAS PRINCIPAIS RESPONSABILIDADES", 15, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      proposal.main_responsibilities.slice(0, 6).forEach((resp, idx) => {
        const respText = doc.splitTextToSize(`- ${resp}`, 175);
        doc.text(respText, 20, yPos);
        yPos += (respText.length * 5) + 3;
      });
      yPos += 5;
    }

    // Remuneração e Benefícios (destaque visual)
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(240, 253, 244);
    doc.roundedRect(15, yPos, 180, 50, 3, 3, "F");
    
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.setTextColor(22, 163, 74);
    doc.text("REMUNERACAO E BENEFICIOS", 20, yPos + 10);
    doc.setTextColor(0, 0, 0);
    
    doc.setFontSize(11);
    doc.text(`Salário Base: R$ ${proposal?.fixed_salary?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}`, 20, yPos + 20);
    
    if (proposal?.variable_bonus > 0) {
      doc.text(`+ Bônus Variável: R$ ${proposal.variable_bonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, yPos + 27);
    }
    
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    doc.text(`Modelo: ${proposal?.contract_type?.toUpperCase() || "CLT"} | ${proposal?.work_model || "Presencial"}`, 20, yPos + 35);
    doc.text(`Carga Horária: ${proposal?.workload || "44h semanais"}`, 20, yPos + 42);

    yPos += 60;

    // Benefícios
    if (proposal?.benefits && proposal.benefits.length > 0) {
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("PACOTE DE BENEFICIOS COMPLETO", 15, yPos);
      yPos += 8;

      const benefitsData = [["Benefício", "Valor Mensal", "Descrição"]];
      
      proposal.benefits.forEach((benefit) => {
        const desc = benefit.description 
          ? benefit.description.substring(0, 50) + (benefit.description.length > 50 ? "..." : "")
          : "-";
        
        benefitsData.push([
          benefit.name || "Benefício",
          benefit.value > 0 ? `R$ ${benefit.value.toFixed(2)}` : "Incluso",
          desc
        ]);
      });

      doc.autoTable({
        startY: yPos,
        head: [benefitsData[0]],
        body: benefitsData.slice(1),
        theme: "striped",
        headStyles: { fillColor: [34, 197, 94], fontSize: 10 },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 35, halign: "center" },
          2: { cellWidth: 85 }
        }
      });

      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Plano de Crescimento (gatilho de futuro)
    if (proposal?.career_path || proposal?.future_positions?.length > 0) {
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFillColor(254, 243, 199);
      doc.roundedRect(15, yPos, 180, 10, 3, 3, "F");
      
      doc.setFontSize(13);
      doc.setFont(undefined, "bold");
      doc.setTextColor(180, 83, 9);
      doc.text("SEU FUTURO AQUI: PLANO DE CRESCIMENTO", 20, yPos + 7);
      doc.setTextColor(0, 0, 0);
      yPos += 15;

      if (proposal.career_path) {
        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        const careerText = doc.splitTextToSize(proposal.career_path, 180);
        doc.text(careerText, 15, yPos);
        yPos += (careerText.length * 5) + 10;
      }

      if (proposal.future_positions && proposal.future_positions.length > 0) {
        doc.setFontSize(10);
        doc.setFont(undefined, "italic");
        doc.text("Possibilidades de Evolução:", 15, yPos);
        yPos += 6;
        
        proposal.future_positions.slice(0, 4).forEach((pos) => {
          doc.text(`> ${pos}`, 20, yPos);
          yPos += 5;
        });
        yPos += 5;
      }
    }

    // Critérios de Sucesso (30/60/90 dias)
    if (proposal?.success_criteria_30d || proposal?.success_criteria_60d) {
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(13);
      doc.setFont(undefined, "bold");
      doc.text("EXPECTATIVAS E METAS DE INTEGRACAO", 15, yPos);
      yPos += 10;

      if (proposal.success_criteria_30d) {
        doc.setFontSize(11);
        doc.setFont(undefined, "bold");
        doc.text("Primeiros 30 dias:", 15, yPos);
        yPos += 6;
        
        doc.setFontSize(9);
        doc.setFont(undefined, "normal");
        const text30d = doc.splitTextToSize(proposal.success_criteria_30d, 180);
        doc.text(text30d, 15, yPos);
        yPos += (text30d.length * 4) + 8;
      }

      if (proposal.success_criteria_60d && yPos < 250) {
        doc.setFontSize(11);
        doc.setFont(undefined, "bold");
        doc.text("60 dias:", 15, yPos);
        yPos += 6;
        
        doc.setFontSize(9);
        doc.setFont(undefined, "normal");
        const text60d = doc.splitTextToSize(proposal.success_criteria_60d, 180);
        doc.text(text60d, 15, yPos);
        yPos += (text60d.length * 4) + 8;
      }
    }

    // Próximos Passos e CTA
    doc.addPage();
    yPos = 20;

    doc.setFillColor(239, 246, 255);
    doc.roundedRect(15, yPos, 180, 60, 3, 3, "F");
    
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.setTextColor(30, 64, 175);
    doc.text("ESTAMOS ANSIOSOS PARA TER VOCE NO TIME!", 105, yPos + 12, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.setTextColor(55, 65, 81);
    const ctaMsg = doc.splitTextToSize(
      `Esta proposta reflete nosso compromisso em construir uma parceria de longo prazo. Acreditamos no seu potencial e estamos prontos para investir no seu desenvolvimento profissional. Seja parte desta jornada de sucesso!`,
      170
    );
    doc.text(ctaMsg, 105, yPos + 25, { align: "center" });

    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(`Validade da Proposta: ${proposal?.proposal_validity || "15 dias"}`, 105, yPos + 50, { align: "center" });

    yPos += 70;

    // Contato do Responsável
    if (proposal?.responsible_contact?.name || proposal?.responsible_contact?.email) {
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("CONTATO PARA DUVIDAS:", 15, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      if (proposal.responsible_contact.name) {
        doc.text(`Nome: ${proposal.responsible_contact.name}`, 15, yPos);
        yPos += 6;
      }
      if (proposal.responsible_contact.email) {
        doc.text(`E-mail: ${proposal.responsible_contact.email}`, 15, yPos);
        yPos += 6;
      }
      if (proposal.responsible_contact.phone) {
        doc.text(`Telefone: ${proposal.responsible_contact.phone}`, 15, yPos);
      }
    }

    // Rodapé em todas as páginas
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Proposta gerada em ${new Date().toLocaleDateString('pt-BR')} - ${workshop?.name || "Empresa"} - Página ${i} de ${pageCount}`,
        105,
        290,
        { align: "center" }
      );
    }

    // Salvar PDF
    const fileName = `Proposta_${candidate?.full_name?.replace(/\s/g, "_") || "Candidato"}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }
}
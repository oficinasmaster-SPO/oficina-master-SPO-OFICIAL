import jsPDF from 'jspdf';

export default class JobDescriptionPDFGenerator {
  generate(jobDescription, workshop) {
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 20;
    const pageWidth = 210;
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);

    // Header
    doc.setFillColor(109, 40, 217);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('DESCRIÇÃO DE CARGO', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(workshop?.name || 'Oficina', pageWidth / 2, 25, { align: 'center' });
    doc.text(`${workshop?.city || ''} - ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 32, { align: 'center' });

    y = 50;

    // Job Title
    doc.setFillColor(243, 232, 255);
    doc.rect(margin, y, maxWidth, 15, 'F');
    doc.setTextColor(74, 29, 150);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(jobDescription.job_title, pageWidth / 2, y + 10, { align: 'center' });
    y += 20;

    doc.setTextColor(0, 0, 0);

    // Helper function to add section
    const addSection = (title, content, isList = false) => {
      if (!content || (Array.isArray(content) && content.length === 0)) return;

      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(109, 40, 217);
      doc.text(title, margin, y);
      y += 7;

      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);

      if (isList && Array.isArray(content)) {
        content.forEach(item => {
          const text = typeof item === 'string' ? item : item.item;
          const lines = doc.splitTextToSize(`• ${text}`, maxWidth - 5);
          
          if (y + (lines.length * 5) > 280) {
            doc.addPage();
            y = 20;
          }
          
          doc.text(lines, margin + 5, y);
          y += lines.length * 5 + 2;
        });
      } else {
        const lines = doc.splitTextToSize(content, maxWidth);
        if (y + (lines.length * 5) > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(lines, margin, y);
        y += lines.length * 5;
      }

      y += 5;
    };

    // Add all sections
    addSection('PRINCIPAIS ATIVIDADES', jobDescription.main_activities, true);
    addSection('RESPONSABILIDADES PRINCIPAIS', jobDescription.main_responsibilities);
    addSection('CO-RESPONSABILIDADES', jobDescription.co_responsibilities);
    addSection('FORMAÇÃO ESCOLAR', jobDescription.education, true);
    addSection('EXPERIÊNCIA PRÉVIA', jobDescription.previous_experience, true);
    addSection('CONHECIMENTOS', jobDescription.knowledge, true);
    addSection('ATRIBUTOS PESSOAIS', jobDescription.personal_attributes, true);
    addSection('CLIENTES', jobDescription.clients, true);
    addSection('MÁQUINAS E EQUIPAMENTOS', jobDescription.equipment_tools, true);
    addSection('INFORMAÇÕES ADMINISTRADAS', jobDescription.managed_information);
    addSection('CONDIÇÕES DE TRABALHO', jobDescription.working_conditions);
    addSection('ESFORÇO FÍSICO', jobDescription.physical_effort);
    addSection('ESFORÇO MENTAL', jobDescription.mental_effort);
    addSection('ESFORÇO VISUAL', jobDescription.visual_effort);
    addSection('RISCOS INERENTES', jobDescription.inherent_risks);
    addSection('TRANSAÇÕES FINANCEIRAS', jobDescription.financial_transactions);
    addSection('SEGURANÇA DE TERCEIROS', jobDescription.third_party_safety);
    addSection('RESPONSABILIDADES DE CONTATO', jobDescription.contact_responsibilities);
    addSection('INDICADORES DE DESEMPENHO', jobDescription.indicators, true);
    addSection('TREINAMENTOS NECESSÁRIOS', jobDescription.trainings, true);

    // Footer on last page
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('Documento interno. Uso exclusivo para gestão de pessoas.', pageWidth / 2, 285, { align: 'center' });

    // Save
    const fileName = `Descricao_Cargo_${jobDescription.job_title.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  }
}
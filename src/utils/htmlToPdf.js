import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Converte um elemento HTML para PDF usando html2canvas
 * @param {HTMLElement} element - Elemento HTML a capturar
 * @param {string} filename - Nome do arquivo PDF (sem extensão)
 * @returns {Promise<void>}
 */
export async function htmlToPdf(element, filename = 'documento') {
  if (!element) {
    throw new Error('Elemento HTML não fornecido');
  }

  try {
    // Capturar elemento como imagem com alta qualidade
    const canvas = await html2canvas(element, {
      scale: 2, // Aumentar escala para melhor qualidade
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowHeight: element.scrollHeight,
      windowWidth: element.scrollWidth,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width em mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Criar PDF com tamanho A4
    const pdf = new jsPDF({
      orientation: imgHeight > imgWidth ? 'portrait' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    let heightLeft = imgHeight;
    let position = 0;

    // Adicionar imagem ao PDF com paginação automática
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= 297; // A4 height em mm

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
    }

    // Download do arquivo
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw new Error(`Falha ao gerar PDF: ${error.message}`);
  }
}
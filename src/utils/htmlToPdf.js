import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Captura um elemento HTML exatamente como aparece na tela e gera PDF A4.
 * @param {HTMLElement} element - Elemento DOM a capturar
 * @param {string} fileName - Nome do arquivo PDF (ex: "MS_CENTRO_AUTOMOTIVO_20042026.pdf")
 * @param {object} options - { scale: 2 (padrão), margin: 10 }
 */
export async function htmlToPdf(element, fileName = 'documento.pdf', options = {}) {
  const { scale = 2, margin = 10 } = options;

  if (!element) throw new Error('Elemento não encontrado');

  // Expandir para captura completa (remove max-height e overflow)
  const original = {
    overflow: element.style.overflow,
    maxHeight: element.style.maxHeight,
    height: element.style.height,
  };
  element.style.overflow = 'visible';
  element.style.maxHeight = 'none';
  element.style.height = 'auto';

  try {
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;

    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const totalPages = Math.ceil(imgHeight / contentHeight);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();
      const yOffset = -(page * contentHeight);
      pdf.addImage(imgData, 'JPEG', margin, margin + yOffset, imgWidth, imgHeight, undefined, 'FAST');
    }

    pdf.save(fileName);
  } finally {
    element.style.overflow = original.overflow;
    element.style.maxHeight = original.maxHeight;
    element.style.height = original.height;
  }
}

/**
 * Gera o nome do arquivo PDF no formato: NOME_OFICINA_DDMMAAAA.pdf
 * Exemplo: "MS_CENTRO_AUTOMOTIVO_20042026.pdf"
 *
 * @param {object} workshop - Objeto do workshop com campo `name`
 * @param {string|Date} data - Data da ATA (meeting_date) ou data atual
 * @returns {string} Nome do arquivo
 */
export function gerarNomePDF(workshop, data) {
  // Normalizar nome da oficina: maiúsculas, sem acentos, espaços viram _
  const nome = (workshop?.name || 'OFICINA')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove acentos
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')      // remove caracteres especiais
    .trim()
    .replace(/\s+/g, '_');            // espaços viram _

  // Formatar data: DDMMAAAA
  const dataObj = data ? new Date(data) : new Date();
  const dia = String(dataObj.getDate()).padStart(2, '0');
  const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
  const ano = dataObj.getFullYear();
  const dataFormatada = `${dia}${mes}${ano}`;

  return `${nome}_${dataFormatada}.pdf`;
}
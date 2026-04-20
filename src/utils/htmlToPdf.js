import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Captura um elemento HTML exatamente como aparece na tela e gera PDF A4.
 * @param {HTMLElement} element - Elemento DOM a capturar
 * @param {string} fileName - Nome do arquivo PDF (ex: "MS_CENTRO_AUTOMOTIVO_20042026.pdf")
 * @param {object} options - { scale: 2 (padrão), margin: 15 }
 */
export async function htmlToPdf(element, fileName = 'documento.pdf', options = {}) {
  const { scale = 2, margin = 15 } = options;

  if (!element) throw new Error('Elemento não encontrado');

  // Guardar estilos originais do elemento e pais
  const originalEl = {
    overflow: element.style.overflow,
    overflowY: element.style.overflowY,
    maxHeight: element.style.maxHeight,
    height: element.style.height,
    width: element.style.width,
  };

  // Expandir elemento para captura completa
  element.style.overflow = 'visible';
  element.style.overflowY = 'visible';
  element.style.maxHeight = 'none';
  element.style.height = 'auto';
  element.style.width = 'auto';

  // Expandir todos os pais até DialogContent
  let parent = element.parentElement;
  const parentStyles = [];
  while (parent && parent.className?.includes('DialogContent') === false) {
    parentStyles.push({
      el: parent,
      overflow: parent.style.overflow,
      overflowY: parent.style.overflowY,
      maxHeight: parent.style.maxHeight,
      height: parent.style.height,
    });
    parent.style.overflow = 'visible';
    parent.style.overflowY = 'visible';
    parent.style.maxHeight = 'none';
    parent.style.height = 'auto';
    parent = parent.parentElement;
  }

  // Aguardar renderização completa
  await new Promise(resolve => setTimeout(resolve, 400));

  try {
    const fullHeight = element.scrollHeight;
    const fullWidth = element.scrollWidth;

    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      width: fullWidth,
      height: fullHeight,
      windowWidth: fullWidth,
      windowHeight: fullHeight,
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
      pdf.addImage(
        imgData, 'JPEG',
        margin, margin + yOffset,
        imgWidth, imgHeight,
        undefined, 'FAST'
      );
    }

    pdf.save(fileName);
  } finally {
    // Restaurar estilos
    element.style.overflow = originalEl.overflow;
    element.style.overflowY = originalEl.overflowY;
    element.style.maxHeight = originalEl.maxHeight;
    element.style.height = originalEl.height;
    element.style.width = originalEl.width;

    parentStyles.forEach(({ el, overflow, overflowY, maxHeight, height }) => {
      el.style.overflow = overflow;
      el.style.overflowY = overflowY;
      el.style.maxHeight = maxHeight;
      el.style.height = height;
    });
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
  // Fallbacks para o nome da oficina
  const nomeRaw = workshop?.name
    || workshop?.razao_social
    || workshop?.nome
    || 'OFICINA';

  const nome = nomeRaw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove acentos
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')       // remove caracteres especiais
    .trim()
    .replace(/\s+/g, '_');             // espaços → underscore

  // Usar UTC para evitar data errada por fuso horário
  const dataObj = data ? new Date(data) : new Date();
  const dia = String(dataObj.getUTCDate()).padStart(2, '0');
  const mes = String(dataObj.getUTCMonth() + 1).padStart(2, '0');
  const ano = dataObj.getUTCFullYear();

  return `${nome}_${dia}${mes}${ano}.pdf`;
}
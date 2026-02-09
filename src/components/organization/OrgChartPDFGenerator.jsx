import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

/**
 * Gera PDF do Organograma em orientação horizontal (Landscape A4)
 * @param {Array} nodes - Array de nós do organograma
 * @param {Object} workshop - Dados da oficina
 * @param {Boolean} download - Se true, faz download; se false, abre em nova aba
 */
export async function generateOrgChartPDF(nodes, workshop, download = true) {
  try {
    // Criar um container temporário para renderizar o organograma
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1400px'; // Largura adequada para landscape
    container.style.background = 'white';
    container.style.padding = '40px';
    document.body.appendChild(container);

    // Renderizar a estrutura do organograma
    const orgChartHTML = renderOrgChartHTML(nodes, workshop);
    container.innerHTML = orgChartHTML;

    // Aguardar um pouco para garantir que tudo foi renderizado
    await new Promise(resolve => setTimeout(resolve, 500));

    // Capturar como imagem usando html2canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    });

    // Remover o container temporário
    document.body.removeChild(container);

    // Criar PDF em orientação horizontal (landscape)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Dimensões da página A4 landscape
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Calcular dimensões da imagem para caber na página com margens
    const margin = 15;
    const availableWidth = pageWidth - (margin * 2);
    const availableHeight = pageHeight - (margin * 2);

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);

    const finalWidth = imgWidth * ratio;
    const finalHeight = imgHeight * ratio;

    // Centralizar a imagem
    const x = (pageWidth - finalWidth) / 2;
    const y = (pageHeight - finalHeight) / 2;

    // Adicionar imagem ao PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

    // Adicionar rodapé
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(
      `${workshop.name} - Organograma | Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );

    // Salvar ou visualizar
    const fileName = `Organograma_${workshop.name}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    if (download) {
      pdf.save(fileName);
    } else {
      // Abrir em nova aba
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
    }

  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    throw error;
  }
}

/**
 * Renderiza HTML do organograma para captura
 */
function renderOrgChartHTML(nodes, workshop) {
  const buildTree = (parentId = null) => {
    return nodes
      .filter(node => node.parent_node_id === parentId && node.is_active)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(node => ({
        ...node,
        children: buildTree(node.node_id)
      }));
  };

  const tree = buildTree();

  const renderNode = (node) => {
    const hasChildren = node.children && node.children.length > 0;
    const childCount = node.children?.length || 0;

    return `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="
          position: relative;
          padding: 12px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          color: white;
          font-weight: bold;
          text-align: center;
          min-width: 180px;
          max-width: 220px;
          background-color: ${node.color || '#EF4444'};
          border: 2px solid white;
        ">
          <div style="font-size: 14px;">${node.title}</div>
          ${node.employee_ids && node.employee_ids.length > 0 ? `
            <div style="
              margin-top: 4px;
              padding: 2px 8px;
              border-radius: 12px;
              background-color: rgba(255,255,255,0.2);
              font-size: 11px;
              display: inline-block;
            ">
              👥 ${node.employee_ids.length}
            </div>
          ` : ''}
        </div>

        ${hasChildren ? `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="width: 2px; height: 32px; background-color: #9CA3AF;"></div>
            
            <div style="display: flex; gap: 24px; position: relative;">
              ${childCount > 1 ? `
                <div style="
                  position: absolute;
                  top: 0;
                  left: 50%;
                  right: 50%;
                  width: calc(100% - 100px);
                  height: 2px;
                  background-color: #9CA3AF;
                  transform: translateX(-50%);
                "></div>
              ` : ''}
              
              ${node.children.map(child => `
                <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
                  <div style="width: 2px; height: 32px; background-color: #9CA3AF;"></div>
                  ${renderNode(child)}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  };

  return `
    <div style="font-family: Arial, sans-serif; background: white; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1F2937; font-size: 24px; margin: 0 0 8px 0;">Organograma</h1>
        <p style="color: #6B7280; font-size: 14px; margin: 0;">${workshop.name}</p>
      </div>
      
      <div style="display: flex; justify-content: center; overflow-x: auto; padding: 20px;">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 32px;">
          ${tree.map(rootNode => renderNode(rootNode)).join('')}
        </div>
      </div>
    </div>
  `;
}
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Gera PDF do organograma funcional (com pessoas)
 */
export const generateFunctionalOrgChartPDF = async (structuralNodes, employees, workshop, download = false) => {
  try {
    // Cria elemento temporário para renderizar o organograma
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.backgroundColor = 'white';
    container.style.padding = '40px';
    container.style.width = '1400px';
    
    document.body.appendChild(container);

    // Renderiza o HTML do organograma
    container.innerHTML = renderFunctionalOrgChartHTML(structuralNodes, employees, workshop);

    // Aguarda um pouco para garantir que o CSS foi aplicado
    await new Promise(resolve => setTimeout(resolve, 500));

    // Captura como imagem
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    });

    // Remove o elemento temporário
    document.body.removeChild(container);

    // Cria o PDF em paisagem (landscape)
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Calcula dimensões mantendo aspect ratio
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(
      (pageWidth - 20) / imgWidth,
      (pageHeight - 40) / imgHeight
    );

    const scaledWidth = imgWidth * ratio;
    const scaledHeight = imgHeight * ratio;

    // Centraliza a imagem
    const x = (pageWidth - scaledWidth) / 2;
    const y = 15;

    // Adiciona a imagem ao PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);

    // Adiciona rodapé
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(
      `${workshop.name} - Organograma Funcional | Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );

    if (download) {
      pdf.save(`${workshop.name}_Organograma_Funcional.pdf`);
    } else {
      window.open(pdf.output('bloburl'), '_blank');
    }
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    alert('Erro ao gerar PDF do organograma');
  }
};

/**
 * Renderiza o HTML do organograma funcional
 */
const renderFunctionalOrgChartHTML = (structuralNodes, employees, workshop) => {
  const mapEmployeesToNodes = (nodes) => {
    return nodes.map(node => {
      const assignedEmployees = employees.filter(emp => 
        node.employee_ids?.includes(emp.id)
      );
      
      return {
        ...node,
        assignedEmployees
      };
    });
  };

  const nodesWithEmployees = mapEmployeesToNodes(structuralNodes);

  const buildTree = (parentId = null) => {
    return nodesWithEmployees
      .filter(node => node.parent_node_id === parentId && node.is_active)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(node => ({
        ...node,
        children: buildTree(node.node_id)
      }));
  };

  const tree = buildTree();

  const renderEmployeeHTML = (employee, nodeColor) => {
    const photoUrl = employee.profile_picture_url || '';
    return `
      <div style="display: flex; flex-direction: column; align-items: center; margin: 0 20px;">
        ${photoUrl ? 
          `<img src="${photoUrl}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />` :
          `<div style="width: 100px; height: 100px; border-radius: 50%; background: #e5e7eb; border: 4px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center;">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>`
        }
        <div style="margin-top: 10px; position: relative;">
          <div style="background: ${nodeColor || '#374151'}; padding: 8px 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); color: white; font-weight: bold; text-align: center; min-width: 180px; position: relative;">
            <div style="font-size: 13px;">${employee.full_name}</div>
            <div style="position: absolute; bottom: 0; right: 0; width: 50px; height: 3px; background: #60a5fa;"></div>
          </div>
          <div style="text-align: center; margin-top: 5px;">
            <span style="font-size: 10px; color: #6b7280; background: #f3f4f6; padding: 3px 10px; border-radius: 12px;">
              ${employee.position}
            </span>
          </div>
        </div>
      </div>
    `;
  };

  const renderNodeHTML = (node) => {
    const hasChildren = node.children && node.children.length > 0;
    const hasEmployees = node.assignedEmployees && node.assignedEmployees.length > 0;
    const childCount = node.children?.length || 0;

    let html = '<div style="display: flex; flex-direction: column; align-items: center;">';

    // Renderiza colaboradores ou vaga em aberto
    if (hasEmployees) {
      html += '<div style="display: flex; gap: 30px; flex-wrap: wrap; justify-content: center; margin-bottom: 20px;">';
      node.assignedEmployees.forEach(emp => {
        html += renderEmployeeHTML(emp, node.color);
      });
      html += '</div>';
    } else {
      html += `
        <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 20px;">
          <div style="width: 100px; height: 100px; border-radius: 50%; background: #f3f4f6; border: 4px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center;">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div style="margin-top: 10px;">
            <div style="background: ${node.color || '#374151'}; padding: 8px 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); color: white; font-weight: bold; text-align: center; min-width: 180px;">
              <div style="font-size: 13px;">${node.title}</div>
            </div>
            <div style="text-align: center; margin-top: 5px;">
              <span style="font-size: 10px; color: #9ca3af; background: #fafafa; padding: 3px 10px; border-radius: 12px;">
                Vaga em aberto
              </span>
            </div>
          </div>
        </div>
      `;
    }

    // Renderiza filhos
    if (hasChildren) {
      html += '<div style="display: flex; flex-direction: column; align-items: center;">';
      html += '<div style="width: 2px; height: 40px; background: #d1d5db;"></div>';
      html += '<div style="display: flex; gap: 40px; position: relative;">';
      
      if (childCount > 1) {
        html += `<div style="position: absolute; height: 2px; background: #d1d5db; top: 0; left: 50%; right: 50%; width: calc(100% - 100px); transform: translateX(-50%);"></div>`;
      }
      
      node.children.forEach(child => {
        html += '<div style="position: relative; display: flex; flex-direction: column; align-items: center;">';
        html += '<div style="width: 2px; height: 40px; background: #d1d5db;"></div>';
        html += renderNodeHTML(child);
        html += '</div>';
      });
      
      html += '</div>';
      html += '</div>';
    }

    html += '</div>';
    return html;
  };

  let finalHTML = `
    <div style="font-family: Arial, sans-serif; background: linear-gradient(to bottom right, #f9fafb, #eff6ff); padding: 30px;">
      <h1 style="text-align: center; color: #1f2937; font-size: 24px; margin-bottom: 10px;">
        ${workshop.name}
      </h1>
      <p style="text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 30px;">
        Organograma Funcional e Operacional
      </p>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 30px;">
  `;

  tree.forEach(rootNode => {
    finalHTML += renderNodeHTML(rootNode);
  });

  finalHTML += `
      </div>
    </div>
  `;

  return finalHTML;
};
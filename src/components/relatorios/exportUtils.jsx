import jsPDF from "jspdf";

export const exportToPDF = async (reportType, data) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text(data.title, pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(data.workshop, pageWidth / 2, 30, { align: 'center' });
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 38, { align: 'center' });
  
  // Content based on report type
  let yPos = 50;
  
  if (reportType === 'diagnostic-evolution') {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Evolução de Diagnósticos', 14, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    data.data.forEach(item => {
      doc.text(`${item.month}: Fase1=${item.fase1}, Fase2=${item.fase2}, Fase3=${item.fase3}, Fase4=${item.fase4}`, 14, yPos);
      yPos += 7;
      
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
    });
  } else if (reportType === 'financial-performance') {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Performance Financeira', 14, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    data.data.revenueData.forEach(item => {
      doc.text(
        `${item.month}: Projetado=R$ ${item.projetado.toFixed(2)}, Realizado=R$ ${item.realizado.toFixed(2)}`,
        14,
        yPos
      );
      yPos += 7;
      
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
    });
  }
  
  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, 287, { align: 'center' });
  }
  
  doc.save(`${reportType}-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    throw new Error('Nenhum dado para exportar');
  }
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      return typeof value === 'string' && value.includes(',') 
        ? `"${value}"` 
        : value;
    }).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};
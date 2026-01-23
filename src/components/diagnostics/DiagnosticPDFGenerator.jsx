import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "jspdf-autotable";

export default function DiagnosticPDFGenerator({ diagnostic, workshop, phaseDistribution, dominantPhase, owner, executiveSummary, actionPlan }) {
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdfBlob, setPdfBlob] = useState(null);

  const captureElement = async (elementId, pdf, yPos, pageWidth, pageHeight, margin) => {
    const element = document.getElementById(elementId);
    if (!element) return yPos;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Verificar se precisa de nova página
      if (yPos + imgHeight > pageHeight - margin) {
        pdf.addPage();
        yPos = margin;
      }

      pdf.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight);
      return yPos + imgHeight + 10;
    } catch (error) {
      console.error(`Erro ao capturar ${elementId}:`, error);
      return yPos;
    }
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // ===== CABEÇALHO =====
      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, 0, pageWidth, 35, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text('OFICINAS MASTER', margin, 12);
      
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'normal');
      pdf.text('Educação Empresarial', margin, 20);
      
      pdf.setFontSize(9);
      pdf.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, 12, { align: 'right' });

      yPos = 42;

      // ===== DADOS DA OFICINA =====
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('DADOS DA OFICINA', margin, yPos);
      yPos += 7;

      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Oficina: ${workshop?.name || 'Não informado'}`, margin, yPos);
      yPos += 5;
      pdf.text(`CNPJ: ${workshop?.cnpj || 'Não informado'}`, margin, yPos);
      yPos += 5;
      pdf.text(`Endereço: ${workshop?.endereco_completo || `${workshop?.city || ''}, ${workshop?.state || ''}`}`, margin, yPos);
      yPos += 5;
      pdf.text(`Responsável: ${owner?.full_name || owner?.email || 'Não informado'}`, margin, yPos);
      yPos += 8;

      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // ===== 1. CAPTURAR CARD DA FASE DOMINANTE =====
      yPos = await captureElement('dominant-phase-card', pdf, yPos, pageWidth, pageHeight, margin);

      // ===== 2. CAPTURAR RESUMO EXECUTIVO =====
      yPos = await captureElement('executive-summary-section', pdf, yPos, pageWidth, pageHeight, margin);

      // ===== 3. CAPTURAR PLANO DE AÇÃO =====
      yPos = await captureElement('action-plan-section', pdf, yPos, pageWidth, pageHeight, margin);

      // ===== 4. CAPTURAR GRID DAS 4 FASES =====
      yPos = await captureElement('phases-grid', pdf, yPos, pageWidth, pageHeight, margin);

      // ===== 5. CAPTURAR GRÁFICOS =====
      yPos = await captureElement('charts-for-pdf', pdf, yPos, pageWidth, pageHeight, margin);

      // ===== 6. CAPTURAR "O QUE ISSO SIGNIFICA" =====
      yPos = await captureElement('insights-section', pdf, yPos, pageWidth, pageHeight, margin);

      // ===== RODAPÉ EM TODAS AS PÁGINAS =====
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text('Oficinas Master - Diagnóstico de Fase', margin, pageHeight - 10);
      }

      const blob = pdf.output('blob');
      setPdfBlob(blob);
      setShowPreview(true);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagnostico-fase-${workshop?.name || 'oficina'}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF baixado!");
    }
  };

  return (
    <>
      <Button
        onClick={generatePDF}
        disabled={generating}
        className="flex-1 py-6 bg-green-600 hover:bg-green-700"
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Gerando PDF...
          </>
        ) : (
          <>
            <FileText className="w-5 h-5 mr-2" />
            Gerar PDF
          </>
        )}
      </Button>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Visualizar PDF - Diagnóstico de Fase</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {pdfBlob && (
              <iframe
                src={URL.createObjectURL(pdfBlob)}
                className="w-full h-[600px] border rounded"
                title="Preview PDF"
              />
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowPreview(false)} className="flex-1">
              Fechar
            </Button>
            <Button onClick={handleDownload} className="flex-1 bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}